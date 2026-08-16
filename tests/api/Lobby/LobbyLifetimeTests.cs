using FluentAssertions;
using VeTool.Api.Services.Matchmaking;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Lobbies;

public class LobbyLifetimeTests
{
    [Fact]
    public void Lifetime_is_24_hours()
    {
        LobbyLifetime.Ttl.Should().Be(TimeSpan.FromHours(24));
    }

    [Fact]
    public void ExpiresAt_is_created_plus_ttl()
    {
        var created = new DateTime(2026, 8, 16, 12, 0, 0, DateTimeKind.Utc);
        LobbyLifetime.ExpiresAt(created).Should().Be(created.AddHours(24));
    }

    [Fact]
    public void IsExpired_is_true_at_or_after_expiry()
    {
        var expires = new DateTime(2026, 8, 17, 12, 0, 0, DateTimeKind.Utc);
        LobbyLifetime.IsExpired(expires, expires).Should().BeTrue();
        LobbyLifetime.IsExpired(expires, expires.AddSeconds(1)).Should().BeTrue();
        LobbyLifetime.IsExpired(expires, expires.AddSeconds(-1)).Should().BeFalse();
    }

    [Fact]
    public void IsLive_requires_open_status_and_future_expiry()
    {
        var now = DateTime.UtcNow;
        var live = new Domain.Entities.Lobby
        {
            Status = LobbyStatus.Open,
            ExpiresAt = now.AddHours(1)
        };
        LobbyLifetime.IsLive(live, now).Should().BeTrue();

        live.Status = LobbyStatus.Expired;
        LobbyLifetime.IsLive(live, now).Should().BeFalse();

        live.Status = LobbyStatus.Open;
        live.ExpiresAt = now.AddSeconds(-1);
        LobbyLifetime.IsLive(live, now).Should().BeFalse();
    }
}
