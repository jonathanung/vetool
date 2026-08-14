using FluentAssertions;

namespace VeTool.Tests.Ui;

public class UiSurfaceTests
{
    private static string WebRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "apps", "web", "src");
            if (Directory.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("apps/web/src");
    }

    private static string Read(params string[] parts)
        => File.ReadAllText(Path.Combine(new[] { WebRoot() }.Concat(parts).ToArray()));

    [Fact]
    public void Required_pages_exist_and_expose_lobby_match_and_game_surfaces()
    {
        File.Exists(Path.Combine(WebRoot(), "app", "page.tsx")).Should().BeTrue();
        File.Exists(Path.Combine(WebRoot(), "app", "login", "page.tsx")).Should().BeTrue();
        File.Exists(Path.Combine(WebRoot(), "app", "signup", "page.tsx")).Should().BeTrue();
        File.Exists(Path.Combine(WebRoot(), "app", "lobbies", "page.tsx")).Should().BeTrue();
        File.Exists(Path.Combine(WebRoot(), "app", "lobbies", "[id]", "page.tsx")).Should().BeTrue();
        File.Exists(Path.Combine(WebRoot(), "app", "matches", "[id]", "page.tsx")).Should().BeTrue();

        var home = Read("app", "page.tsx");
        home.Should().Contain("CS2");
        home.Should().Contain("VALORANT");

        var lobbies = Read("app", "lobbies", "page.tsx");
        lobbies.Should().Contain("cs2");
        lobbies.Should().Contain("val");

        var create = Read("app", "lobbies", "CreateLobbyForm.tsx");
        create.Should().Contain("cs2");
        create.Should().Contain("val");
        create.Should().Contain("1v1");
        create.Should().Contain("5v5");

        var lobbyPage = Read("app", "lobbies", "[id]", "page.tsx");
        lobbyPage.Should().Contain("normalizeTeam");
        lobbyPage.Should().NotContain("m.team === 'A' || m.team === 'B'");

        var teams = Read("lib", "teams.ts");
        teams.Should().Contain("v === 'b'");
        teams.Should().Contain("v === 'a'");

        var lobby = Read("app", "lobbies", "[id]", "realtime.tsx");
        lobby.Should().Contain("Copy link");
        lobby.Should().Contain("Start match");
        lobby.Should().Contain("Leave");
        lobby.Should().Contain("Captain Selection");

        var match = Read("app", "matches", "[id]", "VetoClient.tsx");
        match.Should().Contain("Join details");
        match.Should().Contain("Selected maps");
        match.Should().Contain("bento-card");

        var board = Read("components", "veto", "MapVetoBoard.tsx");
        board.Should().Contain("Available Maps");
        board.Should().Contain("Picked");
        board.Should().Contain("Banned");
    }
}
