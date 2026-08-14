using FluentAssertions;

namespace VeTool.Tests.Ui;

public class RemoteAccessTests
{
    private static string RepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "docker-compose.yml")))
                return dir.FullName;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("docker-compose.yml");
    }

    [Fact]
    public void Compose_publishes_web_on_ipv4_and_ipv6_and_does_not_point_browsers_at_localhost_api()
    {
        var compose = File.ReadAllText(Path.Combine(RepoRoot(), "docker-compose.yml"));
        var portLines = compose.Split('\n').Where(l => l.Contains("3000:") || l.Contains("NEXT_PUBLIC_API_BASE")).ToList();
        portLines.Should().NotContain(l => l.Contains("\"0.0.0.0:3000:3000\""),
            "an IPv4-only publish makes Tailscale/MagicDNS IPv6 fetch fail on a remote Mac");
        compose.Should().Contain("\"3000:3000\"");
        portLines.Should().NotContain(l => l.Contains("NEXT_PUBLIC_API_BASE") && l.Contains("localhost"));
        compose.Should().Contain("API_BASE_INTERNAL=http://api:8080");
    }

    [Fact]
    public void Signup_and_config_use_same_origin_api_not_localhost()
    {
        var web = Path.Combine(RepoRoot(), "apps", "web", "src");
        var signup = File.ReadAllText(Path.Combine(web, "app", "signup", "page.tsx"));
        var config = File.ReadAllText(Path.Combine(web, "lib", "config.ts"));
        signup.Should().Contain("getApiBase()");
        signup.Should().NotContain("localhost:5001");
        config.Should().Contain("return '/api/v1'");
        config.Should().Contain("typeof window === 'undefined'");
    }
}
