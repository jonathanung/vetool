using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;

namespace VeTool.Api.Services.Matchmaking;

public sealed record LobbyChatMessageView(
    Guid Id,
    Guid LobbyId,
    Guid UserId,
    string UserName,
    string DisplayName,
    string Body,
    DateTime CreatedAt);

public sealed record LobbyChatPostResult(bool Ok, string? Error, LobbyChatMessageView? Message)
{
    public static LobbyChatPostResult Fail(string error) => new(false, error, null);
    public static LobbyChatPostResult Success(LobbyChatMessageView message) => new(true, null, message);
}

public sealed class LobbyChatService
{
    public const int MaxBodyLength = 300;
    public const int HistoryLimit = 100;

    private readonly AppDbContext _db;

    public LobbyChatService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<LobbyChatPostResult> PostAsync(Guid lobbyId, Guid userId, string body, CancellationToken ct = default)
    {
        var text = (body ?? string.Empty).Trim();
        if (text.Length == 0) return LobbyChatPostResult.Fail("empty");
        if (text.Length > MaxBodyLength) return LobbyChatPostResult.Fail("too_long");

        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == lobbyId, ct);
        if (lobby is null) return LobbyChatPostResult.Fail("not_found");
        if (!LobbyLifetime.IsLive(lobby, DateTime.UtcNow)) return LobbyChatPostResult.Fail("expired");

        var seated = await _db.LobbyMemberships.AnyAsync(
            m => m.LobbyId == lobbyId && m.UserId == userId && m.LeftAt == null, ct);
        if (!seated) return LobbyChatPostResult.Fail("not_member");

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return LobbyChatPostResult.Fail("not_member");

        var row = new LobbyChatMessage
        {
            Id = Guid.NewGuid(),
            LobbyId = lobbyId,
            UserId = userId,
            Body = text,
            CreatedAt = DateTime.UtcNow
        };
        _db.LobbyChatMessages.Add(row);
        await _db.SaveChangesAsync(ct);

        return LobbyChatPostResult.Success(new LobbyChatMessageView(
            row.Id,
            lobbyId,
            userId,
            user.UserName ?? string.Empty,
            user.DisplayName ?? user.UserName ?? "Player",
            row.Body,
            row.CreatedAt));
    }

    public async Task<IReadOnlyList<LobbyChatMessageView>> ListRecentAsync(Guid lobbyId, int take = HistoryLimit, CancellationToken ct = default)
    {
        var limit = Math.Clamp(take, 1, HistoryLimit);
        var rows = await (
            from m in _db.LobbyChatMessages.AsNoTracking()
            join u in _db.Users.AsNoTracking() on m.UserId equals u.Id
            where m.LobbyId == lobbyId
            orderby m.CreatedAt descending
            select new LobbyChatMessageView(
                m.Id,
                m.LobbyId,
                m.UserId,
                u.UserName ?? string.Empty,
                u.DisplayName ?? u.UserName ?? "Player",
                m.Body,
                m.CreatedAt)
        ).Take(limit).ToListAsync(ct);

        rows.Reverse();
        return rows;
    }
}
