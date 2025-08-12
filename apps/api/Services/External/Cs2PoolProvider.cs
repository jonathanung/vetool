using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.External;

public interface ICs2PoolProvider
{
    Task<IReadOnlyList<string>> GetActiveDutyAsync(CancellationToken ct = default);
    Task UpsertActivePoolAsync(AppDbContext db, CancellationToken ct = default);
}

public sealed class Cs2PoolProvider : ICs2PoolProvider
{
    private readonly IHttpClientFactory _http;
    private readonly string? _url;
    private readonly string? _envList;

    public Cs2PoolProvider(IHttpClientFactory http)
    {
        _http = http;
        _url = Environment.GetEnvironmentVariable("CS2_POOL_URL");
        _envList = Environment.GetEnvironmentVariable("CS2_ACTIVE_DUTY");
    }

    public async Task<IReadOnlyList<string>> GetActiveDutyAsync(CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(_url))
        {
            try
            {
                var client = _http.CreateClient();
                var response = await client.GetFromJsonAsync<List<string>>(_url, ct);
                if (response is { Count: > 0 }) return response;
            }
            catch { /* ignore and fallback */ }
        }
        if (!string.IsNullOrWhiteSpace(_envList))
        {
            return _envList.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.ToLowerInvariant()).ToList();
        }
        // reasonable default
        return new[] { "mirage", "ancient", "anubis", "nuke", "inferno", "vertigo" };
    }

    public async Task UpsertActivePoolAsync(AppDbContext db, CancellationToken ct = default)
    {
        var codes = await GetActiveDutyAsync(ct);
        var pool = new MapPool
        {
            Id = Guid.NewGuid(),
            Game = Game.Cs2,
            Label = "Active Duty",
            Source = MapPoolSource.Api,
            EffectiveAt = DateTime.UtcNow
        };
        db.MapPools.Add(pool);
        var existingMaps = await db.Maps.Where(m => m.Game == Game.Cs2 && codes.Contains(m.Code)).ToListAsync(ct);
        var codeToMap = existingMaps.ToDictionary(m => m.Code, m => m);
        foreach (var code in codes)
        {
            if (!codeToMap.TryGetValue(code, out var map))
            {
                map = new GameMap { Id = Guid.NewGuid(), Game = Game.Cs2, Code = code, Name = code.ToUpperInvariant(), IsActive = true };
                db.Maps.Add(map);
            }
            db.MapPoolMaps.Add(new MapPoolMap { Id = Guid.NewGuid(), MapPoolId = pool.Id, GameMapId = map.Id, OrderIndex = db.MapPoolMaps.Count(m => m.MapPoolId == pool.Id) });
        }
        await db.SaveChangesAsync(ct);
    }
} 