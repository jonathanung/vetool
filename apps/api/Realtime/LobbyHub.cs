using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using VeTool.Api.Contracts;
using VeTool.Api.Services.Matchmaking;
using VeTool.Api.Services.Realtime;
using VeTool.Domain.Enums;

namespace VeTool.Api.Realtime;

[Authorize]
public class LobbyHub : Hub
{
    private static readonly ConcurrentDictionary<string, HashSet<Guid>> ConnectionLobbies = new();
    private readonly ISequenceGenerator _seq;
    private readonly IIdempotencyService _idem;
    private readonly LobbyMembershipService _membership;
    private readonly LobbyChatService _chat;

    public LobbyHub(ISequenceGenerator seq, IIdempotencyService idem, LobbyMembershipService membership, LobbyChatService chat)
    {
        _seq = seq;
        _idem = idem;
        _membership = membership;
        _chat = chat;
    }

    private static string GroupFor(Guid lobbyId) => $"lobby:{lobbyId}";

    public async Task JoinLobby(Guid lobbyId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(lobbyId));
        var set = ConnectionLobbies.GetOrAdd(Context.ConnectionId, _ => new HashSet<Guid>());
        lock (set) { set.Add(lobbyId); }

        if (TryUserId(out var userId))
        {
            var outcome = await _membership.TryJoinAsync(lobbyId, userId);
            if (outcome == JoinOutcome.Expired)
            {
                await Clients.Caller.SendAsync("Error", new RealtimeEnvelope("Error", 0, DateTime.UtcNow, new ErrorEvent("expired", "This lobby expired.", null)));
                return;
            }
        }

        var seq = await _seq.NextLobbySequenceAsync(lobbyId);
        var snapshot = await _membership.GetRosterSnapshotAsync(lobbyId);
        await Clients.Caller.SendAsync("LobbySnapshot", new RealtimeEnvelope("LobbySnapshot", seq, DateTime.UtcNow, ShapeSnapshot(lobbyId, snapshot)));
        var history = await _chat.ListRecentAsync(lobbyId);
        await Clients.Caller.SendAsync("ChatHistory", new RealtimeEnvelope("ChatHistory", seq, DateTime.UtcNow, history));
        var payload = new UserJoinedEvent(lobbyId, userId);
        await Clients.OthersInGroup(GroupFor(lobbyId)).SendAsync("UserJoined", new RealtimeEnvelope("UserJoined", seq, DateTime.UtcNow, payload));
    }

    public async Task SendChat(Guid lobbyId, string text, string clientRequestId)
    {
        if (!await _idem.TryBeginAsync($"lobby:{lobbyId}:chat:{clientRequestId}", clientRequestId, TimeSpan.FromMinutes(2))) return;
        if (!TryUserId(out var userId) || userId == Guid.Empty)
        {
            await EmitError(lobbyId, "unauthorized", "Not signed in");
            return;
        }

        var posted = await _chat.PostAsync(lobbyId, userId, text);
        if (!posted.Ok || posted.Message is null)
        {
            var message = posted.Error switch
            {
                "empty" => "Message is empty.",
                "too_long" => "Message is too long.",
                "not_member" => "Join the lobby to chat.",
                "expired" => "This lobby expired.",
                _ => "Could not send message."
            };
            await EmitError(lobbyId, posted.Error ?? "chat_failed", message);
            return;
        }

        var seq = await _seq.NextLobbySequenceAsync(lobbyId);
        var evt = new ChatMessageEvent(
            posted.Message.Id,
            posted.Message.LobbyId,
            posted.Message.UserId,
            posted.Message.UserName,
            posted.Message.DisplayName,
            posted.Message.Body,
            posted.Message.CreatedAt);
        await Clients.Group(GroupFor(lobbyId)).SendAsync("ChatMessage", new RealtimeEnvelope("ChatMessage", seq, DateTime.UtcNow, evt));
    }

    public async Task LeaveLobby(Guid lobbyId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(lobbyId));
        if (ConnectionLobbies.TryGetValue(Context.ConnectionId, out var set))
        {
            lock (set) { set.Remove(lobbyId); }
        }
    }

    public async Task SetCaptains(Guid lobbyId, Guid teamAUserId, Guid teamBUserId, string clientRequestId)
    {
        if (!await _idem.TryBeginAsync($"lobby:{lobbyId}:captains", clientRequestId, TimeSpan.FromMinutes(2))) return;
        var snapshot = await _membership.SetCaptainsAsync(lobbyId, teamAUserId, teamBUserId);
        if (snapshot is null)
        {
            await EmitError(lobbyId, "invalid_captain", "Captain must be in lobby");
            return;
        }
        var seq = await _seq.NextLobbySequenceAsync(lobbyId);
        await Clients.Group(GroupFor(lobbyId)).SendAsync("CaptainsSet", new RealtimeEnvelope("CaptainsSet", seq, DateTime.UtcNow, new
        {
            lobbyId,
            teamAUserId,
            teamBUserId,
            captainA = teamAUserId,
            captainB = teamBUserId,
            teamA = snapshot.TeamA,
            teamB = snapshot.TeamB
        }));
        await Clients.Group(GroupFor(lobbyId)).SendAsync("LobbySnapshot", new RealtimeEnvelope("LobbySnapshot", seq, DateTime.UtcNow, ShapeSnapshot(lobbyId, snapshot)));
    }

    public async Task UpdateTeams(Guid lobbyId, List<Guid> teamA, List<Guid> teamB, string clientRequestId)
    {
        if (!await _idem.TryBeginAsync($"lobby:{lobbyId}:teams", clientRequestId, TimeSpan.FromMinutes(2))) return;
        var snapshot = await _membership.AssignTeamsAsync(lobbyId, teamA, teamB);
        if (snapshot is null)
        {
            await EmitError(lobbyId, "not_found", "Lobby not found");
            return;
        }
        var seq = await _seq.NextLobbySequenceAsync(lobbyId);
        await Clients.Group(GroupFor(lobbyId)).SendAsync("TeamsUpdated", new RealtimeEnvelope("TeamsUpdated", seq, DateTime.UtcNow, new
        {
            lobbyId,
            teamA = snapshot.TeamA,
            teamB = snapshot.TeamB
        }));
        await Clients.Group(GroupFor(lobbyId)).SendAsync("LobbySnapshot", new RealtimeEnvelope("LobbySnapshot", seq, DateTime.UtcNow, ShapeSnapshot(lobbyId, snapshot)));
    }

    public Task Heartbeat(Guid lobbyId) => Clients.Caller.SendAsync("Pong", new { lobbyId, ts = DateTime.UtcNow });

    private Task EmitError(Guid lobbyId, string code, string message) =>
        Clients.Group(GroupFor(lobbyId)).SendAsync("Error", new RealtimeEnvelope("Error", 0, DateTime.UtcNow, new ErrorEvent(code, message, null)));

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        TryUserId(out var userId);
        if (!ConnectionLobbies.TryRemove(Context.ConnectionId, out var lobbies) || lobbies.Count == 0)
        {
            await base.OnDisconnectedAsync(exception);
            return;
        }

        foreach (var lobbyId in lobbies)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(lobbyId));
            if (userId != Guid.Empty)
            {
                await _membership.OnHubDisconnectedAsync(lobbyId, userId);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private bool TryUserId(out Guid userId)
    {
        var userIdStr = Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value;
        return Guid.TryParse(userIdStr, out userId);
    }

    private static object ShapeSnapshot(Guid lobbyId, LobbyRosterSnapshot snapshot) => new
    {
        lobbyId,
        captainA = snapshot.CaptainA,
        captainB = snapshot.CaptainB,
        teamA = snapshot.TeamA,
        teamB = snapshot.TeamB,
        members = snapshot.Members.Select(m => new
        {
            userId = m.UserId,
            userName = m.UserName,
            displayName = m.DisplayName,
            role = m.Role.ToString(),
            team = LobbyMembershipService.TeamLabel(m.Team)
        })
    };
}
