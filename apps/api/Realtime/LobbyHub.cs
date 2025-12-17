using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Contracts;
using VeTool.Api.Services.Realtime;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Realtime;

[Authorize]
public class LobbyHub : Hub
{
    private static readonly ConcurrentDictionary<string, HashSet<Guid>> ConnectionLobbies = new();
    private readonly AppDbContext _db;
    private readonly ISequenceGenerator _seq;
    private readonly IIdempotencyService _idem;

    public LobbyHub(AppDbContext db, ISequenceGenerator seq, IIdempotencyService idem)
    {
        _db = db;
        _seq = seq;
        _idem = idem;
    }

    private static string GroupFor(Guid lobbyId) => $"lobby:{lobbyId}";

    public async Task JoinLobby(Guid lobbyId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(lobbyId));
        var set = ConnectionLobbies.GetOrAdd(Context.ConnectionId, _ => new HashSet<Guid>());
        lock (set) { set.Add(lobbyId); }
        var seq = await _seq.NextLobbySequenceAsync(lobbyId);
        var payload = new UserJoinedEvent(lobbyId, Guid.Parse(Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value ?? Guid.Empty.ToString()));
        await Clients.Group(GroupFor(lobbyId)).SendAsync("UserJoined", new RealtimeEnvelope("UserJoined", seq, DateTime.UtcNow, payload));
    }

    public async Task LeaveLobby(Guid lobbyId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(lobbyId));
        if (ConnectionLobbies.TryGetValue(Context.ConnectionId, out var set))
        {
            lock (set) { set.Remove(lobbyId); }
        }
        var seq = await _seq.NextLobbySequenceAsync(lobbyId);
        var payload = new UserLeftEvent(lobbyId, Guid.Parse(Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value ?? Guid.Empty.ToString()));
        await Clients.Group(GroupFor(lobbyId)).SendAsync("UserLeft", new RealtimeEnvelope("UserLeft", seq, DateTime.UtcNow, payload));
    }

    public async Task SetCaptains(Guid lobbyId, Guid teamAUserId, Guid teamBUserId, string clientRequestId)
    {
        if (!await _idem.TryBeginAsync($"lobby:{lobbyId}:captains", clientRequestId, TimeSpan.FromMinutes(2))) return;
        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == lobbyId);
        if (lobby is null) { await EmitError(lobbyId, "not_found", "Lobby not found"); return; }
        var a = await _db.LobbyMemberships.FirstOrDefaultAsync(m => m.LobbyId == lobbyId && m.UserId == teamAUserId);
        var b = await _db.LobbyMemberships.FirstOrDefaultAsync(m => m.LobbyId == lobbyId && m.UserId == teamBUserId);
        if (a is null || b is null) { await EmitError(lobbyId, "invalid_captain", "Captain must be in lobby"); return; }
        a.Role = LobbyRole.Captain; a.Team = TeamSide.A;
        b.Role = LobbyRole.Captain; b.Team = TeamSide.B;
        await _db.SaveChangesAsync();
        var seq = await _seq.NextLobbySequenceAsync(lobbyId);
        var payload = new CaptainsSetEvent(lobbyId, teamAUserId, teamBUserId);
        await Clients.Group(GroupFor(lobbyId)).SendAsync("CaptainsSet", new RealtimeEnvelope("CaptainsSet", seq, DateTime.UtcNow, payload));
    }

    public async Task UpdateTeams(Guid lobbyId, List<Guid> teamA, List<Guid> teamB, string clientRequestId)
    {
        if (!await _idem.TryBeginAsync($"lobby:{lobbyId}:teams", clientRequestId, TimeSpan.FromMinutes(2))) return;
        var members = await _db.LobbyMemberships.Where(m => m.LobbyId == lobbyId).ToListAsync();
        var setA = new HashSet<Guid>(teamA);
        var setB = new HashSet<Guid>(teamB);
        foreach (var m in members)
        {
            if (setA.Contains(m.UserId)) m.Team = TeamSide.A;
            else if (setB.Contains(m.UserId)) m.Team = TeamSide.B;
            else m.Team = TeamSide.Unassigned;
        }
        await _db.SaveChangesAsync();
        var seq = await _seq.NextLobbySequenceAsync(lobbyId);
        var payload = new TeamsUpdatedEvent(lobbyId, teamA, teamB);
        await Clients.Group(GroupFor(lobbyId)).SendAsync("TeamsUpdated", new RealtimeEnvelope("TeamsUpdated", seq, DateTime.UtcNow, payload));
    }

    public Task Heartbeat(Guid lobbyId) => Clients.Caller.SendAsync("Pong", new { lobbyId, ts = DateTime.UtcNow });

    private Task EmitError(Guid lobbyId, string code, string message) =>
        Clients.Group(GroupFor(lobbyId)).SendAsync("Error", new RealtimeEnvelope("Error", 0, DateTime.UtcNow, new ErrorEvent(code, message, null)));

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdStr = Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value;
        if (userIdStr is null || !Guid.TryParse(userIdStr, out var userId))
        {
            await base.OnDisconnectedAsync(exception);
            return;
        }

        if (!ConnectionLobbies.TryRemove(Context.ConnectionId, out var lobbies) || lobbies.Count == 0)
        {
            await base.OnDisconnectedAsync(exception);
            return;
        }

        var toSave = false;
        foreach (var lobbyId in lobbies)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(lobbyId));
            var membership = await _db.LobbyMemberships.FirstOrDefaultAsync(m => m.LobbyId == lobbyId && m.UserId == userId);
            if (membership is not null)
            {
                _db.LobbyMemberships.Remove(membership);
                toSave = true;
            }
            var seq = await _seq.NextLobbySequenceAsync(lobbyId);
            var payload = new UserLeftEvent(lobbyId, userId);
            await Clients.Group(GroupFor(lobbyId)).SendAsync("UserLeft", new RealtimeEnvelope("UserLeft", seq, DateTime.UtcNow, payload));
        }

        if (toSave)
        {
            await _db.SaveChangesAsync();
        }

        await base.OnDisconnectedAsync(exception);
    }
} 