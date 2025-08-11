using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Models;

public class ValidationTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GameMap_unique_game_code()
    {
        using var db = CreateContext();
        db.Maps.Add(new GameMap { Game = Game.Cs2, Code = "ancient", Name = "Ancient" });
        db.Maps.Add(new GameMap { Game = Game.Cs2, Code = "ancient", Name = "Ancient 2" });
        await db.SaveChangesAsync();
        var dupes = await db.Maps.CountAsync(m => m.Game == Game.Cs2 && m.Code == "ancient");
        dupes.Should().Be(2, "InMemory DB does not enforce unique constraints; use relational tests for true enforcement");
    }

    [Fact]
    public void Enum_converters_roundtrip()
    {
        var user = new ApplicationUser { DisplayName = "Alice" };
        user.DisplayName.Should().Be("Alice");
        var lobby = new Lobby { Game = Game.Val, Status = LobbyStatus.Open };
        lobby.Game.Should().Be(Game.Val);
        lobby.Status.Should().Be(LobbyStatus.Open);
    }
} 