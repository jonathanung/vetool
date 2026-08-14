using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.Catalog;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.External;

public interface IValPoolProvider
{
    Task<IReadOnlyList<string>> GetCompetitiveAsync(CancellationToken ct = default);
    Task UpsertCompetitiveAsync(AppDbContext db, CancellationToken ct = default);
}

public sealed class ValPoolProvider : IValPoolProvider
{
    private readonly IHttpClientFactory _http;
    private readonly string? _url;
    private readonly string? _envList;

    public ValPoolProvider(IHttpClientFactory http)
    {
        _http = http;
        _url = Environment.GetEnvironmentVariable("VAL_POOL_URL");
        _envList = Environment.GetEnvironmentVariable("VAL_COMP_POOL");
    }

    public async Task<IReadOnlyList<string>> GetCompetitiveAsync(CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(_url))
        {
            try
            {
                var client = _http.CreateClient();
                var response = await client.GetFromJsonAsync<List<string>>(_url, ct);
                if (response is { Count: > 0 }) return response;
            }
            catch { }
        }
        if (!string.IsNullOrWhiteSpace(_envList))
        {
            return _envList.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.ToLowerInvariant()).ToList();
        }
        return CompetitiveMaps.Val.Select(m => m.Code).ToList();
    }

    public async Task UpsertCompetitiveAsync(AppDbContext db, CancellationToken ct = default)
    {
        var names = await GetCompetitiveAsync(ct);
        var pool = new MapPool
        {
            Id = Guid.NewGuid(),
            Game = Game.Val,
            Label = "Competitive",
            Source = MapPoolSource.Api,
            EffectiveAt = DateTime.UtcNow
        };
        db.MapPools.Add(pool);
        var existing = await db.Maps.Where(m => m.Game == Game.Val).ToListAsync(ct);
        var mapByCode = existing.ToDictionary(m => m.Code, StringComparer.OrdinalIgnoreCase);
        var order = 0;
        foreach (var code in names)
        {
            if (!mapByCode.TryGetValue(code, out var map))
            {
                map = new GameMap
                {
                    Id = Guid.NewGuid(),
                    Game = Game.Val,
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
