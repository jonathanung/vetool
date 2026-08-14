using System.Collections.Concurrent;

namespace VeTool.Api.Services.Realtime;

public sealed class InMemorySequenceGenerator : ISequenceGenerator
{
    private readonly ConcurrentDictionary<string, long> _values = new();

    public Task<long> NextLobbySequenceAsync(Guid lobbyId, CancellationToken ct = default)
        => Task.FromResult(_values.AddOrUpdate($"lobby:{lobbyId}", 1, (_, v) => v + 1));

    public Task<long> NextMatchSequenceAsync(Guid matchId, CancellationToken ct = default)
        => Task.FromResult(_values.AddOrUpdate($"match:{matchId}", 1, (_, v) => v + 1));
}

public sealed class InMemoryIdempotencyService : IIdempotencyService
{
    private readonly ConcurrentDictionary<string, DateTime> _keys = new();

    public Task<bool> TryBeginAsync(string scope, string clientRequestId, TimeSpan ttl, CancellationToken ct = default)
    {
        var key = $"{scope}:{clientRequestId}";
        var now = DateTime.UtcNow;
        if (_keys.TryGetValue(key, out var expires) && expires > now) return Task.FromResult(false);
        _keys[key] = now.Add(ttl);
        return Task.FromResult(true);
    }
}
