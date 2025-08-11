using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Seeds;

public static class SeedData
{
    public static async Task EnsureSeedAsync(AppDbContext db)
    {
        await db.Database.MigrateAsync();

        // Ensure a demo user exists to satisfy FK constraints
        var demoUser = await db.Users.FirstOrDefaultAsync();
        if (demoUser == null)
        {
            demoUser = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = "demo",
                NormalizedUserName = "DEMO",
                Email = "demo@example.com",
                NormalizedEmail = "DEMO@EXAMPLE.COM",
                EmailConfirmed = true,
                DisplayName = "Demo User",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Users.Add(demoUser);
        }

        if (!await db.Maps.AnyAsync())
        {
            db.Maps.AddRange(
                new GameMap { Id = Guid.NewGuid(), Game = Game.Cs2, Code = "ancient", Name = "Ancient", IsActive = true },
                new GameMap { Id = Guid.NewGuid(), Game = Game.Cs2, Code = "anubis", Name = "Anubis", IsActive = true },
                new GameMap { Id = Guid.NewGuid(), Game = Game.Val, Code = "ascent", Name = "Ascent", IsActive = true }
            );
        }

        if (!await db.Lobbies.AnyAsync())
        {
            var lobbyId = Guid.NewGuid();
            var lobby = new Lobby { Id = lobbyId, Game = Game.Cs2, Name = "Demo Lobby", Status = LobbyStatus.Open, CreatedByUserId = demoUser.Id };
            db.Lobbies.Add(lobby);
            db.LobbyMemberships.Add(new LobbyMembership { Id = Guid.NewGuid(), LobbyId = lobbyId, UserId = demoUser.Id, Role = LobbyRole.Owner, Team = TeamSide.Unassigned });
        }

        await db.SaveChangesAsync();
    }
} 