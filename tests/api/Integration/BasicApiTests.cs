using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using VeTool.Api.Controllers;

namespace VeTool.Tests.Integration;

public class BasicApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public BasicApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(_ => { });
    }

    [Fact]
    public async Task Health_endpoint_works()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/health");
        res.EnsureSuccessStatusCode();
    }
} 