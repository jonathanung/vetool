using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace VeTool.Tests.Integration;

public class LobbyHttpTests : IClassFixture<VetoolApiFactory>
{
    private readonly VetoolApiFactory _factory;
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    public LobbyHttpTests(VetoolApiFactory factory)
    {
        _factory = factory;
        _factory.ResetDatabase();
    }

    [Fact]
    public async Task Health_and_authenticated_create_join_and_match_read()
    {
        var host = _factory.CreateClient();
        var health = await host.GetAsync("/api/v1/health");
        health.EnsureSuccessStatusCode();
        var healthBody = await health.Content.ReadAsStringAsync();
        healthBody.Should().Contain("ok");

        var cookieHost = await RegisterAndLoginAsync(host, "http-host", "http-host@example.com");
        var create = await cookieHost.PostAsJsonAsync("/api/v1/lobbies", new
        {
            game = 0,
            name = "HTTP CI Lobby",
            maxPlayers = 10,
            isPublic = true
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var lobby = await create.Content.ReadFromJsonAsync<JsonElement>(Json);
        var lobbyId = lobby.GetProperty("id").GetGuid();
        lobby.GetProperty("name").GetString().Should().Be("HTTP CI Lobby");

        var guest = _factory.CreateClient();
        await RegisterAndLoginAsync(guest, "http-joiner", "http-joiner@example.com");
        var join = await guest.PostAsync($"/api/v1/lobbies/{lobbyId}/join", null);
        join.EnsureSuccessStatusCode();
        var joinBody = await join.Content.ReadFromJsonAsync<JsonElement>(Json);
        joinBody.GetProperty("joined").GetBoolean().Should().BeTrue();

        var members = await guest.GetFromJsonAsync<JsonElement>($"/api/v1/lobbies/{lobbyId}/members");
        members.GetArrayLength().Should().BeGreaterThanOrEqualTo(2);
        var names = members.EnumerateArray().Select(m => m.GetProperty("userName").GetString()).ToList();
        names.Should().Contain("http-host");
        names.Should().Contain("http-joiner");

        var blocked = await cookieHost.PostAsJsonAsync($"/api/v1/lobbies/{lobbyId}/matches", new { bestOf = 1 });
        blocked.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var hostId = (await cookieHost.GetFromJsonAsync<JsonElement>("/api/v1/auth/me")).GetProperty("id").GetGuid();
        var joinerId = (await guest.GetFromJsonAsync<JsonElement>("/api/v1/auth/me")).GetProperty("id").GetGuid();
        var captains = await cookieHost.PostAsJsonAsync($"/api/v1/lobbies/{lobbyId}/captains", new
        {
            teamAUserId = hostId,
            teamBUserId = joinerId
        });
        captains.EnsureSuccessStatusCode();

        var start = await cookieHost.PostAsJsonAsync($"/api/v1/lobbies/{lobbyId}/matches", new { bestOf = 1 });
        start.EnsureSuccessStatusCode();
        var match = await start.Content.ReadFromJsonAsync<JsonElement>(Json);
        var matchId = match.GetProperty("id").GetGuid();

        var read = await guest.GetAsync($"/api/v1/matches/{matchId}");
        read.EnsureSuccessStatusCode();
        var summary = await read.Content.ReadFromJsonAsync<JsonElement>(Json);
        summary.GetProperty("game").GetString().Should().Be("cs2");
        var maps = summary.GetProperty("maps");
        maps.GetArrayLength().Should().BeGreaterThan(0);
        maps.EnumerateArray().Should().OnlyContain(m =>
            !string.IsNullOrWhiteSpace(m.GetProperty("name").GetString()) &&
            m.GetProperty("name").GetString() != m.GetProperty("id").GetString());
    }

    [Fact]
    public async Task Parallel_double_join_does_not_duplicate_membership()
    {
        var host = _factory.CreateClient();
        await RegisterAndLoginAsync(host, "race-host", "race-host@example.com");
        var created = await host.PostAsJsonAsync("/api/v1/lobbies", new
        {
            game = 0,
            name = "Race Lobby",
            maxPlayers = 10,
            isPublic = true
        });
        created.EnsureSuccessStatusCode();
        var lobbyId = (await created.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();

        var joiner = _factory.CreateClient();
        await RegisterAndLoginAsync(joiner, "race-joiner", "race-joiner@example.com");

        var first = joiner.PostAsync($"/api/v1/lobbies/{lobbyId}/join", null);
        var second = joiner.PostAsync($"/api/v1/lobbies/{lobbyId}/join", null);
        var results = await Task.WhenAll(first, second);
        results.Should().OnlyContain(r => r.IsSuccessStatusCode);

        var members = await host.GetFromJsonAsync<JsonElement>($"/api/v1/lobbies/{lobbyId}/members");
        var joinerRows = members.EnumerateArray()
            .Count(m => m.GetProperty("userName").GetString() == "race-joiner");
        joinerRows.Should().Be(1);
    }

    private static async Task<HttpClient> RegisterAndLoginAsync(HttpClient client, string username, string email)
    {
        var register = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            username,
            password = "Passw0rd!",
            displayName = username
        });
        register.EnsureSuccessStatusCode();

        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            usernameOrEmail = username,
            password = "Passw0rd!"
        });
        login.EnsureSuccessStatusCode();
        return client;
    }
}
