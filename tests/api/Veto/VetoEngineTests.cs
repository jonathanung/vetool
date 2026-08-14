using FluentAssertions;
using VeTool.Api.Services.Matchmaking;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Veto;

public class VetoEngineTests
{
    private static List<Guid> Maps(int count) => Enumerable.Range(0, count).Select(_ => Guid.NewGuid()).ToList();

    private static VetoState DriveToCompletion(VetoState state)
    {
        var guard = 0;
        while (!state.IsComplete && guard++ < 32)
        {
            var kind = state.CurrentKind;
            kind.Should().NotBeNull();
            if (kind == VetoStepKind.AutoPick)
            {
                break;
            }

            var action = kind == VetoStepKind.Ban ? VetoAction.Ban : VetoAction.Pick;
            var mapId = state.Available[0];
            var result = VetoEngine.Apply(state, action, mapId, state.NextTeam);
            result.Ok.Should().BeTrue(result.Error);
            state = result.State;
        }

        return state;
    }

    [Fact]
    public void Bo1_on_seven_maps_finishes_with_exactly_one_picked_map()
    {
        var maps = Maps(7);
        var sequence = VetoEngine.BuildSequence(BestOf.Bo1, maps.Count);
        sequence.Count(s => s.Kind == VetoStepKind.Ban).Should().Be(6);
        sequence.Count(s => s.Kind == VetoStepKind.Pick).Should().Be(0);
        sequence.Last().Kind.Should().Be(VetoStepKind.AutoPick);

        var finished = DriveToCompletion(VetoEngine.Create(BestOf.Bo1, maps));
        finished.IsComplete.Should().BeTrue();
        finished.Picks.Should().HaveCount(1);
        finished.Bans.Should().HaveCount(6);
        maps.Should().Contain(finished.Picks[0]);
    }

    [Fact]
    public void Bo3_on_seven_maps_interleaves_bans_and_picks_and_auto_picks_last()
    {
        var maps = Maps(7);
        var sequence = VetoEngine.BuildSequence(BestOf.Bo3, maps.Count);
        sequence.Select(s => s.Kind).Should().Equal(
            VetoStepKind.Ban,
            VetoStepKind.Ban,
            VetoStepKind.Pick,
            VetoStepKind.Pick,
            VetoStepKind.Ban,
            VetoStepKind.Ban,
            VetoStepKind.AutoPick);

        var finished = DriveToCompletion(VetoEngine.Create(BestOf.Bo3, maps));
        finished.IsComplete.Should().BeTrue();
        finished.Picks.Should().HaveCount(3);
        finished.Bans.Should().HaveCount(4);
        finished.Picks.Distinct().Should().HaveCount(3);
    }

    [Fact]
    public void Bo5_on_seven_maps_finishes_with_five_picks()
    {
        var finished = DriveToCompletion(VetoEngine.Create(BestOf.Bo5, Maps(7)));
        finished.IsComplete.Should().BeTrue();
        finished.Picks.Should().HaveCount(5);
        finished.Bans.Should().HaveCount(2);
    }

    [Fact]
    public void Apply_rejects_the_wrong_acting_side()
    {
        var state = VetoEngine.Create(BestOf.Bo1, Maps(7));
        state.NextTeam.Should().Be(TeamSide.A);
        var result = VetoEngine.Apply(state, VetoAction.Ban, state.Available[0], TeamSide.B);
        result.Ok.Should().BeFalse();
        result.Error.Should().Be("wrong_side");
        result.State.Bans.Should().BeEmpty();
    }

    [Fact]
    public void Apply_rejects_pick_when_the_step_is_a_ban()
    {
        var state = VetoEngine.Create(BestOf.Bo1, Maps(7));
        state.CurrentKind.Should().Be(VetoStepKind.Ban);
        var result = VetoEngine.Apply(state, VetoAction.Pick, state.Available[0], TeamSide.A);
        result.Ok.Should().BeFalse();
        result.Error.Should().Be("invalid_action");
    }
}
