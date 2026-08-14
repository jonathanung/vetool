using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.Catalog;
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
        return CompetitiveMaps.Cs2.Select(m => m.Code).ToList();
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
        var existingMaps = await db.Maps.Where(m => m.Game == Game.Cs2).ToListAsync(ct);
        var codeToMap = existingMaps.ToDictionary(m => m.Code, StringComparer.OrdinalIgnoreCase);
        var order = 0;
        foreach (var code in codes)
        {
            if (!codeToMap.TryGetValue(code, out var map))
            {
                map = new GameMap
                {
                    Id = Guid.NewGuid(),
                    Game = Game.Cs2,
                    Code = code,
                    Name = CompetitiveMaps.Title(code),
                    IsActive = true
                };
                db.Maps.Add(map);
            }
            else if (map.Name == map.Code.ToUpperInvariant())
            {
                map.Name = CompetitiveMaps.Title(code);
            }
            db.MapPoolMaps.Add(new MapPoolMap { Id = Guid.NewGuid(), MapPoolId = pool.Id, GameMapId = map.Id, OrderIndex = order++ });
        }
        await db.SaveChangesAsync(ct);
    }
}
