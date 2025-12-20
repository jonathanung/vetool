using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using StackExchange.Redis;
using VeTool.Api.Options;
using VeTool.Api.Seeds;
using VeTool.Api.Services.External;
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

var jwtCookieName = Environment.GetEnvironmentVariable("JWT_COOKIE_NAME") ?? "vetool_jwt";
var jwtCookieDomain = Environment.GetEnvironmentVariable("JWT_COOKIE_DOMAIN");
services.Configure<JwtCookieOptions>(options => { options.CookieName = jwtCookieName; options.Domain = jwtCookieDomain; });

var authRequireConfirm = (Environment.GetEnvironmentVariable("AUTH_REQUIRE_EMAIL_CONFIRMATION") ?? "false").Equals("true", StringComparison.OrdinalIgnoreCase);
services.Configure<AuthOptions>(o => o.RequireEmailConfirmation = authRequireConfirm);

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

// HTTP clients for external providers
services.AddHttpClient();

// JWT (RS256) in httpOnly cookie
var rsa = RSA.Create();
var signingKey = new RsaSecurityKey(rsa) { KeyId = Guid.NewGuid().ToString("N") };
services.AddSingleton(signingKey);
services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
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

// external providers
services.AddSingleton<ICs2PoolProvider, Cs2PoolProvider>();
services.AddSingleton<IValPoolProvider, ValPoolProvider>();
services.AddScoped<IRiotStatsProvider, RiotStatsProvider>();
services.AddSingleton<ISteamAvatarService, SteamAvatarService>();

services.AddCors(options =>
{
    options.AddPolicy("default", p => p
        .WithOrigins(
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
        .SetIsOriginAllowedToAllowWildcardSubdomains());
});

services.AddControllers().AddNewtonsoftJson();

var app = builder.Build();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Trust X-Forwarded-* headers when behind proxy (needed for correct HTTPS detection)
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor
});

app.UseCors("default");
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();
app.MapGet("/api/v1/health", () => Results.Ok(new { status = "ok" }));

app.MapHub<VeTool.Api.Realtime.LobbyHub>("/hubs/lobby");
app.MapHub<VeTool.Api.Realtime.VetoHub>("/hubs/veto");

// Skip database seeding in Testing environment
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    await VeTool.Api.Seeds.SeedData.EnsureSeedAsync(db, userManager);
}

app.Run();

public partial class Program { }
