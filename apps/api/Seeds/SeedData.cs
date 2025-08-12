using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace VeTool.Api.Seeds;

public static class SeedData
{
    public static async Task EnsureSeedAsync(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        await db.Database.MigrateAsync();

        // Ensure demo user exists with a valid password
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
        else
        {
            // If user exists but no password, set one
            if (string.IsNullOrEmpty(demoUser.PasswordHash))
            {
                var addPw = await userManager.AddPasswordAsync(demoUser, "DemoPass123!");
                if (!addPw.Succeeded)
                {
                    throw new Exception("Failed to set demo user password: " + string.Join(", ", addPw.Errors.Select(e => e.Description)));
                }
            }
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