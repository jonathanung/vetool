using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.Catalog;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Seeds;

public static class SeedData
{
    public static async Task EnsureSeedAsync(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        await db.Database.MigrateAsync();

        var demoUser = await userManager.FindByNameAsync("demo");
        if (demoUser == null)
        {
            demoUser = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = "demo",
                NormalizedUserName = "DEMO",
                Email = "demo@example.com",
                NormalizedEmail = "DEMO@EXAMPLE.COM",
                DisplayName = "Demo User",
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var createResult = await userManager.CreateAsync(demoUser, "DemoPass123!");
            if (!createResult.Succeeded)
            {
                throw new Exception("Failed to seed demo user: " + string.Join(", ", createResult.Errors.Select(e => e.Description)));
            }
        }
        else if (string.IsNullOrEmpty(demoUser.PasswordHash))
        {
            var addPw = await userManager.AddPasswordAsync(demoUser, "DemoPass123!");
            if (!addPw.Succeeded)
            {
                throw new Exception("Failed to set demo user password: " + string.Join(", ", addPw.Errors.Select(e => e.Description)));
            }
        }

        await EnsureMapsAndPoolsAsync(db);

        if (!await db.Lobbies.AnyAsync())
        {
            var lobbyId = Guid.NewGuid();
            db.Lobbies.Add(new Lobby
            {
                Id = lobbyId,
                Game = Game.Cs2,
                Name = "Demo Lobby",
                Status = LobbyStatus.Open,
                CreatedByUserId = demoUser.Id,
                MaxPlayers = 10
            });
            db.LobbyMemberships.Add(new LobbyMembership
            {
                Id = Guid.NewGuid(),
                LobbyId = lobbyId,
                UserId = demoUser.Id,
                Role = LobbyRole.Owner,
                Team = TeamSide.Unassigned
            });
        }

        await db.SaveChangesAsync();
    }

    public static async Task EnsureMapsAndPoolsAsync(AppDbContext db)
    {
        await UpsertGame(db, Game.Cs2, "Active Duty", CompetitiveMaps.Cs2);
        await UpsertGame(db, Game.Val, "Competitive", CompetitiveMaps.Val);
    }

    private static async Task UpsertGame(AppDbContext db, Game game, string label, IReadOnlyList<CompetitiveMapDef> defs)
    {
        var existingMaps = await db.Maps.Where(m => m.Game == game).ToListAsync();
        var byCode = existingMaps.ToDictionary(m => m.Code, StringComparer.OrdinalIgnoreCase);
        foreach (var def in defs)
        {
            if (byCode.TryGetValue(def.Code, out var map))
            {
                if (!string.Equals(map.Name, def.Name, StringComparison.Ordinal))
                {
                    map.Name = def.Name;
                    map.IsActive = true;
                }
            }
            else
            {
                var created = new GameMap
                {
                    Id = Guid.NewGuid(),
                    Game = game,
                    Code = def.Code,
                    Name = def.Name,
                    IsActive = true
                };
                db.Maps.Add(created);
                byCode[def.Code] = created;
            }
        }

        await db.SaveChangesAsync();

        var pool = await db.MapPools
            .Where(p => p.Game == game)
            .OrderByDescending(p => p.EffectiveAt)
            .FirstOrDefaultAsync();

        if (pool is null)
        {
            pool = new MapPool
            {
                Id = Guid.NewGuid(),
                Game = game,
                Label = label,
                Source = MapPoolSource.Manual,
                EffectiveAt = DateTime.UtcNow
            };
            db.MapPools.Add(pool);
            await db.SaveChangesAsync();
        }

        var linked = await db.MapPoolMaps.Where(pm => pm.MapPoolId == pool.Id).ToListAsync();
        var linkedIds = linked.Select(pm => pm.GameMapId).ToHashSet();
        var order = linked.Count == 0 ? 0 : linked.Max(pm => pm.OrderIndex) + 1;
        foreach (var def in defs)
        {
            var map = byCode[def.Code];
            if (linkedIds.Contains(map.Id)) continue;
            db.MapPoolMaps.Add(new MapPoolMap
            {
                Id = Guid.NewGuid(),
                MapPoolId = pool.Id,
                GameMapId = map.Id,
                OrderIndex = order++
            });
        }
    }
}
