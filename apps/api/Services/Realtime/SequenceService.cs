using StackExchange.Redis;

namespace VeTool.Api.Services.Realtime;

public interface ISequenceGenerator
{
    Task<long> NextLobbySequenceAsync(Guid lobbyId, CancellationToken ct = default);
    Task<long> NextMatchSequenceAsync(Guid matchId, CancellationToken ct = default);
}

public sealed class RedisSequenceGenerator : ISequenceGenerator
{
    private readonly IConnectionMultiplexer _mux;
    public RedisSequenceGenerator(IConnectionMultiplexer mux) { _mux = mux; }

    public async Task<long> NextLobbySequenceAsync(Guid lobbyId, CancellationToken ct = default)
    {
        var db = _mux.GetDatabase();
        return await db.StringIncrementAsync($"seq:lobby:{lobbyId}");
    }

    public async Task<long> NextMatchSequenceAsync(Guid matchId, CancellationToken ct = default)
    {
        var db = _mux.GetDatabase();
        return await db.StringIncrementAsync($"seq:match:{matchId}");
    }
}

public interface IIdempotencyService
{
    Task<bool> TryBeginAsync(string scope, string clientRequestId, TimeSpan ttl, CancellationToken ct = default);
}

public sealed class RedisIdempotencyService : IIdempotencyService
{
    private readonly IConnectionMultiplexer _mux;
    public RedisIdempotencyService(IConnectionMultiplexer mux) { _mux = mux; }

    public async Task<bool> TryBeginAsync(string scope, string clientRequestId, TimeSpan ttl, CancellationToken ct = default)
    {
        var db = _mux.GetDatabase();
        return await db.StringSetAsync($"idem:{scope}:{clientRequestId}", "1", ttl, When.NotExists);
    }
} 