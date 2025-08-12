using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
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
        return new[] { "ascent", "bind", "haven", "sunset", "lotus", "icebox" };
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
        var existing = await db.Maps.Where(m => m.Game == Game.Val && names.Contains(m.Code)).ToListAsync(ct);
        var mapByCode = existing.ToDictionary(m => m.Code, m => m);
        foreach (var code in names)
        {
            if (!mapByCode.TryGetValue(code, out var map))
            {
                map = new GameMap { Id = Guid.NewGuid(), Game = Game.Val, Code = code, Name = code.ToUpperInvariant(), IsActive = true };
                db.Maps.Add(map);
            }
            db.MapPoolMaps.Add(new MapPoolMap { Id = Guid.NewGuid(), MapPoolId = pool.Id, GameMapId = map.Id, OrderIndex = db.MapPoolMaps.Count(m => m.MapPoolId == pool.Id) });
        }
        await db.SaveChangesAsync(ct);
    }
} 