using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.Matchmaking;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Lobbies;

public class LobbyExpiryServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task Sweep_deletes_expired_lobbies_and_keeps_live_ones()
    {
        using var db = CreateDb();
        var owner = Guid.NewGuid();
        var expiredId = Guid.NewGuid();
        var liveId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        db.Users.Add(new ApplicationUser { Id = owner, UserName = "owner", DisplayName = "Owner", Email = "o@example.com" });
        db.Lobbies.AddRange(
            new Domain.Entities.Lobby
            {
                Id = expiredId,
                Name = "Old",
                Game = Game.Cs2,
                CreatedByUserId = owner,
                CreatedAt = now.AddHours(-25),
                ExpiresAt = now.AddHours(-1),
                Status = LobbyStatus.Open
            },
            new Domain.Entities.Lobby
            {
                Id = liveId,
                Name = "Fresh",
                Game = Game.Cs2,
                CreatedByUserId = owner,
                CreatedAt = now,
                ExpiresAt = now.AddHours(23),
                Status = LobbyStatus.Open
            });
        db.LobbyMemberships.Add(new LobbyMembership { Id = Guid.NewGuid(), LobbyId = expiredId, UserId = owner, Role = LobbyRole.Owner });
        db.LobbyChatMessages.Add(new LobbyChatMessage
        {
            Id = Guid.NewGuid(),
            LobbyId = expiredId,
            UserId = owner,
            Body = "gone soon",
            CreatedAt = now.AddHours(-2)
        });
        await db.SaveChangesAsync();

        var removed = await new LobbyExpiryService(db).SweepAsync(now);
        removed.Should().Be(1);
        (await db.Lobbies.Select(l => l.Id).ToListAsync()).Should().Equal(liveId);
        (await db.LobbyChatMessages.CountAsync()).Should().Be(0);
        (await db.LobbyMemberships.CountAsync(m => m.LobbyId == expiredId)).Should().Be(0);
    }
}
