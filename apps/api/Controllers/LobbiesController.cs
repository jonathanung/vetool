using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using System.Text.Json;
using VeTool.Api.Options;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class LobbiesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RsaSecurityKey _signingKey;
    private readonly JwtCookieOptions _cookieOptions;

    public LobbiesController(AppDbContext db, UserManager<ApplicationUser> userManager, RsaSecurityKey signingKey, IOptions<JwtCookieOptions> cookieOptions)
    {
        _db = db;
        _userManager = userManager;
        _signingKey = signingKey;
        _cookieOptions = cookieOptions.Value;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateLobbyRequest req)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var existing = await _db.Lobbies.FirstOrDefaultAsync(l => l.CreatedByUserId == userId && l.Status != LobbyStatus.Completed);
        if (existing is not null) return Conflict(new { message = "You already own a lobby." });

        var lobby = new Lobby
        {
            Id = Guid.NewGuid(),
            Game = req.Game,
            Name = req.Name,
            CreatedByUserId = userId,
            Status = LobbyStatus.Open,
            MaxPlayers = req.MaxPlayers ?? 10,
            Settings = JsonDocument.Parse($"{{\"isPublic\":{(req.IsPublic ? "true" : "false")}}}")
        };
        _db.Lobbies.Add(lobby);
        _db.LobbyMemberships.Add(new LobbyMembership { Id = Guid.NewGuid(), LobbyId = lobby.Id, UserId = userId, Role = LobbyRole.Owner });
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = lobby.Id }, lobby);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var lobby = await _db.Lobbies.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        return lobby is null ? NotFound() : Ok(lobby);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? game, [FromQuery] LobbyStatus? status, [FromQuery] string? mine = null)
    {
        var q = _db.Lobbies.AsNoTracking().AsQueryable();

        // Parse game filter - accept string like "cs2", "val", "Cs2", "Val", "0", "1"
        if (!string.IsNullOrEmpty(game))
        {
            Game? parsedGame = game.ToLowerInvariant() switch
            {
                "cs2" or "0" => Game.Cs2,
                "val" or "1" => Game.Val,
                _ => Enum.TryParse<Game>(game, ignoreCase: true, out var g) ? g : null
            };
            if (parsedGame.HasValue)
            {
                q = q.Where(l => l.Game == parsedGame.Value);
            }
        }

        if (status.HasValue) q = q.Where(l => l.Status == status);

        // allow mine=true or mine=1
        var mineRequested = mine is not null && (mine.Equals("true", StringComparison.OrdinalIgnoreCase) || mine == "1");

        var userIdStr = User.Identity?.IsAuthenticated == true ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null;
        if (mineRequested && userIdStr is null) return Unauthorized();

        Guid? uid = null;
        if (userIdStr is not null && Guid.TryParse(userIdStr, out var parsed))
        {
            uid = parsed;
        }

        if (mineRequested && uid.HasValue)
        {
            q = q.Where(l => l.CreatedByUserId == uid.Value);
        }

        var list = await q.OrderByDescending(l => l.UpdatedAt).Take(50).ToListAsync();

        if (uid is null)
        {
            list = list.Where(IsPublic).ToList();
        }
        else
        {
            list = list.Where(l => IsPublic(l) || l.CreatedByUserId == uid.Value).ToList();
        }

        var shaped = list.Select(l => new
        {
            l.Id,
            l.Name,
            l.Game,
            l.Status,
            l.CreatedByUserId,
            l.MaxPlayers,
            IsPublic = IsPublic(l),
            IsMine = uid.HasValue && l.CreatedByUserId == uid.Value
        });

        return Ok(shaped);
    }

    [HttpGet("{id:guid}/members")]
    public async Task<IActionResult> Members(Guid id)
    {
        var members = await _db.LobbyMemberships.AsNoTracking()
            .Where(m => m.LobbyId == id)
            .Join(_db.Users, m => m.UserId, u => u.Id, (m, u) => new
            {
                m.UserId,
                u.UserName,
                u.DisplayName,
                m.Role,
                m.Team
            })
            .ToListAsync();
        return Ok(members);
    }

    [Authorize]
    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> Join(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var exists = await _db.LobbyMemberships.AnyAsync(m => m.LobbyId == id && m.UserId == userId);
        if (exists) return Ok(new { joined = true });

        try
        {
            _db.LobbyMemberships.Add(new LobbyMembership { Id = Guid.NewGuid(), LobbyId = id, UserId = userId, Role = LobbyRole.Member });
            await _db.SaveChangesAsync();
            return Ok(new { joined = true });
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException p && p.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            // Idempotent: membership already exists due to concurrent join requests
            return Ok(new { joined = true, duplicate = true });
        }
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

    [AllowAnonymous]
    [HttpPost("{id:guid}/guest")]
    public async Task<IActionResult> Guest(Guid id)
    {
        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == id);
        if (lobby is null) return NotFound();

        var (user, _) = await CreateGuestUserAsync();

        var membership = await _db.LobbyMemberships.FirstOrDefaultAsync(m => m.LobbyId == id && m.UserId == user.Id);
        if (membership is null)
        {
            _db.LobbyMemberships.Add(new LobbyMembership { Id = Guid.NewGuid(), LobbyId = id, UserId = user.Id, Role = LobbyRole.Member });
            await _db.SaveChangesAsync();
        }

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
            Expires = DateTimeOffset.UtcNow.AddDays(1),
            IsEssential = true
        });
        return Ok(new { userId = user.Id, username = user.UserName, displayName = user.DisplayName, guest = true });
    }

    [Authorize]
    [HttpPost("{id:guid}/leave")]
    public async Task<IActionResult> Leave(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var membership = await _db.LobbyMemberships.FirstOrDefaultAsync(m => m.LobbyId == id && m.UserId == userId);
        if (membership is null) return NotFound();
        _db.LobbyMemberships.Remove(membership);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == id && l.CreatedByUserId == userId);
        if (lobby is null) return NotFound();
        _db.Lobbies.Remove(lobby);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static bool IsPublic(Lobby lobby)
    {
        try
        {
            if (lobby.Settings is null) return true;
            using var doc = lobby.Settings;
            if (doc.RootElement.TryGetProperty("isPublic", out var prop))
            {
                return prop.GetBoolean();
            }
            return true;
        }
        catch
        {
            return true;
        }
    }
}

public record CreateLobbyRequest(Game Game, string Name, int? MaxPlayers, bool IsPublic);