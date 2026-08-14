using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.Catalog;
using VeTool.Api.Services.Matchmaking;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Match;

public class MatchAndVetoPersistenceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<Fixture> SeedAsync(Game game = Game.Cs2)
    {
        var db = CreateDb();
        var ownerId = Guid.NewGuid();
        var lobbyId = Guid.NewGuid();
        db.Users.Add(new ApplicationUser
        {
            Id = ownerId,
            UserName = "host",
            DisplayName = "Host",
            Email = "host@example.com"
        });
        db.Lobbies.Add(new Domain.Entities.Lobby
        {
            Id = lobbyId,
            Name = game == Game.Val ? "VAL Lobby" : "CS2 Lobby",
            Game = game,
            CreatedByUserId = ownerId,
            MaxPlayers = 10,
            Status = LobbyStatus.Open
        });
        var captainB = Guid.NewGuid();
        db.Users.Add(new ApplicationUser
        {
            Id = captainB,
            UserName = "capb",
            DisplayName = "Cap B",
            Email = "capb@example.com"
        });
        db.LobbyMemberships.Add(new LobbyMembership
        {
            Id = Guid.NewGuid(),
            LobbyId = lobbyId,
            UserId = ownerId,
            Role = LobbyRole.Owner,
            Team = TeamSide.A
        });
        db.LobbyMemberships.Add(new LobbyMembership
        {
            Id = Guid.NewGuid(),
            LobbyId = lobbyId,
            UserId = captainB,
            Role = LobbyRole.Captain,
            Team = TeamSide.B
        });

        var defs = CompetitiveMaps.For(game);
        var pool = new MapPool
        {
            Id = Guid.NewGuid(),
            Game = game,
            Label = game == Game.Val ? "Competitive" : "Active Duty",
            Source = MapPoolSource.Manual,
            EffectiveAt = DateTime.UtcNow
        };
        db.MapPools.Add(pool);
        var order = 0;
        foreach (var def in defs)
        {
            var map = new GameMap
            {
                Id = Guid.NewGuid(),
                Game = game,
                Code = def.Code,
                Name = def.Name,
                IsActive = true
            };
            db.Maps.Add(map);
            db.MapPoolMaps.Add(new MapPoolMap
            {
                Id = Guid.NewGuid(),
                MapPoolId = pool.Id,
                GameMapId = map.Id,
                OrderIndex = order++
            });
        }

        await db.SaveChangesAsync();
        var veto = new VetoSessionService(db);
        var matches = new MatchLifecycleService(db, veto);
        return new Fixture(db, matches, veto, lobbyId, ownerId);
    }

    private sealed record Fixture(
        AppDbContext Db,
        MatchLifecycleService Matches,
        VetoSessionService Veto,
        Guid LobbyId,
        Guid OwnerId);

    [Fact]
    public async Task StartVeto_second_call_does_not_wipe_picks_or_bans()
    {
        var fx = await SeedAsync();
        using (fx.Db)
        {
            var match = (await fx.Matches.StartFromLobbyAsync(fx.LobbyId, fx.OwnerId, BestOf.Bo3)).Match;
            match.Should().NotBeNull();

            var started = await fx.Veto.StartAsync(match!.Id);
            started.Should().NotBeNull();
            started!.IsComplete.Should().BeFalse();

            var firstMap = started.Available[0];
            var applied = await fx.Veto.ApplyAsync(match.Id, VetoAction.Ban, firstMap, TeamSide.A);
            applied.Ok.Should().BeTrue(applied.Error);
            applied.State.Bans.Should().Equal(firstMap);

            var again = await fx.Veto.StartAsync(match.Id);
            again.Should().NotBeNull();
            again!.Bans.Should().Equal(applied.State.Bans);
            again.Picks.Should().Equal(applied.State.Picks);
            again.Available.Should().Equal(applied.State.Available);
            again.StepIndex.Should().Be(applied.State.StepIndex);
        }
    }

    [Fact]
    public async Task GetSummary_includes_human_readable_map_names_after_veto()
    {
        var fx = await SeedAsync(Game.Cs2);
        using (fx.Db)
        {
            var match = (await fx.Matches.StartFromLobbyAsync(fx.LobbyId, fx.OwnerId, BestOf.Bo1)).Match;
            var state = await fx.Veto.StartAsync(match!.Id);
            state.Should().NotBeNull();

            while (!state!.IsComplete)
            {
                var kind = state.CurrentKind;
                if (kind is null or VetoStepKind.AutoPick) break;
                var action = kind == VetoStepKind.Ban ? VetoAction.Ban : VetoAction.Pick;
                var result = await fx.Veto.ApplyAsync(match.Id, action, state.Available[0], state.NextTeam);
                result.Ok.Should().BeTrue(result.Error);
                state = result.State;
            }

            state.IsComplete.Should().BeTrue();
            state.Picks.Should().HaveCount(1);

            await fx.Matches.SetJoinDetailsAsync(match.Id, fx.OwnerId, "connect 203.0.113.10:27015; password scrim");
            var summary = await fx.Matches.GetSummaryAsync(match.Id);
            summary.Should().NotBeNull();
            summary!.Maps.Should().NotBeEmpty();
            summary.Maps.Should().OnlyContain(m => !string.IsNullOrWhiteSpace(m.Name) && m.Name != m.Id.ToString());
            summary.SelectedMaps.Should().HaveCount(1);
            summary.SelectedMaps[0].Name.Should().BeOneOf(CompetitiveMaps.Cs2.Select(m => m.Name));
            summary.JoinDetails.Should().Be("connect 203.0.113.10:27015; password scrim");
            summary.BestOf.Should().Be(1);
            summary.Game.Should().Be("cs2");
        }
    }

    [Fact]
    public async Task Valorant_match_summary_exposes_a_named_seven_map_pool()
    {
        var fx = await SeedAsync(Game.Val);
        using (fx.Db)
        {
            var match = (await fx.Matches.StartFromLobbyAsync(fx.LobbyId, fx.OwnerId, BestOf.Bo3)).Match;
            var summary = await fx.Matches.GetSummaryAsync(match!.Id);
            summary.Should().NotBeNull();
            summary!.Game.Should().Be("val");
            summary.Maps.Should().HaveCount(7);
            summary.Maps.Select(m => m.Name).Should().Contain(new[] { "Ascent", "Bind", "Haven" });
            summary.Maps.Should().OnlyContain(m => !string.IsNullOrWhiteSpace(m.Name));
        }
    }

    [Fact]
    public async Task Bo3_veto_through_session_service_finishes_with_three_named_picks()
    {
        var fx = await SeedAsync();
        using (fx.Db)
        {
            var match = (await fx.Matches.StartFromLobbyAsync(fx.LobbyId, fx.OwnerId, BestOf.Bo3)).Match;
            var state = await fx.Veto.StartAsync(match!.Id);
            while (!state!.IsComplete)
            {
                var kind = state.CurrentKind;
                if (kind is null or VetoStepKind.AutoPick) break;
                var action = kind == VetoStepKind.Ban ? VetoAction.Ban : VetoAction.Pick;
                var result = await fx.Veto.ApplyAsync(match.Id, action, state.Available[0], state.NextTeam);
                result.Ok.Should().BeTrue(result.Error);
                state = result.State;
            }

            state.Picks.Should().HaveCount(3);
            var summary = await fx.Matches.GetSummaryAsync(match.Id);
            summary!.SelectedMaps.Should().HaveCount(3);
            summary.SelectedMaps.Should().OnlyContain(m => CompetitiveMaps.Cs2.Any(d => d.Name == m.Name));
        }
    }
}
