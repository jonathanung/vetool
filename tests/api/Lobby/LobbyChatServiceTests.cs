using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.Matchmaking;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Lobbies;

public class LobbyChatServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(AppDbContext db, LobbyChatService svc, Guid lobbyId, Guid userId)> Seed()
    {
        var db = CreateDb();
        var userId = Guid.NewGuid();
        var lobbyId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        db.Users.Add(new ApplicationUser
        {
            Id = userId,
            UserName = "caller",
            DisplayName = "Caller",
            Email = "caller@example.com"
        });
        db.Lobbies.Add(new Domain.Entities.Lobby
        {
            Id = lobbyId,
            Name = "Chat",
            Game = Game.Cs2,
            CreatedByUserId = userId,
            Status = LobbyStatus.Open,
            CreatedAt = now,
            ExpiresAt = now.AddHours(24)
        });
        db.LobbyMemberships.Add(new LobbyMembership
        {
            Id = Guid.NewGuid(),
            LobbyId = lobbyId,
            UserId = userId,
            Role = LobbyRole.Owner
        });
        await db.SaveChangesAsync();
        return (db, new LobbyChatService(db), lobbyId, userId);
    }

    [Fact]
    public async Task Post_persists_and_lists_recent_messages()
    {
        var (db, svc, lobbyId, userId) = await Seed();
        using (db)
        {
            var posted = await svc.PostAsync(lobbyId, userId, "  mid is open  ");
            posted.Ok.Should().BeTrue();
            posted.Message!.Body.Should().Be("mid is open");
            posted.Message.UserName.Should().Be("caller");
            posted.Message.DisplayName.Should().Be("Caller");

            var list = await svc.ListRecentAsync(lobbyId);
            list.Should().ContainSingle();
            list[0].Id.Should().Be(posted.Message.Id);
            list[0].Body.Should().Be("mid is open");
        }
    }

    [Fact]
    public async Task Post_rejects_empty_or_too_long_body()
    {
        var (db, svc, lobbyId, userId) = await Seed();
        using (db)
        {
            (await svc.PostAsync(lobbyId, userId, "   ")).Error.Should().Be("empty");
            (await svc.PostAsync(lobbyId, userId, new string('x', LobbyChatService.MaxBodyLength + 1))).Error.Should().Be("too_long");
        }
    }

    [Fact]
    public async Task Post_rejects_non_members_and_expired_lobbies()
    {
        var (db, svc, lobbyId, _) = await Seed();
        using (db)
        {
            var stranger = Guid.NewGuid();
            (await svc.PostAsync(lobbyId, stranger, "hi")).Error.Should().Be("not_member");

            var lobby = await db.Lobbies.SingleAsync(l => l.Id == lobbyId);
            lobby.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
            (await svc.PostAsync(lobbyId, lobby.CreatedByUserId, "late")).Error.Should().Be("expired");
        }
    }
}
