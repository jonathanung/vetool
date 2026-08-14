using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Matchmaking;

public sealed class VetoSessionService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly AppDbContext _db;

    public VetoSessionService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<VetoState?> StartAsync(Guid matchId, BestOf? requested = null, CancellationToken ct = default)
    {
        var existing = await _db.VetoSessions.FirstOrDefaultAsync(v => v.MatchId == matchId, ct);
        if (existing is not null && existing.Phase is VetoPhase.Active or VetoPhase.Completed)
        {
            return ReadState(existing);
        }

        var match = await _db.Matches.FirstOrDefaultAsync(m => m.Id == matchId, ct);
        if (match is null) return null;
        var lobby = await _db.Lobbies.AsNoTracking().FirstOrDefaultAsync(l => l.Id == match.LobbyId, ct);
        if (lobby is null) return null;

        var maps = LobbyConfig.GetSelectedMapIds(lobby).ToList();
        if (maps.Count == 0)
        {
            var pool = await _db.MapPools.AsNoTracking()
                .Where(p => p.Game == lobby.Game)
                .OrderByDescending(p => p.EffectiveAt)
                .FirstOrDefaultAsync(ct);
            if (pool is null) return null;

            maps = await _db.MapPoolMaps.AsNoTracking()
                .Where(pm => pm.MapPoolId == pool.Id)
                .OrderBy(pm => pm.OrderIndex)
                .Select(pm => pm.GameMapId)
                .ToListAsync(ct);
        }
        if (maps.Count == 0) return null;

        var firstPick = LobbyConfig.GetFirstPickTeam(lobby);
        var state = VetoEngine.Create(lobby.Game, requested ?? match.BestOf, maps, firstPick);
        if (existing is null)
        {
            existing = new VetoSession { Id = Guid.NewGuid(), MatchId = matchId };
            _db.VetoSessions.Add(existing);
        }

        WriteState(existing, state);
        if (state.IsComplete) PersistCompletion(match, state);
        await _db.SaveChangesAsync(ct);
        return state;
    }

    public async Task<VetoApplyResult> ApplyAsync(Guid matchId, VetoAction action, Guid mapId, TeamSide actingTeam, CancellationToken ct = default)
    {
        var session = await _db.VetoSessions.FirstOrDefaultAsync(v => v.MatchId == matchId, ct);
        if (session is null) return VetoApplyResult.Fail(new VetoState(), "no_session");

        var state = ReadState(session);
        var result = VetoEngine.Apply(state, action, mapId, actingTeam);
        if (!result.Ok) return result;

        WriteState(session, result.State);
        if (result.State.IsComplete)
        {
            var match = await _db.Matches.FirstOrDefaultAsync(m => m.Id == matchId, ct);
            if (match is not null) PersistCompletion(match, result.State);
        }

        await _db.SaveChangesAsync(ct);
        return result;
    }

    public async Task<VetoState?> GetStateAsync(Guid matchId, CancellationToken ct = default)
    {
        var session = await _db.VetoSessions.AsNoTracking().FirstOrDefaultAsync(v => v.MatchId == matchId, ct);
        return session is null ? null : ReadState(session);
    }

    public async Task<TeamSide> TeamForUserAsync(Guid matchId, Guid userId, CancellationToken ct = default)
    {
        var match = await _db.Matches.AsNoTracking().FirstOrDefaultAsync(m => m.Id == matchId, ct);
        if (match is null) return TeamSide.Unassigned;
        var member = await _db.LobbyMemberships.AsNoTracking()
            .FirstOrDefaultAsync(m => m.LobbyId == match.LobbyId && m.UserId == userId, ct);
        return member?.Team ?? TeamSide.Unassigned;
    }

    private static void WriteState(VetoSession session, VetoState state)
    {
        session.Phase = state.IsComplete ? VetoPhase.Completed : VetoPhase.Active;
        session.UpdatedAt = DateTime.UtcNow;
        session.Order = JsonSerializer.SerializeToDocument(state, JsonOpts);
        session.Picks = JsonSerializer.SerializeToDocument(state.Picks, JsonOpts);
        session.Bans = JsonSerializer.SerializeToDocument(state.Bans, JsonOpts);
    }

    private static VetoState ReadState(VetoSession session)
    {
        if (session.Order is null) return new VetoState();
        return JsonSerializer.Deserialize<VetoState>(session.Order.RootElement.GetRawText(), JsonOpts) ?? new VetoState();
    }

    private static void PersistCompletion(Match match, VetoState state)
    {
        match.Status = MatchStatus.Live;
        match.UpdatedAt = DateTime.UtcNow;
        MatchPayload.SetSelectedMapIds(match, state.Picks);
    }
}
