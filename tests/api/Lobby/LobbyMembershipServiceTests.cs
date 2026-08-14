using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.Matchmaking;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Membership;

public class LobbyMembershipServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(AppDbContext db, LobbyMembershipService svc, Guid lobbyId, Guid ownerId)> SeedLobby(int maxPlayers = 2)
    {
        var db = CreateDb();
        var ownerId = Guid.NewGuid();
        var lobbyId = Guid.NewGuid();
        db.Users.Add(new ApplicationUser
        {
            Id = ownerId,
            UserName = "owner",
            DisplayName = "Owner",
            Email = "owner@example.com"
        });
        db.Lobbies.Add(new Domain.Entities.Lobby
        {
            Id = lobbyId,
            Name = "Test",
            Game = Game.Cs2,
            CreatedByUserId = ownerId,
            MaxPlayers = maxPlayers,
            Status = LobbyStatus.Open
        });
        db.LobbyMemberships.Add(new LobbyMembership
        {
            Id = Guid.NewGuid(),
            LobbyId = lobbyId,
            UserId = ownerId,
            Role = LobbyRole.Owner
        });
        await db.SaveChangesAsync();
        return (db, new LobbyMembershipService(db), lobbyId, ownerId);
    }

    [Fact]
    public async Task TryJoin_returns_not_found_when_lobby_is_missing()
    {
        using var db = CreateDb();
        var svc = new LobbyMembershipService(db);
        var outcome = await svc.TryJoinAsync(Guid.NewGuid(), Guid.NewGuid());
        outcome.Should().Be(JoinOutcome.NotFound);
    }

    [Fact]
    public async Task TryJoin_returns_full_when_capacity_is_reached()
    {
        var (db, svc, lobbyId, _) = await SeedLobby(maxPlayers: 1);
        using (db)
        {
            var joiner = Guid.NewGuid();
            db.Users.Add(new ApplicationUser { Id = joiner, UserName = "joiner", DisplayName = "Joiner", Email = "j@example.com" });
            await db.SaveChangesAsync();

            var outcome = await svc.TryJoinAsync(lobbyId, joiner);
            outcome.Should().Be(JoinOutcome.Full);
            (await svc.GetMembersAsync(lobbyId)).Should().HaveCount(1);
        }
    }

    [Fact]
    public async Task TryJoin_adds_a_member_and_is_idempotent()
    {
        var (db, svc, lobbyId, _) = await SeedLobby(maxPlayers: 4);
        using (db)
        {
            var joiner = Guid.NewGuid();
            db.Users.Add(new ApplicationUser { Id = joiner, UserName = "joiner", DisplayName = "Joiner", Email = "j@example.com" });
            await db.SaveChangesAsync();

            (await svc.TryJoinAsync(lobbyId, joiner)).Should().Be(JoinOutcome.Joined);
            (await svc.TryJoinAsync(lobbyId, joiner)).Should().Be(JoinOutcome.AlreadyMember);
            (await svc.GetMembersAsync(lobbyId)).Select(m => m.UserId).Should().Contain(joiner);
        }
    }

    [Fact]
    public async Task Hub_disconnect_does_not_remove_membership()
    {
        var (db, svc, lobbyId, ownerId) = await SeedLobby();
        using (db)
        {
            await svc.OnHubDisconnectedAsync(lobbyId, ownerId);
            var members = await svc.GetMembersAsync(lobbyId);
            members.Should().Contain(m => m.UserId == ownerId);
        }
    }

    [Fact]
    public async Task Parallel_TryJoin_same_user_results_in_a_single_membership()
    {
        var path = Path.Combine(Path.GetTempPath(), $"vetool-race-{Guid.NewGuid():N}.sqlite");
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite($"Data Source={path}")
            .Options;

        await using (var setup = new AppDbContext(options))
        {
            setup.Database.EnsureCreated();
            var ownerId = Guid.NewGuid();
            var lobbyId = Guid.NewGuid();
            var joiner = Guid.NewGuid();
            setup.Users.AddRange(
                new ApplicationUser { Id = ownerId, UserName = "own", DisplayName = "Own", Email = "o@example.com" },
                new ApplicationUser { Id = joiner, UserName = "dup", DisplayName = "Dup", Email = "d@example.com" });
            setup.Lobbies.Add(new Domain.Entities.Lobby
            {
                Id = lobbyId,
                Name = "Race",
                Game = Game.Cs2,
                CreatedByUserId = ownerId,
                MaxPlayers = 10
            });
            setup.LobbyMemberships.Add(new LobbyMembership
            {
                Id = Guid.NewGuid(),
                LobbyId = lobbyId,
                UserId = ownerId,
                Role = LobbyRole.Owner
            });
            await setup.SaveChangesAsync();

            await using var db1 = new AppDbContext(options);
            await using var db2 = new AppDbContext(options);
            var a = new LobbyMembershipService(db1);
            var b = new LobbyMembershipService(db2);
            var results = await Task.WhenAll(a.TryJoinAsync(lobbyId, joiner), b.TryJoinAsync(lobbyId, joiner));
            results.Should().OnlyContain(r => r == JoinOutcome.Joined || r == JoinOutcome.AlreadyMember);
            results.Should().Contain(JoinOutcome.Joined);

            var members = await new LobbyMembershipService(setup).GetMembersAsync(lobbyId);
            members.Count(m => m.UserId == joiner).Should().Be(1);
        }

        try { File.Delete(path); } catch { /* ignore */ }
    }

    [Fact]
    public async Task SetCaptains_then_UpdateTeams_without_captains_keeps_both_captains_on_sides()
    {
        var (db, svc, lobbyId, ownerId) = await SeedLobby(maxPlayers: 10);
        using (db)
        {
            var captainB = Guid.NewGuid();
            var drafted = Guid.NewGuid();
            db.Users.AddRange(
                new ApplicationUser { Id = captainB, UserName = "capb", DisplayName = "Cap B", Email = "b@example.com" },
                new ApplicationUser { Id = drafted, UserName = "pick", DisplayName = "Pick", Email = "p@example.com" });
            await db.SaveChangesAsync();
            (await svc.TryJoinAsync(lobbyId, captainB)).Should().Be(JoinOutcome.Joined);
            (await svc.TryJoinAsync(lobbyId, drafted)).Should().Be(JoinOutcome.Joined);

            var afterCaptains = await svc.SetCaptainsAsync(lobbyId, ownerId, captainB);
            afterCaptains.Should().NotBeNull();
            afterCaptains!.CaptainA.Should().Be(ownerId);
            afterCaptains.CaptainB.Should().Be(captainB);
            afterCaptains.TeamA.Should().Contain(ownerId);
            afterCaptains.TeamB.Should().Contain(captainB);

            // Client first pick historically sent only the drafted id — captains must stay assigned.
            var afterPick = await svc.AssignTeamsAsync(lobbyId, [drafted], []);
            afterPick.Should().NotBeNull();
            afterPick!.TeamA.Should().Contain(ownerId);
            afterPick.TeamA.Should().Contain(drafted);
            afterPick.TeamB.Should().Contain(captainB);
            afterPick.CaptainA.Should().Be(ownerId);
            afterPick.CaptainB.Should().Be(captainB);

            var veto = new VetoSessionService(db);
            var matches = new MatchLifecycleService(db, veto);
            var match = (await matches.StartFromLobbyAsync(lobbyId, ownerId, BestOf.Bo1)).Match;
            match.Should().NotBeNull();
            (await veto.TeamForUserAsync(match!.Id, ownerId)).Should().Be(TeamSide.A);
            (await veto.TeamForUserAsync(match.Id, captainB)).Should().Be(TeamSide.B);
            (await veto.TeamForUserAsync(match.Id, drafted)).Should().Be(TeamSide.A);

            var summary = await matches.GetSummaryAsync(match.Id);
            summary.Should().NotBeNull();
            summary!.TeamA.Select(p => p.UserId).Should().BeEquivalentTo(new[] { ownerId, drafted });
            summary.TeamB.Select(p => p.UserId).Should().Equal(captainB);
        }
    }

    [Fact]
    public async Task Leave_removes_membership()
    {
        var (db, svc, lobbyId, _) = await SeedLobby(maxPlayers: 4);
        using (db)
        {
            var joiner = Guid.NewGuid();
            db.Users.Add(new ApplicationUser { Id = joiner, UserName = "joiner", DisplayName = "Joiner", Email = "j@example.com" });
            await db.SaveChangesAsync();
            await svc.TryJoinAsync(lobbyId, joiner);

            (await svc.LeaveAsync(lobbyId, joiner)).Should().BeTrue();
            (await svc.GetMembersAsync(lobbyId)).Select(m => m.UserId).Should().NotContain(joiner);
        }
    }
}
