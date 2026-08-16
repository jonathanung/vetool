using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Matchmaking;

public sealed class LobbyExpiryService
{
    private readonly AppDbContext _db;

    public LobbyExpiryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<int> SweepAsync(DateTime nowUtc, CancellationToken ct = default)
    {
        var expired = await _db.Lobbies
            .Where(l => l.ExpiresAt <= nowUtc || l.Status == LobbyStatus.Expired)
            .ToListAsync(ct);
        if (expired.Count == 0) return 0;

        var ids = expired.Select(l => l.Id).ToList();
        var chats = await _db.LobbyChatMessages.Where(m => ids.Contains(m.LobbyId)).ToListAsync(ct);
        _db.LobbyChatMessages.RemoveRange(chats);
        _db.Lobbies.RemoveRange(expired);
        await _db.SaveChangesAsync(ct);
        return expired.Count;
    }
}
