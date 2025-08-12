using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using System.Text.Json;
using VeTool.Api.Contracts;
using VeTool.Api.Services.Realtime;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Realtime;

[Authorize]
public class VetoHub : Hub
{
    private readonly AppDbContext _db;
    private readonly IConnectionMultiplexer _mux;
    private readonly ISequenceGenerator _seq;
    private readonly IIdempotencyService _idem;

    public VetoHub(AppDbContext db, IConnectionMultiplexer mux, ISequenceGenerator seq, IIdempotencyService idem)
    {
        _db = db;
        _mux = mux;
        _seq = seq;
        _idem = idem;
    }

    private static string GroupFor(Guid matchId) => $"match:{matchId}";
    private static string KeyFor(Guid matchId) => $"veto:match:{matchId}";

    public async Task JoinMatch(Guid matchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(matchId));
    }

    public async Task LeaveMatch(Guid matchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(matchId));
    }

    public sealed record VetoState(string Mode, int StepIndex, string NextTeam, List<Guid> Available, List<Guid> Picks, List<Guid> Bans);

    [Authorize]
    public async Task StartVeto(Guid matchId, string mode)
    {
        var db = _mux.GetDatabase();
        var match = await _db.Matches.AsNoTracking().FirstOrDefaultAsync(m => m.Id == matchId);
        if (match == null) { await EmitError(matchId, "not_found", "Match not found"); return; }
        var lobby = await _db.Lobbies.AsNoTracking().FirstOrDefaultAsync(l => l.Id == match.LobbyId);
        if (lobby == null) { await EmitError(matchId, "not_found", "Lobby not found"); return; }
        var pool = await _db.MapPools.AsNoTracking().Where(p => p.Game == lobby.Game)
            .OrderByDescending(p => p.EffectiveAt).FirstOrDefaultAsync();
        if (pool == null) { await EmitError(matchId, "no_pool", "No map pool"); return; }
        var maps = await _db.MapPoolMaps.AsNoTracking().Where(pm => pm.MapPoolId == pool.Id)
            .Select(pm => pm.GameMapId).ToListAsync();
        var state = new VetoState(mode.ToLower(), 0, "A", maps, new List<Guid>(), new List<Guid>());
        await db.StringSetAsync(KeyFor(matchId), JsonSerializer.Serialize(state));
        var seq = await _seq.NextMatchSequenceAsync(matchId);
        await Clients.Group(GroupFor(matchId)).SendAsync("VetoSessionStarted", new RealtimeEnvelope("VetoSessionStarted", seq, DateTime.UtcNow, new { matchId, mode = state.Mode, available = state.Available }));
        await Clients.Group(GroupFor(matchId)).SendAsync("VetoProgress", new RealtimeEnvelope("VetoProgress", seq, DateTime.UtcNow, new { matchId, stepIndex = state.StepIndex, team = state.NextTeam }));
    }

    [Authorize]
    public async Task VetoAction(Guid matchId, string action, Guid mapId, string clientRequestId)
    {
        if (!await _idem.TryBeginAsync($"veto:{matchId}", clientRequestId, TimeSpan.FromMinutes(1))) return;
        var db = _mux.GetDatabase();
        var raw = await db.StringGetAsync(KeyFor(matchId));
        if (raw.IsNullOrEmpty) { await EmitError(matchId, "no_session", "Veto not started"); return; }
        var state = JsonSerializer.Deserialize<VetoState>(raw!)!;
        if (!state.Available.Contains(mapId)) { await EmitError(matchId, "invalid_map", "Map not available"); return; }

        if (action.Equals("ban", StringComparison.OrdinalIgnoreCase))
        {
            state.Available.Remove(mapId);
            state.Bans.Add(mapId);
        }
        else if (action.Equals("pick", StringComparison.OrdinalIgnoreCase))
        {
            state.Available.Remove(mapId);
            state.Picks.Add(mapId);
        }
        else { await EmitError(matchId, "invalid_action", "Unknown action"); return; }

        // advance step and team
        state = state with { StepIndex = state.StepIndex + 1, NextTeam = state.NextTeam == "A" ? "B" : "A" };

        await db.StringSetAsync(KeyFor(matchId), JsonSerializer.Serialize(state));
        var seq = await _seq.NextMatchSequenceAsync(matchId);
        await Clients.Group(GroupFor(matchId)).SendAsync("VetoProgress", new RealtimeEnvelope("VetoProgress", seq, DateTime.UtcNow, new { matchId, stepIndex = state.StepIndex, team = state.NextTeam, available = state.Available, picks = state.Picks, bans = state.Bans }));

        // completion condition: direct pick, or last map remaining, or picks reach target
        int targetPicks = state.Mode == "direct" ? 1 : (state.Mode == "bo3" ? 3 : 5);
        if (state.Mode != "direct" && state.Available.Count == 1 && state.Picks.Count == 0)
        {
            var finalMap = state.Available[0];
            state.Picks.Add(finalMap);
            await db.StringSetAsync(KeyFor(matchId), JsonSerializer.Serialize(state));
        }
        if (state.Picks.Count >= targetPicks)
        {
            await Clients.Group(GroupFor(matchId)).SendAsync("VetoCompleted", new RealtimeEnvelope("VetoCompleted", seq, DateTime.UtcNow, new { matchId, maps = state.Picks }));
            // persist first pick as selected map
            var match = await _db.Matches.FirstOrDefaultAsync(m => m.Id == matchId);
            if (match != null && state.Picks.Count > 0) { match.SelectedMapId = state.Picks[0]; await _db.SaveChangesAsync(); }
        }
    }

    private Task EmitError(Guid matchId, string code, string message) =>
        Clients.Group(GroupFor(matchId)).SendAsync("Error", new RealtimeEnvelope("Error", 0, DateTime.UtcNow, new ErrorEvent(code, message, null)));
} 