using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Matchmaking;

public enum JoinOutcome
{
    Joined,
    AlreadyMember,
    NotFound,
    Full
}

public sealed record LobbyMemberView(Guid UserId, string UserName, string? DisplayName, LobbyRole Role, TeamSide Team);

public sealed record LobbyRosterSnapshot(
    IReadOnlyList<LobbyMemberView> Members,
    Guid? CaptainA,
    Guid? CaptainB,
    IReadOnlyList<Guid> TeamA,
    IReadOnlyList<Guid> TeamB);

public sealed class LobbyMembershipService
{
    private readonly AppDbContext _db;

    public LobbyMembershipService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<JoinOutcome> TryJoinAsync(Guid lobbyId, Guid userId, CancellationToken ct = default)
    {
        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == lobbyId, ct);
        if (lobby is null) return JoinOutcome.NotFound;

        var existing = await _db.LobbyMemberships.FirstOrDefaultAsync(m => m.LobbyId == lobbyId && m.UserId == userId, ct);
        if (existing is not null)
        {
            if (existing.LeftAt is not null)
            {
                existing.LeftAt = null;
                existing.JoinedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
            }
            return JoinOutcome.AlreadyMember;
        }

        var count = await _db.LobbyMemberships.CountAsync(m => m.LobbyId == lobbyId && m.LeftAt == null, ct);
        if (count >= lobby.MaxPlayers) return JoinOutcome.Full;

        _db.LobbyMemberships.Add(new LobbyMembership
        {
            Id = Guid.NewGuid(),
            LobbyId = lobbyId,
            UserId = userId,
            Role = LobbyRole.Member,
            Team = TeamSide.Unassigned
        });

        try
        {
            await _db.SaveChangesAsync(ct);
            return JoinOutcome.Joined;
        }
        catch (DbUpdateException)
        {
            return JoinOutcome.AlreadyMember;
        }
    }

    public async Task<bool> LeaveAsync(Guid lobbyId, Guid userId, CancellationToken ct = default)
    {
        var membership = await _db.LobbyMemberships.FirstOrDefaultAsync(m => m.LobbyId == lobbyId && m.UserId == userId, ct);
        if (membership is null) return false;
        _db.LobbyMemberships.Remove(membership);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Hub disconnect / page refresh must not drop membership. Only <see cref="LeaveAsync"/> does.
    /// </summary>
    public Task OnHubDisconnectedAsync(Guid lobbyId, Guid userId, CancellationToken ct = default)
        => Task.CompletedTask;

    public async Task<IReadOnlyList<LobbyMemberView>> GetMembersAsync(Guid lobbyId, CancellationToken ct = default)
    {
        return await _db.LobbyMemberships.AsNoTracking()
            .Where(m => m.LobbyId == lobbyId && m.LeftAt == null)
            .Join(_db.Users, m => m.UserId, u => u.Id, (m, u) => new LobbyMemberView(
                m.UserId,
                u.UserName ?? string.Empty,
                u.DisplayName,
                m.Role,
                m.Team))
            .ToListAsync(ct);
    }

    public async Task<LobbyRosterSnapshot?> SetCaptainsAsync(Guid lobbyId, Guid teamAUserId, Guid teamBUserId, CancellationToken ct = default)
    {
        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == lobbyId, ct);
        if (lobby is null) return null;
        var a = await _db.LobbyMemberships.FirstOrDefaultAsync(m => m.LobbyId == lobbyId && m.UserId == teamAUserId && m.LeftAt == null, ct);
        var b = await _db.LobbyMemberships.FirstOrDefaultAsync(m => m.LobbyId == lobbyId && m.UserId == teamBUserId && m.LeftAt == null, ct);
        if (a is null || b is null) return null;

        foreach (var member in await _db.LobbyMemberships.Where(m => m.LobbyId == lobbyId && m.Role == LobbyRole.Captain).ToListAsync(ct))
        {
            if (member.UserId != lobby.CreatedByUserId) member.Role = LobbyRole.Member;
        }

        a.Role = a.UserId == lobby.CreatedByUserId ? LobbyRole.Owner : LobbyRole.Captain;
        a.Team = TeamSide.A;
        b.Role = b.UserId == lobby.CreatedByUserId ? LobbyRole.Owner : LobbyRole.Captain;
        b.Team = TeamSide.B;
        await _db.SaveChangesAsync(ct);
        return await GetRosterSnapshotAsync(lobbyId, ct);
    }

    public async Task<LobbyRosterSnapshot?> AssignTeamsAsync(Guid lobbyId, IReadOnlyList<Guid> teamA, IReadOnlyList<Guid> teamB, CancellationToken ct = default)
    {
        var lobby = await _db.Lobbies.AsNoTracking().FirstOrDefaultAsync(l => l.Id == lobbyId, ct);
        if (lobby is null) return null;

        var members = await _db.LobbyMemberships.Where(m => m.LobbyId == lobbyId && m.LeftAt == null).ToListAsync(ct);
        var setA = new HashSet<Guid>(teamA);
        var setB = new HashSet<Guid>(teamB);

        foreach (var member in members)
        {
            if (setA.Contains(member.UserId))
            {
                member.Team = TeamSide.A;
                continue;
            }
            if (setB.Contains(member.UserId))
            {
                member.Team = TeamSide.B;
                continue;
            }
            if (IsCaptainSeat(member))
            {
                continue;
            }
            member.Team = TeamSide.Unassigned;
        }

        await _db.SaveChangesAsync(ct);
        return await GetRosterSnapshotAsync(lobbyId, ct);
    }

    public async Task<LobbyRosterSnapshot> GetRosterSnapshotAsync(Guid lobbyId, CancellationToken ct = default)
    {
        var members = await GetMembersAsync(lobbyId, ct);
        var teamA = members.Where(m => m.Team == TeamSide.A).Select(m => m.UserId).ToList();
        var teamB = members.Where(m => m.Team == TeamSide.B).Select(m => m.UserId).ToList();
        var captainA = members.FirstOrDefault(m => m.Team == TeamSide.A && m.Role != LobbyRole.Member)?.UserId;
        var captainB = members.FirstOrDefault(m => m.Team == TeamSide.B && m.Role != LobbyRole.Member)?.UserId;
        return new LobbyRosterSnapshot(members, captainA, captainB, teamA, teamB);
    }

    public static bool IsCaptainSeat(LobbyMembership member)
        => member.Team is TeamSide.A or TeamSide.B && member.Role is LobbyRole.Captain or LobbyRole.Owner;

    public static string TeamLabel(TeamSide team) => team switch
    {
        TeamSide.A => "A",
        TeamSide.B => "B",
        _ => "Unassigned"
    };
}
