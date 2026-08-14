using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace VeTool.Tests.Integration;

public class BasicApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public BasicApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder => builder.UseEnvironment("Testing"));
    }

    [Fact]
    public async Task Health_endpoint_works()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/health");
        res.EnsureSuccessStatusCode();
    }
} 