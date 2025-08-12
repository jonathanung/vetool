using StackExchange.Redis;

namespace VeTool.Api.Services.External;

public interface ISteamAvatarService
{
    Task<string?> GetAvatarUrlAsync(string steam64Id, CancellationToken ct = default);
}

public sealed class SteamAvatarService : ISteamAvatarService
{
    private readonly IConnectionMultiplexer _mux;
    private readonly string? _apiKey;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(6);

    public SteamAvatarService(IConnectionMultiplexer mux)
    {
        _mux = mux;
        _apiKey = Environment.GetEnvironmentVariable("STEAM_WEB_API_KEY");
    }

    public async Task<string?> GetAvatarUrlAsync(string steam64Id, CancellationToken ct = default)
    {
        var db = _mux.GetDatabase();
        var cacheKey = $"steam:avatar:{steam64Id}";
        var cached = await db.StringGetAsync(cacheKey);
        if (cached.HasValue) return cached.ToString();

        // Without API key, fallback to public profile image pattern or null
        string? url = null;
        if (!string.IsNullOrWhiteSpace(_apiKey))
        {
            try
            {
                using var http = new HttpClient();
                var resp = await http.GetAsync($"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key={_apiKey}&steamids={steam64Id}", ct);
                resp.EnsureSuccessStatusCode();
                var json = await resp.Content.ReadAsStringAsync(ct);
                // naive parse to avoid dependency: look for avatarfull
                var marker = "\"avatarfull\":\"";
                var idx = json.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
                if (idx >= 0)
                {
                    var start = idx + marker.Length;
                    var end = json.IndexOf('"', start);
                    if (end > start) url = json[start..end];
                }
            }
            catch { }
        }

        if (url is null)
        {
            // Best effort: Steam public CDN may require profile lookup; leave null
            url = null;
        }

        if (url is not null)
            await db.StringSetAsync(cacheKey, url, CacheTtl);

        return url;
    }
} 