using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Matchmaking;

public enum VetoStepKind
{
    Ban,
    Pick,
    AutoPick
}

public sealed record VetoStep(int Index, VetoStepKind Kind, TeamSide Team);

public sealed record VetoState
{
    public string Mode { get; init; } = "bo1";
    public int StepIndex { get; init; }
    public TeamSide NextTeam { get; init; } = TeamSide.A;
    public List<Guid> Available { get; init; } = new();
    public List<Guid> Picks { get; init; } = new();
    public List<Guid> Bans { get; init; } = new();
    public List<VetoStep> Sequence { get; init; } = new();
    public bool IsComplete { get; init; }

    public VetoStepKind? CurrentKind =>
        StepIndex >= 0 && StepIndex < Sequence.Count ? Sequence[StepIndex].Kind : null;
}

public sealed class VetoApplyResult
{
    public bool Ok { get; init; }
    public string? Error { get; init; }
    public VetoState State { get; init; } = new();

    public static VetoApplyResult Success(VetoState state) => new() { Ok = true, State = state };
    public static VetoApplyResult Fail(VetoState state, string error) => new() { Ok = false, Error = error, State = state };
}

public static class VetoEngine
{
    public static string ModeName(BestOf bestOf) => bestOf switch
    {
        BestOf.Bo3 => "bo3",
        BestOf.Bo5 => "bo5",
        _ => "bo1"
    };

    public static BestOf ParseBestOf(string? mode) => (mode ?? string.Empty).Trim().ToLowerInvariant() switch
    {
        "bo3" or "3" => BestOf.Bo3,
        "bo5" or "5" => BestOf.Bo5,
        "direct" or "bo1" or "1" => BestOf.Bo1,
        _ => BestOf.Bo1
    };

    public static IReadOnlyList<VetoStep> BuildSequence(BestOf bestOf, int mapCount)
    {
        var steps = new List<VetoStep>();
        if (mapCount <= 0) return steps;

        var targetPicks = Math.Clamp((int)bestOf, 1, mapCount);
        var explicitPicks = Math.Max(0, targetPicks - 1);
        var explicitBans = Math.Max(0, mapCount - targetPicks);
        var team = TeamSide.A;

        void Add(VetoStepKind kind, int count)
        {
            for (var i = 0; i < count; i++)
            {
                steps.Add(new VetoStep(steps.Count, kind, team));
                team = team == TeamSide.A ? TeamSide.B : TeamSide.A;
            }
        }

        if (targetPicks == 1)
        {
            Add(VetoStepKind.Ban, explicitBans);
        }
        else
        {
            var openingBans = Math.Min(2, explicitBans);
            Add(VetoStepKind.Ban, openingBans);
            var openingPicks = Math.Min(2, explicitPicks);
            Add(VetoStepKind.Pick, openingPicks);
            Add(VetoStepKind.Ban, explicitBans - openingBans);
            Add(VetoStepKind.Pick, explicitPicks - openingPicks);
        }

        steps.Add(new VetoStep(steps.Count, VetoStepKind.AutoPick, TeamSide.Unassigned));
        return steps;
    }

    public static VetoState Create(BestOf bestOf, IReadOnlyList<Guid> maps)
    {
        var sequence = BuildSequence(bestOf, maps.Count).ToList();
        var firstTeam = sequence.Count > 0 && sequence[0].Kind != VetoStepKind.AutoPick
            ? sequence[0].Team
            : TeamSide.Unassigned;

        var state = new VetoState
        {
            Mode = ModeName(bestOf),
            StepIndex = 0,
            NextTeam = firstTeam,
            Available = maps.ToList(),
            Picks = new List<Guid>(),
            Bans = new List<Guid>(),
            Sequence = sequence,
            IsComplete = false
        };
        return FinalizeAuto(state);
    }

    public static VetoApplyResult Apply(VetoState state, VetoAction action, Guid mapId, TeamSide actingTeam)
    {
        if (state.IsComplete)
            return VetoApplyResult.Fail(state, "veto_complete");
        if (state.CurrentKind is null or VetoStepKind.AutoPick)
            return VetoApplyResult.Fail(state, "not_user_step");
        if (actingTeam != state.NextTeam)
            return VetoApplyResult.Fail(state, "wrong_side");
        if (!state.Available.Contains(mapId))
            return VetoApplyResult.Fail(state, "invalid_map");

        var expected = state.CurrentKind == VetoStepKind.Ban ? VetoAction.Ban : VetoAction.Pick;
        if (action != expected)
            return VetoApplyResult.Fail(state, "invalid_action");

        var available = state.Available.Where(id => id != mapId).ToList();
        var picks = state.Picks.ToList();
        var bans = state.Bans.ToList();
        if (action == VetoAction.Ban) bans.Add(mapId);
        else picks.Add(mapId);

        var nextIndex = state.StepIndex + 1;
        var nextTeam = nextIndex < state.Sequence.Count ? state.Sequence[nextIndex].Team : TeamSide.Unassigned;
        var next = state with
        {
            StepIndex = nextIndex,
            NextTeam = nextTeam,
            Available = available,
            Picks = picks,
            Bans = bans,
            IsComplete = false
        };
        return VetoApplyResult.Success(FinalizeAuto(next));
    }

    private static VetoState FinalizeAuto(VetoState state)
    {
        var current = state;
        while (!current.IsComplete && current.CurrentKind == VetoStepKind.AutoPick)
        {
            if (current.Available.Count == 0)
            {
                return current with
                {
                    IsComplete = current.Picks.Count > 0,
                    NextTeam = TeamSide.Unassigned
                };
            }

            var leftover = current.Available[0];
            var picks = current.Picks.ToList();
            picks.Add(leftover);
            current = current with
            {
                StepIndex = current.StepIndex + 1,
                NextTeam = TeamSide.Unassigned,
                Available = new List<Guid>(),
                Picks = picks,
                IsComplete = true
            };
        }

        var target = (int)ParseBestOf(current.Mode);
        if (current.Picks.Count >= target || (current.Available.Count == 0 && current.Picks.Count > 0))
        {
            return current with { IsComplete = true, NextTeam = TeamSide.Unassigned };
        }

        return current;
    }
}
