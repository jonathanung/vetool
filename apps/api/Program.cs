using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using StackExchange.Redis;
using VeTool.Api.Seeds;
using VeTool.Api.Services.Realtime;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateLogger();
builder.Host.UseSerilog();

// Load .env if present
try { Env.Load(); } catch { }

var configuration = builder.Configuration;
var services = builder.Services;

string BuildPgConnectionFromPieces()
{
    var host = Environment.GetEnvironmentVariable("POSTGRES_HOST");
    var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
    var db = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "db";
    var user = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "postgres";
    var pw = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "postgres";
    return host is null ? string.Empty : $"Host={host};Port={port};Database={db};Username={user};Password={pw}";
}

var connectionString = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION");
if (string.IsNullOrWhiteSpace(connectionString))
{
    var fromPieces = BuildPgConnectionFromPieces();
    connectionString = !string.IsNullOrWhiteSpace(fromPieces)
        ? fromPieces
        : configuration.GetConnectionString("Default")
          ?? "Host=localhost;Database=db;Username=postgres;Password=postgres";
}

var redisConn = Environment.GetEnvironmentVariable("REDIS_CONNECTION")
    ?? configuration.GetConnectionString("Redis")
    ?? "localhost:6379";

var jwtCookieName = Environment.GetEnvironmentVariable("JWT_COOKIE_NAME") ?? "cookie_jwt";

services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString, npg => npg.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
});

services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
{
    options.User.RequireUniqueEmail = true;
    options.Password.RequiredLength = 8;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

services.AddDataProtection();

// JWT (RS256) in httpOnly cookie
var rsa = RSA.Create(2048);
var signingKey = new RsaSecurityKey(rsa) { KeyId = Guid.NewGuid().ToString("N") };
services.AddSingleton(signingKey);
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var token = context.Request.Cookies[jwtCookieName];
                if (!string.IsNullOrEmpty(token))
                {
                    context.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    });

services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", p => p.RequireClaim(ClaimTypes.Role, "Admin"));
});

services.AddEndpointsApiExplorer();
services.AddSwaggerGen();

services.AddHealthChecks().AddNpgSql(connectionString);

services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConn));
services.AddSignalR().AddStackExchangeRedis(redisConn);

// realtime services
services.AddSingleton<ISequenceGenerator, RedisSequenceGenerator>();
services.AddSingleton<IIdempotencyService, RedisIdempotencyService>();
services.AddSingleton<ICaptainPicker, CaptainPicker>();

services.AddCors(options =>
{
    options.AddPolicy("default", p => p
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
        .SetIsOriginAllowed(_ => true));
});

services.AddControllers().AddNewtonsoftJson();

var app = builder.Build();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("default");
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();
app.MapGet("/api/v1/health", () => Results.Ok(new { status = "ok" }));

app.MapHub<VeTool.Api.Realtime.LobbyHub>("/hubs/lobby");
app.MapHub<VeTool.Api.Realtime.VetoHub>("/hubs/veto");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await SeedData.EnsureSeedAsync(db);
}

app.Run();

public partial class Program { }
