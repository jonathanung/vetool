using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VeTool.Api.Options;
using VeTool.Api.Services.Auth;
using VeTool.Api.Services.Matchmaking;
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
    private readonly IJwtTokenService _jwt;
    private readonly JwtCookieOptions _cookieOptions;
    private readonly LobbyMembershipService _membership;
    private readonly MatchLifecycleService _matches;
    private readonly LobbyChatService _chat;

    public LobbiesController(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        IJwtTokenService jwt,
        IOptions<JwtCookieOptions> cookieOptions,
        LobbyMembershipService membership,
        MatchLifecycleService matches,
        LobbyChatService chat)
    {
        _db = db;
        _userManager = userManager;
        _jwt = jwt;
        _cookieOptions = cookieOptions.Value;
        _membership = membership;
        _matches = matches;
        _chat = chat;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateLobbyRequest req)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var now = DateTime.UtcNow;
        var existing = await _db.Lobbies.FirstOrDefaultAsync(l =>
            l.CreatedByUserId == userId &&
            l.Status != LobbyStatus.Completed &&
            l.Status != LobbyStatus.Expired &&
            l.ExpiresAt > now);
        if (existing is not null) return Conflict(new { message = "You already own a lobby." });

        var maxPlayers = req.MaxPlayers ?? 10;
        if (maxPlayers < 2 || maxPlayers > 10) return BadRequest(new { message = "Max players must be between 2 and 10." });

        var createdAt = DateTime.UtcNow;
        var lobby = new Lobby
        {
            Id = Guid.NewGuid(),
            Game = req.Game,
            Name = string.IsNullOrWhiteSpace(req.Name) ? "Scrim" : req.Name.Trim(),
            CreatedByUserId = userId,
            Status = LobbyStatus.Open,
            MaxPlayers = maxPlayers,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            ExpiresAt = LobbyLifetime.ExpiresAt(createdAt),
            Settings = JsonDocument.Parse($"{{\"isPublic\":{(req.IsPublic ? "true" : "false")}}}")
        };
        _db.Lobbies.Add(lobby);
        _db.LobbyMemberships.Add(new LobbyMembership { Id = Guid.NewGuid(), LobbyId = lobby.Id, UserId = userId, Role = LobbyRole.Owner });
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = lobby.Id }, await ShapeLobby(lobby, userId));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var lobby = await _db.Lobbies.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (lobby is null) return NotFound();
        var userIdStr = User.Identity?.IsAuthenticated == true ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null;
        Guid? uid = Guid.TryParse(userIdStr, out var parsed) ? parsed : null;
        return Ok(await ShapeLobby(lobby, uid));
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? game, [FromQuery] LobbyStatus? status, [FromQuery] string? mine = null)
    {
        var q = _db.Lobbies.AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(game))
        {
            Game? parsedGame = game.ToLowerInvariant() switch
            {
                "cs2" or "0" => Game.Cs2,
                "val" or "valorant" or "1" => Game.Val,
                _ => Enum.TryParse<Game>(game, ignoreCase: true, out var g) ? g : null
            };
            if (parsedGame.HasValue) q = q.Where(l => l.Game == parsedGame.Value);
        }

        var now = DateTime.UtcNow;
        q = q.Where(l => l.ExpiresAt > now && l.Status != LobbyStatus.Expired);
        if (status.HasValue) q = q.Where(l => l.Status == status);

        var mineRequested = mine is not null && (mine.Equals("true", StringComparison.OrdinalIgnoreCase) || mine == "1");
        var userIdStr = User.Identity?.IsAuthenticated == true ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null;
        if (mineRequested && userIdStr is null) return Unauthorized();

        Guid? uid = null;
        if (userIdStr is not null && Guid.TryParse(userIdStr, out var parsed)) uid = parsed;

        if (mineRequested && uid.HasValue)
        {
            q = q.Where(l => l.CreatedByUserId == uid.Value);
        }

        List<Lobby> list;
        if (uid.HasValue && !mineRequested)
        {
            var myLobbies = await q.Where(l => l.CreatedByUserId == uid.Value).OrderByDescending(l => l.UpdatedAt).ToListAsync();
            var otherLobbies = await q.Where(l => l.CreatedByUserId != uid.Value).OrderByDescending(l => l.UpdatedAt).Take(50).ToListAsync();
            otherLobbies = otherLobbies.Where(IsPublic).ToList();
            list = myLobbies.Concat(otherLobbies).ToList();
        }
        else if (uid is null)
        {
            var allLobbies = await q.OrderByDescending(l => l.UpdatedAt).Take(100).ToListAsync();
            list = allLobbies.Where(IsPublic).Take(50).ToList();
        }
        else
        {
            list = await q.OrderByDescending(l => l.UpdatedAt).Take(50).ToListAsync();
        }

        var ids = list.Select(l => l.Id).ToList();
        var counts = await _db.LobbyMemberships.AsNoTracking()
            .Where(m => ids.Contains(m.LobbyId) && m.LeftAt == null)
            .GroupBy(m => m.LobbyId)
            .Select(g => new { LobbyId = g.Key, Count = g.Count() })
            .ToListAsync();
        var countById = counts.ToDictionary(c => c.LobbyId, c => c.Count);

        var shaped = list.Select(l => new
        {
            l.Id,
            l.Name,
            l.Game,
            l.Status,
            l.CreatedByUserId,
            l.MaxPlayers,
            MemberCount = countById.GetValueOrDefault(l.Id),
            IsPublic = IsPublic(l),
            IsMine = uid.HasValue && l.CreatedByUserId == uid.Value,
            l.CreatedAt,
            l.ExpiresAt,
            Expired = !LobbyLifetime.IsLive(l, now)
        });

        return Ok(shaped);
    }

    [HttpGet("{id:guid}/members")]
    public async Task<IActionResult> Members(Guid id)
    {
        var exists = await _db.Lobbies.AsNoTracking().AnyAsync(l => l.Id == id);
        if (!exists) return NotFound();
        var members = await _membership.GetMembersAsync(id);
        return Ok(members.Select(m => new
        {
            userId = m.UserId,
            userName = m.UserName,
            displayName = m.DisplayName,
            role = m.Role.ToString(),
            team = LobbyMembershipService.TeamLabel(m.Team)
        }));
    }

    [HttpGet("{id:guid}/messages")]
    public async Task<IActionResult> Messages(Guid id)
    {
        var exists = await _db.Lobbies.AsNoTracking().AnyAsync(l => l.Id == id);
        if (!exists) return NotFound();
        return Ok(await _chat.ListRecentAsync(id));
    }

    [Authorize]
    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> PostMessage(Guid id, [FromBody] LobbyChatRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var posted = await _chat.PostAsync(id, userId, req.Body ?? string.Empty);
        if (!posted.Ok || posted.Message is null)
        {
            return posted.Error switch
            {
                "not_found" => NotFound(new { message = "Lobby not found." }),
                "expired" => StatusCode(StatusCodes.Status410Gone, new { message = "This lobby expired." }),
                "not_member" => Forbid(),
                "empty" => BadRequest(new { message = "Message is empty." }),
                "too_long" => BadRequest(new { message = "Message is too long." }),
                _ => BadRequest(new { message = "Could not send message." })
            };
        }
        return Ok(posted.Message);
    }

    [Authorize]
    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> Join(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var outcome = await _membership.TryJoinAsync(id, userId);
        return outcome switch
        {
            JoinOutcome.NotFound => NotFound(new { message = "Lobby not found." }),
            JoinOutcome.Expired => StatusCode(StatusCodes.Status410Gone, new { message = "This lobby expired." }),
            JoinOutcome.Full => Conflict(new { message = "Lobby is full." }),
            JoinOutcome.AlreadyMember => Ok(new { joined = true, alreadyMember = true }),
            _ => Ok(new { joined = true })
        };
    }

    [AllowAnonymous]
    [HttpPost("{id:guid}/guest")]
    public async Task<IActionResult> Guest(Guid id)
    {
        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == id);
        if (lobby is null) return NotFound(new { message = "Lobby not found." });
        if (!LobbyLifetime.IsLive(lobby, DateTime.UtcNow))
            return StatusCode(StatusCodes.Status410Gone, new { message = "This lobby expired." });

        var count = await _db.LobbyMemberships.CountAsync(m => m.LobbyId == id && m.LeftAt == null);
        if (count >= lobby.MaxPlayers) return Conflict(new { message = "Lobby is full." });

        var (user, _) = await CreateGuestUserAsync();
        var outcome = await _membership.TryJoinAsync(id, user.Id);
        if (outcome == JoinOutcome.Full) return Conflict(new { message = "Lobby is full." });
        if (outcome == JoinOutcome.NotFound) return NotFound(new { message = "Lobby not found." });

        AppendJwtCookie(_jwt.CreateToken(user), DateTimeOffset.UtcNow.AddDays(1));
        return Ok(new { userId = user.Id, username = user.UserName, displayName = user.DisplayName, guest = true });
    }

    [Authorize]
    [HttpPost("{id:guid}/leave")]
    public async Task<IActionResult> Leave(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var left = await _membership.LeaveAsync(id, userId);
        return left ? Ok(new { left = true }) : NotFound();
    }

    [Authorize]
    [HttpPost("{id:guid}/matches")]
    public async Task<IActionResult> StartMatch(Guid id, [FromBody] StartMatchRequest? req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var bestOf = req?.BestOf switch
        {
            3 => BestOf.Bo3,
            5 => BestOf.Bo5,
            _ => BestOf.Bo1
        };
        try
        {
            var started = await _matches.StartFromLobbyAsync(id, userId, bestOf);
            if (!started.Succeeded)
            {
                return started.Error switch
                {
                    "not_found" => NotFound(new { message = "Lobby not found." }),
                    "expired" => StatusCode(StatusCodes.Status410Gone, new { message = "This lobby expired." }),
                    MatchStartGate.NeedTwoPlayers => Conflict(new { message = "Need at least two players." }),
                    MatchStartGate.NeedTwoCaptains => Conflict(new { message = "Need two captains before veto." }),
                    _ => Conflict(new { message = started.Error })
                };
            }
            var summary = await _matches.GetSummaryAsync(started.Match!.Id);
            return Ok(summary);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [Authorize]
    [HttpPost("{id:guid}/captains")]
    public async Task<IActionResult> SetCaptains(Guid id, [FromBody] SetCaptainsRequest req)
    {
        var snapshot = await _membership.SetCaptainsAsync(id, req.TeamAUserId, req.TeamBUserId);
        if (snapshot is null) return BadRequest(new { message = "Captains must be in the lobby." });
        return Ok(new { captainA = snapshot.CaptainA, captainB = snapshot.CaptainB, teamA = snapshot.TeamA, teamB = snapshot.TeamB });
    }

    [Authorize]
    [HttpPut("{id:guid}/first-pick")]
    public async Task<IActionResult> SetFirstPick(Guid id, [FromBody] FirstPickRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == id);
        if (lobby is null) return NotFound();
        if (lobby.CreatedByUserId != userId) return Forbid();
        var team = string.Equals(req.Team, "B", StringComparison.OrdinalIgnoreCase) ? TeamSide.B : TeamSide.A;
        var maps = LobbyConfig.GetSelectedMapIds(lobby);
        LobbyConfig.Write(lobby, LobbyConfig.GetIsPublic(lobby), team, maps);
        await _db.SaveChangesAsync();
        return Ok(new { firstPickTeam = team == TeamSide.B ? "B" : "A" });
    }

    [Authorize]
    [HttpPut("{id:guid}/maps")]
    public async Task<IActionResult> SetMaps(Guid id, [FromBody] LobbyMapsRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var lobby = await _db.Lobbies.FirstOrDefaultAsync(l => l.Id == id);
        if (lobby is null) return NotFound();
        if (lobby.CreatedByUserId != userId) return Forbid();
        var ids = (req.MapIds ?? []).Distinct().ToList();
        if (ids.Count == 0) return BadRequest(new { message = "Select at least one map." });
        var valid = await _db.Maps.AsNoTracking()
            .Where(m => m.Game == lobby.Game && ids.Contains(m.Id))
            .Select(m => m.Id)
            .ToListAsync();
        if (valid.Count != ids.Count) return BadRequest(new { message = "Unknown map for this game." });
        LobbyConfig.Write(lobby, LobbyConfig.GetIsPublic(lobby), LobbyConfig.GetFirstPickTeam(lobby), ids);
        await _db.SaveChangesAsync();
        return Ok(await ShapeLobby(lobby, userId));
    }

    [HttpGet("{id:guid}/maps")]
    public async Task<IActionResult> Maps(Guid id)
    {
        var lobby = await _db.Lobbies.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (lobby is null) return NotFound();
        var catalog = await _db.Maps.AsNoTracking()
            .Where(m => m.Game == lobby.Game)
            .OrderBy(m => m.Name)
            .Select(m => new { m.Id, m.Code, m.Name })
            .ToListAsync();
        var selected = LobbyConfig.GetSelectedMapIds(lobby);
        if (selected.Count == 0)
        {
            var pool = await _db.MapPools.AsNoTracking()
                .Where(p => p.Game == lobby.Game)
                .OrderByDescending(p => p.EffectiveAt)
                .FirstOrDefaultAsync();
            if (pool is not null)
            {
                selected = await _db.MapPoolMaps.AsNoTracking()
                    .Where(pm => pm.MapPoolId == pool.Id)
                    .OrderBy(pm => pm.OrderIndex)
                    .Select(pm => pm.GameMapId)
                    .ToListAsync();
            }
        }
        var selectedSet = selected.ToHashSet();
        return Ok(new
        {
            firstPickTeam = LobbyConfig.GetFirstPickTeam(lobby) == TeamSide.B ? "B" : "A",
            selected = catalog.Where(m => selectedSet.Contains(m.Id)),
            catalog
        });
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

    private async Task<object> ShapeLobby(Lobby lobby, Guid? uid)
    {
        var seats = await _db.LobbyMemberships.AsNoTracking()
            .Where(m => m.LobbyId == lobby.Id && m.LeftAt == null)
            .Select(m => new { m.Role, m.Team })
            .ToListAsync();
        var memberCount = seats.Count;
        var canStart = MatchStartGate.CanStart(seats.Select(s => (s.Role, s.Team)), out var startBlock);
        var matchId = await _matches.CurrentMatchIdAsync(lobby.Id);
        return new
        {
            lobby.Id,
            lobby.Name,
            lobby.Game,
            lobby.Status,
            lobby.CreatedByUserId,
            lobby.MaxPlayers,
            MemberCount = memberCount,
            CurrentMatchId = matchId,
            FirstPickTeam = LobbyConfig.GetFirstPickTeam(lobby) == TeamSide.B ? "B" : "A",
            SelectedMapIds = LobbyConfig.GetSelectedMapIds(lobby),
            CanStart = canStart,
            StartBlock = startBlock,
            IsPublic = IsPublic(lobby),
            IsMine = uid.HasValue && lobby.CreatedByUserId == uid.Value,
            lobby.CreatedAt,
            lobby.ExpiresAt,
            Expired = !LobbyLifetime.IsLive(lobby, DateTime.UtcNow)
        };
    }

    private static readonly string[] GuestWords =
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
            if (result.Succeeded) return (user, password);
        }
        throw new Exception("Failed to create guest user after retries");
    }

    private void AppendJwtCookie(string token, DateTimeOffset expires)
    {
        var forwardedProto = Request.Headers["X-Forwarded-Proto"].ToString();
        var isHttps = Request.IsHttps || string.Equals(forwardedProto, "https", StringComparison.OrdinalIgnoreCase);
        string? cookieDomain = string.IsNullOrWhiteSpace(_cookieOptions.Domain) ? null : _cookieOptions.Domain.Trim();
        if (!string.IsNullOrEmpty(cookieDomain) &&
            (cookieDomain.Contains('/') || cookieDomain.Contains(':') || cookieDomain.Equals("localhost", StringComparison.OrdinalIgnoreCase)))
        {
            cookieDomain = null;
        }
        Response.Cookies.Append(_cookieOptions.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = isHttps,
            Domain = cookieDomain,
            Path = "/",
            Expires = expires,
            IsEssential = true
        });
    }

    private static bool IsPublic(Lobby lobby)
    {
        try
        {
            if (lobby.Settings is null) return true;
            if (lobby.Settings.RootElement.TryGetProperty("isPublic", out var prop))
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
public record StartMatchRequest(int BestOf);
public record SetCaptainsRequest(Guid TeamAUserId, Guid TeamBUserId);
public record FirstPickRequest(string Team);
public record LobbyMapsRequest(List<Guid>? MapIds);
public record LobbyChatRequest(string? Body);
