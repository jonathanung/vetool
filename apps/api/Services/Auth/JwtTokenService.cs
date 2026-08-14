using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using VeTool.Domain.Entities;

namespace VeTool.Api.Services.Auth;

public interface IJwtTokenService
{
    SecurityKey ValidationKey { get; }
    string CreateToken(ApplicationUser user, TimeSpan? lifetime = null);
}

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly JwtSigningMaterial _material;

    public JwtTokenService(JwtSigningMaterial material)
    {
        _material = material;
    }

    public SecurityKey ValidationKey => _material.Key;

    public string CreateToken(ApplicationUser user, TimeSpan? lifetime = null)
    {
        var handler = new JwtSecurityTokenHandler();
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.UserName ?? string.Empty)
            }),
            Expires = DateTime.UtcNow.Add(lifetime ?? TimeSpan.FromHours(8)),
            SigningCredentials = new SigningCredentials(_material.Key, _material.Algorithm)
        };
        return handler.WriteToken(handler.CreateToken(descriptor));
    }
}
