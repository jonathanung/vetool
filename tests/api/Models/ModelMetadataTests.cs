using System.Linq;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;

namespace VeTool.Tests.Models;

public class ModelMetadataTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public void LobbyMembership_has_unique_index_on_LobbyId_UserId()
    {
        using var db = CreateContext();
        var entity = db.Model.FindEntityType(typeof(VeTool.Domain.Entities.LobbyMembership));
        entity.Should().NotBeNull();
        var index = entity!.GetIndexes().SingleOrDefault(i => i.Properties.Select(p => p.Name).SequenceEqual(new[] { "LobbyId", "UserId" }));
        index.Should().NotBeNull();
        index!.IsUnique.Should().BeTrue();
    }

    [Fact]
    public void GameMap_has_unique_index_on_Game_Code()
    {
        using var db = CreateContext();
        var entity = db.Model.FindEntityType(typeof(VeTool.Domain.Entities.GameMap));
        entity.Should().NotBeNull();
        var index = entity!.GetIndexes().SingleOrDefault(i => i.IsUnique && i.Properties.Select(p => p.Name).SequenceEqual(new[] { "Game", "Code" }));
        index.Should().NotBeNull();
    }

    [Fact]
    public void ApplicationUser_has_unique_indexes_on_Email_and_UserName()
    {
        using var db = CreateContext();
        var entity = db.Model.GetEntityTypes().Single(t => t.ClrType.Name == "ApplicationUser");
        var emailIndex = entity.GetIndexes().SingleOrDefault(i => i.IsUnique && i.Properties.Any(p => p.Name == "Email"));
        var userNameIndex = entity.GetIndexes().SingleOrDefault(i => i.IsUnique && i.Properties.Any(p => p.Name == "UserName"));
        emailIndex.Should().NotBeNull();
        userNameIndex.Should().NotBeNull();
    }
} 