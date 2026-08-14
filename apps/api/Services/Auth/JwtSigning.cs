using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace VeTool.Api.Services.Auth;

public sealed class JwtSigningMaterial
{
    public JwtSigningMaterial(SecurityKey key, string algorithm)
    {
        Key = key;
        Algorithm = algorithm;
    }

    public SecurityKey Key { get; }
    public string Algorithm { get; }
}

public static class JwtSigning
{
    public static JwtSigningMaterial Create(IConfiguration? configuration = null)
    {
        var secret = FirstNonEmpty(
            Environment.GetEnvironmentVariable("JWT__Secret"),
            Environment.GetEnvironmentVariable("JWT__Key"),
            Environment.GetEnvironmentVariable("Jwt__Secret"),
            configuration?["JWT:Secret"],
            configuration?["Jwt:Secret"],
            configuration?["JWT:Key"]);

        if (!string.IsNullOrWhiteSpace(secret) && secret.Length >= 16)
        {
            var bytes = Encoding.UTF8.GetBytes(secret);
            return new JwtSigningMaterial(
                new SymmetricSecurityKey(bytes) { KeyId = "hs256" },
                SecurityAlgorithms.HmacSha256);
        }

        var path = FirstNonEmpty(
            Environment.GetEnvironmentVariable("JWT_KEY_PATH"),
            configuration?["JWT:KeyPath"]) ?? Path.Combine(AppContext.BaseDirectory, "keys", "jwt-rsa.pem");

        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        var rsa = RSA.Create(2048);
        if (File.Exists(path))
        {
            rsa.ImportFromPem(File.ReadAllText(path));
        }
        else
        {
            File.WriteAllText(path, rsa.ExportRSAPrivateKeyPem());
        }

        return new JwtSigningMaterial(
            new RsaSecurityKey(rsa) { KeyId = "rsa" },
            SecurityAlgorithms.RsaSha256);
    }

    private static string? FirstNonEmpty(params string?[] values)
        => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
}
