using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.Catalog;
using VeTool.Api.Services.Matchmaking;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Veto;

public class TournamentVetoTests
{
    private static List<Guid> Maps(int count) => Enumerable.Range(0, count).Select(_ => Guid.NewGuid()).ToList();

    [Fact]
    public void Cs2_bo3_seven_maps_is_ban_ban_pick_pick_ban_ban_then_leftover()
    {
        var sequence = VetoEngine.BuildSequence(Game.Cs2, BestOf.Bo3, 7, TeamSide.A);
        sequence.Select(s => (s.Kind, s.Team)).Should().Equal(
            (VetoStepKind.Ban, TeamSide.A),
            (VetoStepKind.Ban, TeamSide.B),
            (VetoStepKind.Pick, TeamSide.A),
            (VetoStepKind.Pick, TeamSide.B),
            (VetoStepKind.Ban, TeamSide.A),
            (VetoStepKind.Ban, TeamSide.B),
            (VetoStepKind.AutoPick, TeamSide.Unassigned));
    }

    [Fact]
    public void Last_pick_makes_team_b_take_the_first_ban()
    {
        var aStarts = VetoEngine.Create(Game.Cs2, BestOf.Bo3, Maps(7), TeamSide.A);
        var bStarts = VetoEngine.Create(Game.Cs2, BestOf.Bo3, Maps(7), TeamSide.B);
        aStarts.NextTeam.Should().Be(TeamSide.A);
        bStarts.NextTeam.Should().Be(TeamSide.B);
        aStarts.CurrentKind.Should().Be(VetoStepKind.Ban);
        bStarts.CurrentKind.Should().Be(VetoStepKind.Ban);
    }

    [Fact]
    public void Valorant_bo3_matches_cs2_ban_pick_skeleton()
    {
        var val = VetoEngine.BuildSequence(Game.Val, BestOf.Bo3, 7, TeamSide.A)
            .Select(s => s.Kind);
        var cs2 = VetoEngine.BuildSequence(Game.Cs2, BestOf.Bo3, 7, TeamSide.A)
            .Select(s => s.Kind);
        val.Should().Equal(cs2);
    }

    [Fact]
    public void Valorant_and_cs2_bo5_are_two_bans_then_four_picks_then_leftover()
    {
        foreach (var game in new[] { Game.Cs2, Game.Val })
        {
            var kinds = VetoEngine.BuildSequence(game, BestOf.Bo5, 7, TeamSide.A).Select(s => s.Kind).ToList();
            kinds.Should().Equal(
                VetoStepKind.Ban,
                VetoStepKind.Ban,
                VetoStepKind.Pick,
                VetoStepKind.Pick,
                VetoStepKind.Pick,
                VetoStepKind.Pick,
                VetoStepKind.AutoPick);
        }
    }

    [Fact]
    public async Task StartVeto_uses_only_the_lobby_selected_pool()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new AppDbContext(options);
        var owner = Guid.NewGuid();
        var capB = Guid.NewGuid();
        var lobbyId = Guid.NewGuid();
        db.Users.AddRange(
            new ApplicationUser { Id = owner, UserName = "a", DisplayName = "A", Email = "a@e.com" },
            new ApplicationUser { Id = capB, UserName = "b", DisplayName = "B", Email = "b@e.com" });
        var lobby = new Domain.Entities.Lobby
        {
            Id = lobbyId,
            Name = "Pool",
            Game = Game.Cs2,
            CreatedByUserId = owner,
            MaxPlayers = 10
        };
        db.Lobbies.Add(lobby);
        db.LobbyMemberships.AddRange(
            new LobbyMembership { Id = Guid.NewGuid(), LobbyId = lobbyId, UserId = owner, Role = LobbyRole.Owner, Team = TeamSide.A },
            new LobbyMembership { Id = Guid.NewGuid(), LobbyId = lobbyId, UserId = capB, Role = LobbyRole.Captain, Team = TeamSide.B });

        var all = new List<GameMap>();
        foreach (var def in CompetitiveMaps.Cs2)
        {
            var map = new GameMap { Id = Guid.NewGuid(), Game = Game.Cs2, Code = def.Code, Name = def.Name, IsActive = true };
            all.Add(map);
            db.Maps.Add(map);
        }
        var keep = all.Take(5).Select(m => m.Id).ToList();
        LobbyConfig.Write(lobby, true, TeamSide.A, keep);
        var match = new Domain.Entities.Match { Id = Guid.NewGuid(), LobbyId = lobbyId, BestOf = BestOf.Bo3 };
        db.Matches.Add(match);
        await db.SaveChangesAsync();

        var veto = new VetoSessionService(db);
        var state = await veto.StartAsync(match.Id);
        state.Should().NotBeNull();
        state!.Available.Concat(state.Picks).Concat(state.Bans).Should().BeEquivalentTo(keep);
        state.Available.Count.Should().Be(5);
    }
}
