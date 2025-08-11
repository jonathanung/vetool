using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;

namespace VeTool.Api.Tools;

public static class DbHealthCheck
{
    public static async Task<int> VerifyAsync(AppDbContext db, CancellationToken ct = default)
    {
        try
        {
            // Ensure we can connect and basic query works
            var canConnect = await db.Database.CanConnectAsync(ct);
            if (!canConnect) return 2;
            _ = await db.Database.ExecuteSqlRawAsync("select 1", ct);
            return 0;
        }
        catch
        {
            return 1;
        }
    }
} 