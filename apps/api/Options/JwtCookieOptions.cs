namespace VeTool.Api.Options;

public sealed class JwtCookieOptions
{
    public string CookieName { get; set; } = "vetool_jwt";
    public string? Domain { get; set; }
} 