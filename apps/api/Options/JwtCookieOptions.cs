namespace VeTool.Api.Options;

public sealed class JwtCookieOptions
{
    public string CookieName { get; init; } = Environment.GetEnvironmentVariable("JWT_COOKIE_NAME") ?? "cookie_jwt";
} 