using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Matchmaking;

public sealed record MapView(Guid Id, string Code, string Name);

public sealed record RosterPlayerView(Guid UserId, string UserName, string? DisplayName, LobbyRole Role, TeamSide Team);

public sealed record VetoView(
    string Mode,
    int StepIndex,
    string NextTeam,
    string? NextAction,
    bool IsComplete,
    IReadOnlyList<Guid> Available,
    IReadOnlyList<Guid> Picks,
    IReadOnlyList<Guid> Bans);

public sealed record MatchSummary(
    Guid Id,
    Guid LobbyId,
    int BestOf,
    string Game,
    string Status,
    string? JoinDetails,
    Guid CreatedByUserId,
    IReadOnlyList<MapView> Maps,
    IReadOnlyList<MapView> SelectedMaps,
    IReadOnlyList<RosterPlayerView> TeamA,
    IReadOnlyList<RosterPlayerView> TeamB,
    VetoView? Veto);

public sealed class MatchLifecycleService
{
    private readonly AppDbContext _db;
    private readonly VetoSessionService _veto;

    public MatchLifecycleService(AppDbContext db, VetoSessionService veto)
    {
        _db = db;
        _veto = veto;
    }

    public async Task<Match?> StartFromLobbyAsync(Guid lobbyId, Guid userId, BestOf bestOf, CancellationToken ct = default)
    {
        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == lobbyId, ct);
        if (lobby is null) return null;
        if (lobby.CreatedByUserId != userId) throw new UnauthorizedAccessException();

        var existing = await _db.Matches.FirstOrDefaultAsync(
            m => m.LobbyId == lobbyId && m.Status != MatchStatus.Canceled && m.Status != MatchStatus.Completed, ct);
        if (existing is not null) return existing;

        var match = new Match
        {
            Id = Guid.NewGuid(),
            LobbyId = lobbyId,
            BestOf = bestOf,
            Status = MatchStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Matches.Add(match);
        lobby.Status = LobbyStatus.InProgress;
        lobby.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return match;
    }

    public async Task<MatchSummary?> GetSummaryAsync(Guid matchId, CancellationToken ct = default)
    {
        var match = await _db.Matches.AsNoTracking().FirstOrDefaultAsync(m => m.Id == matchId, ct);
        if (match is null) return null;
        var lobby = await _db.Lobbies.AsNoTracking().FirstOrDefaultAsync(l => l.Id == match.LobbyId, ct);
        if (lobby is null) return null;

        var pool = await _db.MapPools.AsNoTracking()
            .Where(p => p.Game == lobby.Game)
            .OrderByDescending(p => p.EffectiveAt)
            .FirstOrDefaultAsync(ct);

        var maps = new List<MapView>();
        if (pool is not null)
        {
            maps = await _db.MapPoolMaps.AsNoTracking()
                .Where(pm => pm.MapPoolId == pool.Id)
                .Join(_db.Maps, pm => pm.GameMapId, m => m.Id, (pm, m) => new { m.Id, m.Code, m.Name, pm.OrderIndex })
                .OrderBy(x => x.OrderIndex)
                .Select(x => new MapView(x.Id, x.Code, x.Name))
                .ToListAsync(ct);
        }

        var mapById = maps.ToDictionary(m => m.Id);
        var extraIds = new HashSet<Guid>();
        var selectedIds = MatchPayload.GetSelectedMapIds(match).ToList();
        if (selectedIds.Count == 0 && match.SelectedMapId is Guid selected)
        {
            selectedIds.Add(selected);
        }

        var veto = await _veto.GetStateAsync(matchId, ct);
        if (veto is not null)
        {
            foreach (var id in veto.Picks.Concat(veto.Bans).Concat(veto.Available)) extraIds.Add(id);
            if (veto.Picks.Count > 0) selectedIds = veto.Picks.ToList();
        }

        foreach (var id in selectedIds) extraIds.Add(id);
        var missing = extraIds.Where(id => !mapById.ContainsKey(id)).ToList();
        if (missing.Count > 0)
        {
            var extras = await _db.Maps.AsNoTracking()
                .Where(m => missing.Contains(m.Id))
                .Select(m => new MapView(m.Id, m.Code, m.Name))
                .ToListAsync(ct);
            foreach (var extra in extras) mapById[extra.Id] = extra;
            maps.AddRange(extras);
        }

        MapView Named(Guid id) => mapById.TryGetValue(id, out var view) ? view : new MapView(id, id.ToString("N")[..8], "Unknown");

        var members = await _db.LobbyMemberships.AsNoTracking()
            .Where(m => m.LobbyId == lobby.Id && m.LeftAt == null)
            .Join(_db.Users, m => m.UserId, u => u.Id, (m, u) => new RosterPlayerView(
                m.UserId,
                u.UserName ?? string.Empty,
                u.DisplayName,
                m.Role,
                m.Team))
            .ToListAsync(ct);

        VetoView? vetoView = null;
        if (veto is not null)
        {
            var nextAction = veto.IsComplete || veto.CurrentKind is null or VetoStepKind.AutoPick
                ? null
                : veto.CurrentKind.ToString()!.ToLowerInvariant();
            vetoView = new VetoView(
                veto.Mode,
                veto.StepIndex,
                veto.NextTeam == TeamSide.B ? "B" : veto.NextTeam == TeamSide.A ? "A" : "None",
                nextAction,
                veto.IsComplete,
                veto.Available,
                veto.Picks,
                veto.Bans);
        }

        return new MatchSummary(
            match.Id,
            match.LobbyId,
            (int)match.BestOf,
            lobby.Game == Game.Val ? "val" : "cs2",
            match.Status.ToString(),
            MatchPayload.GetJoinDetails(match),
            lobby.CreatedByUserId,
            maps,
            selectedIds.Select(Named).ToList(),
            members.Where(m => m.Team == TeamSide.A).ToList(),
            members.Where(m => m.Team == TeamSide.B).ToList(),
            vetoView);
    }

    public async Task<bool> SetJoinDetailsAsync(Guid matchId, Guid userId, string? details, CancellationToken ct = default)
    {
        var match = await _db.Matches.FirstOrDefaultAsync(m => m.Id == matchId, ct);
        if (match is null) return false;
        var lobby = await _db.Lobbies.AsNoTracking().FirstOrDefaultAsync(l => l.Id == match.LobbyId, ct);
        if (lobby is null || lobby.CreatedByUserId != userId) return false;
        MatchPayload.SetJoinDetails(match, string.IsNullOrWhiteSpace(details) ? null : details.Trim());
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Guid?> CurrentMatchIdAsync(Guid lobbyId, CancellationToken ct = default)
    {
        var match = await _db.Matches.AsNoTracking()
            .Where(m => m.LobbyId == lobbyId && m.Status != MatchStatus.Canceled)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync(ct);
        return match?.Id;
    }
}
