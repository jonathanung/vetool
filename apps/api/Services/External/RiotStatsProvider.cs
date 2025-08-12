using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.External;

public interface IRiotStatsProvider
{
    Task<UserStats> GetOrFetchAsync(Guid userId, string riotName, string riotTag, Game game, CancellationToken ct = default);
}

public sealed class RiotStatsProvider : IRiotStatsProvider
{
    private readonly AppDbContext _db;
    private readonly IConnectionMultiplexer _mux;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);

    public RiotStatsProvider(AppDbContext db, IConnectionMultiplexer mux)
    {
        _db = db;
        _mux = mux;
    }

    public async Task<UserStats> GetOrFetchAsync(Guid userId, string riotName, string riotTag, Game game, CancellationToken ct = default)
    {
        var dbStats = await _db.UserStats.FirstOrDefaultAsync(s => s.UserId == userId && s.Game == game, ct);
        if (dbStats is not null) return dbStats;

        // ToS note: Official Riot APIs and community endpoints have ToS restrictions.
        // This stub does not call any API; it inserts a placeholder payload and timestamp.
        var stats = new UserStats
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Game = game,
            Payload = System.Text.Json.JsonDocument.Parse("{\"note\":\"stubbed\"}"),
            LastSyncedAt = DateTime.UtcNow
        };
        _db.UserStats.Add(stats);
        await _db.SaveChangesAsync(ct);

        var dbRedis = _mux.GetDatabase();
        await dbRedis.StringSetAsync($"riot:stats:{userId}:{game}", "stubbed", CacheTtl);

        return stats;
    }
} 