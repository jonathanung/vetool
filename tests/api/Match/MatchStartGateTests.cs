using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.Matchmaking;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Match;

public class MatchStartGateTests
{
    [Fact]
    public void One_member_cannot_start()
    {
        MatchStartGate.CanStart([(LobbyRole.Owner, TeamSide.A)], out var error).Should().BeFalse();
        error.Should().Be(MatchStartGate.NeedTwoPlayers);
    }

    [Fact]
    public void Two_members_without_two_captains_cannot_start()
    {
        MatchStartGate.CanStart(
        [
            (LobbyRole.Owner, TeamSide.A),
            (LobbyRole.Member, TeamSide.Unassigned)
        ], out var error).Should().BeFalse();
        error.Should().Be(MatchStartGate.NeedTwoCaptains);
    }

    [Fact]
    public async Task StartFromLobby_rejects_until_two_captains_exist()
    {
        var options = new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<VeTool.Domain.Data.AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new VeTool.Domain.Data.AppDbContext(options);
        var owner = Guid.NewGuid();
        var lobbyId = Guid.NewGuid();
        db.Users.Add(new VeTool.Domain.Entities.ApplicationUser { Id = owner, UserName = "solo", DisplayName = "Solo", Email = "s@e.com" });
        db.Lobbies.Add(new VeTool.Domain.Entities.Lobby { Id = lobbyId, Name = "Solo", Game = Game.Cs2, CreatedByUserId = owner, MaxPlayers = 10 });
        db.LobbyMemberships.Add(new VeTool.Domain.Entities.LobbyMembership { Id = Guid.NewGuid(), LobbyId = lobbyId, UserId = owner, Role = LobbyRole.Owner, Team = TeamSide.A });
        await db.SaveChangesAsync();
        var svc = new MatchLifecycleService(db, new VetoSessionService(db));
        var blocked = await svc.StartFromLobbyAsync(lobbyId, owner, BestOf.Bo1);
        blocked.Succeeded.Should().BeFalse();
        blocked.Error.Should().Be(MatchStartGate.NeedTwoPlayers);
    }

    [Fact]
    public void Two_captains_can_start()
    {
        MatchStartGate.CanStart(
        [
            (LobbyRole.Owner, TeamSide.A),
            (LobbyRole.Captain, TeamSide.B)
        ], out var error).Should().BeTrue();
        error.Should().BeNull();
    }
}
