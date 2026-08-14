using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using VeTool.Api.Contracts;
using VeTool.Api.Services.Matchmaking;
using VeTool.Api.Services.Realtime;
using VeTool.Domain.Enums;

namespace VeTool.Api.Realtime;

[Authorize]
public class VetoHub : Hub
{
    private readonly VetoSessionService _veto;
    private readonly MatchLifecycleService _matches;
    private readonly ISequenceGenerator _seq;
    private readonly IIdempotencyService _idem;

    public VetoHub(VetoSessionService veto, MatchLifecycleService matches, ISequenceGenerator seq, IIdempotencyService idem)
    {
        _veto = veto;
        _matches = matches;
        _seq = seq;
        _idem = idem;
    }

    private static string GroupFor(Guid matchId) => $"match:{matchId}";

    public async Task JoinMatch(Guid matchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(matchId));
        var state = await _veto.GetStateAsync(matchId);
        if (state is not null)
        {
            await EmitState(matchId, state);
        }
    }

    public async Task LeaveMatch(Guid matchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(matchId));
    }

    [Authorize]
    public async Task StartVeto(Guid matchId, string mode)
    {
        var state = await _veto.StartAsync(matchId, VetoEngine.ParseBestOf(mode));
        if (state is null)
        {
            await EmitError(matchId, "no_pool", "No map pool");
            return;
        }
        await EmitState(matchId, state);
    }

    [Authorize]
    public async Task VetoAction(Guid matchId, string action, Guid mapId, string clientRequestId)
    {
        if (!await _idem.TryBeginAsync($"veto:{matchId}", clientRequestId, TimeSpan.FromMinutes(1))) return;
        if (!Guid.TryParse(Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value, out var userId))
        {
            await EmitError(matchId, "unauthorized", "Not signed in");
            return;
        }

        var team = await _veto.TeamForUserAsync(matchId, userId);
        if (team == TeamSide.Unassigned)
        {
            await EmitError(matchId, "wrong_side", "You are not on a team");
            return;
        }

        var vetoAction = action.Equals("pick", StringComparison.OrdinalIgnoreCase)
            ? Domain.Enums.VetoAction.Pick
            : Domain.Enums.VetoAction.Ban;
        var result = await _veto.ApplyAsync(matchId, vetoAction, mapId, team);
        if (!result.Ok)
        {
            await EmitError(matchId, result.Error ?? "invalid_action", result.Error ?? "Invalid veto action");
            return;
        }

        await EmitState(matchId, result.State);
    }

    private async Task EmitState(Guid matchId, VetoState state)
    {
        var seq = await _seq.NextMatchSequenceAsync(matchId);
        var nextAction = state.IsComplete || state.CurrentKind is null or VetoStepKind.AutoPick
            ? null
            : state.CurrentKind.ToString()!.ToLowerInvariant();
        var team = state.NextTeam == TeamSide.B ? "B" : state.NextTeam == TeamSide.A ? "A" : "None";

        await Clients.Group(GroupFor(matchId)).SendAsync("VetoSessionStarted", new RealtimeEnvelope("VetoSessionStarted", seq, DateTime.UtcNow, new
        {
            matchId,
            mode = state.Mode,
            available = state.Available,
            picks = state.Picks,
            bans = state.Bans,
            stepIndex = state.StepIndex,
            team,
            nextAction,
            complete = state.IsComplete
        }));

        await Clients.Group(GroupFor(matchId)).SendAsync("VetoProgress", new RealtimeEnvelope("VetoProgress", seq, DateTime.UtcNow, new
        {
            matchId,
            stepIndex = state.StepIndex,
            team,
            available = state.Available,
            picks = state.Picks,
            bans = state.Bans,
            nextAction,
            complete = state.IsComplete
        }));

        if (state.IsComplete)
        {
            await Clients.Group(GroupFor(matchId)).SendAsync("VetoCompleted", new RealtimeEnvelope("VetoCompleted", seq, DateTime.UtcNow, new
            {
                matchId,
                maps = state.Picks
            }));
        }

        _ = _matches;
    }

    private Task EmitError(Guid matchId, string code, string message) =>
        Clients.Group(GroupFor(matchId)).SendAsync("Error", new RealtimeEnvelope("Error", 0, DateTime.UtcNow, new ErrorEvent(code, message, null)));
}
