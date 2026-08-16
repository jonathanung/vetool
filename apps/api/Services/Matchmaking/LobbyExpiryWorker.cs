namespace VeTool.Api.Services.Matchmaking;

public sealed class LobbyExpiryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<LobbyExpiryWorker> _log;

    public LobbyExpiryWorker(IServiceScopeFactory scopes, ILogger<LobbyExpiryWorker> log)
    {
        _scopes = scopes;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = _scopes.CreateScope();
                var sweeper = scope.ServiceProvider.GetRequiredService<LobbyExpiryService>();
                var removed = await sweeper.SweepAsync(DateTime.UtcNow, stoppingToken);
                if (removed > 0)
                    _log.LogInformation("Removed {Count} expired lobbies", removed);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Lobby expiry sweep failed");
            }
        }
    }
}
