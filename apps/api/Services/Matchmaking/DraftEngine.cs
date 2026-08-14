using VeTool.Api.Services.Realtime;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Matchmaking;

public sealed record DraftState(
    IReadOnlyList<int> RemainingPickCounts,
    int StepIndex,
    TeamSide NextTeam,
    int RemainingThisTurn,
    int RemainingPlayers,
    bool IsComplete);

public static class DraftEngine
{
    public static IReadOnlyList<int> RemainingPickCounts(int totalPlayers)
        => new CaptainPicker().BuildPickOrder(totalPlayers);

    public static DraftState Start(int totalPlayers)
    {
        var counts = RemainingPickCounts(totalPlayers);
        var remainingPlayers = Math.Max(0, totalPlayers - 2);
        if (counts.Count == 0 || remainingPlayers == 0)
        {
            return new DraftState(counts, 0, TeamSide.A, 0, remainingPlayers, true);
        }

        return new DraftState(counts, 0, TeamSide.A, counts[0], remainingPlayers, false);
    }

    public static DraftState ApplyPick(DraftState state, TeamSide actingTeam)
    {
        if (state.IsComplete) return state;
        if (actingTeam != state.NextTeam) return state;

        var remainingThis = state.RemainingThisTurn - 1;
        var remainingPlayers = state.RemainingPlayers - 1;
        if (remainingPlayers <= 0)
        {
            return state with
            {
                RemainingThisTurn = 0,
                RemainingPlayers = 0,
                IsComplete = true
            };
        }

        if (remainingThis > 0)
        {
            return state with
            {
                RemainingThisTurn = remainingThis,
                RemainingPlayers = remainingPlayers
            };
        }

        var nextStep = state.StepIndex + 1;
        var nextCount = state.RemainingPickCounts[nextStep % state.RemainingPickCounts.Count];
        nextCount = Math.Min(nextCount, remainingPlayers);
        var nextTeam = state.NextTeam == TeamSide.A ? TeamSide.B : TeamSide.A;
        return state with
        {
            StepIndex = nextStep,
            NextTeam = nextTeam,
            RemainingThisTurn = nextCount,
            RemainingPlayers = remainingPlayers,
            IsComplete = false
        };
    }
}
