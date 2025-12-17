using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using VeTool.Api.Options;
using VeTool.Domain.Entities;

namespace VeTool.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly RsaSecurityKey _signingKey;
    private readonly JwtCookieOptions _cookieOptions;
    private readonly AuthOptions _authOptions;

    public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, RsaSecurityKey signingKey, IOptions<JwtCookieOptions> cookieOptions, IOptions<AuthOptions> authOptions)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _signingKey = signingKey;
        _cookieOptions = cookieOptions.Value;
        _authOptions = authOptions.Value;
    }

    private static readonly string[] GuestWords = new[]
    {
        "alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliet","kilo","lima","mike","november","oscar","papa","quebec","romeo","sierra","tango","uniform","victor","whiskey","xray","yankee","zulu",
        "red","blue","green","yellow","orange","purple","silver","gold","scarlet","crimson","azure","indigo","violet","cyan",
        "wolf","lion","tiger","eagle","hawk","falcon","otter","badger","bear","shark","whale","dolphin","panda","koala",
        "river","mountain","valley","forest","meadow","ocean","desert","canyon","island","harbor","summit","ridge","coast",
        "swift","silent","brisk","bright","calm","clever","bold","lucky","gentle","mighty","rapid","steady","wild","brave"
    };

    private static string RandomGuestSlug()
    {
        Span<byte> bytes = stackalloc byte[8];
        RandomNumberGenerator.Fill(bytes);
        var words = new string[4];
        for (int i = 0; i < 4; i++)
        {
            var idx = BitConverter.ToUInt16(bytes.Slice(i * 2, 2)) % (uint)GuestWords.Length;
            words[i] = GuestWords[idx];
        }
        return string.Join("_", words);
    }

    private async Task<(ApplicationUser user, string password)> CreateGuestUserAsync()
    {
        for (int attempt = 0; attempt < 5; attempt++)
        {
            var slug = RandomGuestSlug();
            var existing = await _userManager.FindByNameAsync(slug);
            if (existing != null) continue;
            var user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = slug,
                DisplayName = slug,
                Email = $"{slug}@guest.local",
                EmailConfirmed = true
            };
            var password = $"Guest!{Guid.NewGuid():N}";
            var result = await _userManager.CreateAsync(user, password);
            if (result.Succeeded)
            {
                return (user, password);
            }
        }
        throw new Exception("Failed to create guest user after retries");
    }

    [AllowAnonymous]
    [HttpPost("guest")]
    public async Task<IActionResult> Guest()
    {
        var (user, _) = await CreateGuestUserAsync();
        var token = CreateJwt(user);
        var forwardedProto = Request.Headers["X-Forwarded-Proto"].ToString();
        var isHttps = Request.IsHttps || string.Equals(forwardedProto, "https", StringComparison.OrdinalIgnoreCase);
        string? cookieDomain = string.IsNullOrWhiteSpace(_cookieOptions.Domain) ? null : _cookieOptions.Domain?.Trim();
        if (!string.IsNullOrEmpty(cookieDomain))
        {
            if (cookieDomain.Contains('/') || cookieDomain.Contains(':') || cookieDomain.Equals("localhost", StringComparison.OrdinalIgnoreCase))
            {
                cookieDomain = null;
            }
        }
        Response.Cookies.Append(_cookieOptions.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = isHttps,
            Domain = cookieDomain,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(2),
            IsEssential = true
        });
        return Ok(new { userId = user.Id, username = user.UserName, displayName = user.DisplayName, guest = true });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Username,
            Email = request.Email,
            DisplayName = request.DisplayName ?? request.Username,
            EmailConfirmed = !_authOptions.RequireEmailConfirmation
        };
        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded) return BadRequest(result.Errors);
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        return Ok(new { message = "Registered.", verificationToken = token, userId = user.Id });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByNameAsync(request.UsernameOrEmail) ?? await _userManager.FindByEmailAsync(request.UsernameOrEmail);
        if (user == null) return Unauthorized();
        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid) return Unauthorized();
        if (_authOptions.RequireEmailConfirmation && !user.EmailConfirmed) return Forbid();

        var token = CreateJwt(user);

        // Determine if request is effectively HTTPS (consider reverse proxies)
        var forwardedProto = Request.Headers["X-Forwarded-Proto"].ToString();
        var isHttps = Request.IsHttps || string.Equals(forwardedProto, "https", StringComparison.OrdinalIgnoreCase);

        // Sanitize domain: only apply if it's a valid hostname (no scheme/port), and not localhost
        string? cookieDomain = string.IsNullOrWhiteSpace(_cookieOptions.Domain) ? null : _cookieOptions.Domain?.Trim();
        if (!string.IsNullOrEmpty(cookieDomain))
        {
            if (cookieDomain.Contains('/') || cookieDomain.Contains(':') || cookieDomain.Equals("localhost", StringComparison.OrdinalIgnoreCase))
            {
                cookieDomain = null;
            }
        }

        Response.Cookies.Append(_cookieOptions.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = isHttps,
            Domain = cookieDomain,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            IsEssential = true // Important for GDPR compliance and ensures cookie is always set
        });
        return Ok(new { userId = user.Id, username = user.UserName, displayName = user.DisplayName });
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        var cookieName = _cookieOptions.CookieName;
        Response.Cookies.Delete(cookieName, new CookieOptions { Path = "/" });
        return Ok(new { ok = true });
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        var user = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (user == null) return NotFound();
        var res = await _userManager.ConfirmEmailAsync(user, request.Token);
        return res.Succeeded ? Ok() : BadRequest(res.Errors);
    }

    [HttpPost("request-password-reset")]
    public async Task<IActionResult> RequestPasswordReset([FromBody] RequestPasswordResetRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return Ok();
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        return Ok(new { token });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (user == null) return NotFound();
        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        return result.Succeeded ? Ok() : BadRequest(result.Errors);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var user = await _userManager.FindByIdAsync(userIdStr);
        if (user == null) return Unauthorized();
        return Ok(new { id = user.Id, userName = user.UserName, displayName = user.DisplayName, email = user.Email, avatarUrl = user.AvatarUrl });
    }

    private string CreateJwt(ApplicationUser user)
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
            Expires = DateTime.UtcNow.AddHours(8),
            SigningCredentials = new SigningCredentials(_signingKey, SecurityAlgorithms.RsaSha256)
        };
        var token = handler.CreateToken(descriptor);
        return handler.WriteToken(token);
    }
}

public record RegisterRequest(string Email, string Username, string Password, string? DisplayName);
public record LoginRequest(string UsernameOrEmail, string Password);
public record VerifyEmailRequest(Guid UserId, string Token);
public record RequestPasswordResetRequest(string Email);
public record ResetPasswordRequest(Guid UserId, string Token, string NewPassword); 