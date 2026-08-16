using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Matchmaking;

public static class LobbyLifetime
{
    public static readonly TimeSpan Ttl = TimeSpan.FromHours(24);

    public static DateTime ExpiresAt(DateTime createdAtUtc) => createdAtUtc.Add(Ttl);

    public static bool IsExpired(DateTime expiresAtUtc, DateTime nowUtc) => nowUtc >= expiresAtUtc;

    public static bool IsLive(Lobby lobby, DateTime nowUtc)
        => lobby.Status is not LobbyStatus.Expired and not LobbyStatus.Completed
           && !IsExpired(lobby.ExpiresAt, nowUtc);
}
