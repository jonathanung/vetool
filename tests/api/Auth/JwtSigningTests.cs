using FluentAssertions;
using Microsoft.IdentityModel.Tokens;
using VeTool.Api.Services.Auth;

namespace VeTool.Tests.Auth;

public class JwtSigningTests
{
    [Fact]
    public void Shared_secret_produces_the_same_hmac_key_across_calls()
    {
        var previous = Environment.GetEnvironmentVariable("JWT__Secret");
        try
        {
            Environment.SetEnvironmentVariable("JWT__Secret", "vetool-durable-signing-secret-32chars");
            var first = JwtSigning.Create();
            var second = JwtSigning.Create();
            first.Algorithm.Should().Be(SecurityAlgorithms.HmacSha256);
            second.Algorithm.Should().Be(SecurityAlgorithms.HmacSha256);
            first.Key.Should().BeOfType<SymmetricSecurityKey>();
            ((SymmetricSecurityKey)first.Key).Key.Should().Equal(((SymmetricSecurityKey)second.Key).Key);
        }
        finally
        {
            Environment.SetEnvironmentVariable("JWT__Secret", previous);
        }
    }
}
