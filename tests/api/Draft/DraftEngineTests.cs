using FluentAssertions;
using VeTool.Api.Services.Matchmaking;
using VeTool.Api.Services.Realtime;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Draft;

public class DraftEngineTests
{
    [Fact]
    public void Ten_player_lobby_remaining_picks_follow_1_2_2_2_1_after_two_captains()
    {
        new CaptainPicker().BuildPickOrder(10).Should().Equal(1, 2, 2, 2, 1);
        DraftEngine.RemainingPickCounts(10).Should().Equal(1, 2, 2, 2, 1);
    }

    [Fact]
    public void Draft_start_and_apply_use_the_1_2_2_2_1_remaining_counts()
    {
        var draft = DraftEngine.Start(10);
        draft.IsComplete.Should().BeFalse();
        draft.RemainingPickCounts.Should().Equal(1, 2, 2, 2, 1);
        draft.RemainingThisTurn.Should().Be(1);
        draft.NextTeam.Should().Be(TeamSide.A);

        draft = DraftEngine.ApplyPick(draft, TeamSide.A);
        draft.RemainingThisTurn.Should().Be(2);
        draft.NextTeam.Should().Be(TeamSide.B);

        draft = DraftEngine.ApplyPick(draft, TeamSide.B);
        draft.RemainingThisTurn.Should().Be(1);
        draft = DraftEngine.ApplyPick(draft, TeamSide.B);
        draft.RemainingThisTurn.Should().Be(2);
        draft.NextTeam.Should().Be(TeamSide.A);

        var observed = new List<int> { 1, 2 };
        while (!draft.IsComplete)
        {
            var acting = draft.NextTeam;
            var remaining = draft.RemainingThisTurn;
            for (var i = 0; i < remaining && !draft.IsComplete; i++)
            {
                draft = DraftEngine.ApplyPick(draft, acting);
            }
            if (!draft.IsComplete) observed.Add(draft.RemainingThisTurn);
        }

        DraftEngine.RemainingPickCounts(10).Should().Equal(1, 2, 2, 2, 1);
        draft.IsComplete.Should().BeTrue();
        draft.RemainingPlayers.Should().Be(0);
    }

    [Fact]
    public void ApplyPick_ignores_the_wrong_team()
    {
        var draft = DraftEngine.Start(10);
        var after = DraftEngine.ApplyPick(draft, TeamSide.B);
        after.RemainingThisTurn.Should().Be(1);
        after.RemainingPlayers.Should().Be(8);
        after.NextTeam.Should().Be(TeamSide.A);
    }
}
