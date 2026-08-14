using System.Security.Claims;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using StackExchange.Redis;
using VeTool.Api.Options;
using VeTool.Api.Services.Auth;
using VeTool.Api.Services.External;
using VeTool.Api.Services.Matchmaking;
using VeTool.Api.Services.Realtime;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateLogger();
builder.Host.UseSerilog();

try { Env.Load(); } catch { }

var configuration = builder.Configuration;
var services = builder.Services;
var isTesting = builder.Environment.IsEnvironment("Testing");

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
services.AddHttpClient();

var signing = JwtSigning.Create(configuration);
services.AddSingleton(signing);
services.AddSingleton<IJwtTokenService, JwtTokenService>();

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
            IssuerSigningKey = signing.Key,
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
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
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

if (!isTesting)
{
    services.AddHealthChecks().AddNpgSql(connectionString);
    services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConn));
    services.AddSignalR().AddStackExchangeRedis(redisConn);
    services.AddSingleton<ISequenceGenerator, RedisSequenceGenerator>();
    services.AddSingleton<IIdempotencyService, RedisIdempotencyService>();
}
else
{
    services.AddHealthChecks();
    services.AddSignalR();
    services.AddSingleton<ISequenceGenerator, InMemorySequenceGenerator>();
    services.AddSingleton<IIdempotencyService, InMemoryIdempotencyService>();
}

services.AddSingleton<ICaptainPicker, CaptainPicker>();
services.AddScoped<LobbyMembershipService>();
services.AddScoped<VetoSessionService>();
services.AddScoped<MatchLifecycleService>();

services.AddSingleton<ICs2PoolProvider, Cs2PoolProvider>();
services.AddSingleton<IValPoolProvider, ValPoolProvider>();
services.AddScoped<IRiotStatsProvider, RiotStatsProvider>();
services.AddSingleton<ISteamAvatarService, SteamAvatarService>();

var defaultOrigins = new[]
{
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
};
var extraOrigins = (Environment.GetEnvironmentVariable("CORS_ORIGINS")
    ?? Environment.GetEnvironmentVariable("PUBLIC_WEB_ORIGIN")
    ?? configuration["Cors:Origins"]
    ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
var origins = defaultOrigins.Concat(extraOrigins).Where(o => Uri.TryCreate(o, UriKind.Absolute, out _)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

services.AddCors(options =>
{
    options.AddPolicy("default", p => p
        .SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            if (origins.Contains(origin, StringComparer.OrdinalIgnoreCase)) return true;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
            return uri.Port is 3000 or 3001 or 80 or 443;
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

services.AddControllers().AddNewtonsoftJson(options =>
{
    options.SerializerSettings.ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver();
});

var app = builder.Build();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

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

if (!isTesting)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    await VeTool.Api.Seeds.SeedData.EnsureSeedAsync(db, userManager);
}

app.Run();

public partial class Program { }
