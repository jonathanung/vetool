using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.External;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;
    private readonly IRiotStatsProvider _stats;

    public UsersController(UserManager<ApplicationUser> userManager, AppDbContext db, IRiotStatsProvider stats)
    {
        _userManager = userManager;
        _db = db;
        _stats = stats;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var user = await _db.Users.AsNoTracking().Where(u => u.Id == id).Select(u => new
        {
            u.Id, u.UserName, u.DisplayName, u.AvatarUrl, u.Steam64Id, u.RiotName, u.RiotTag
        }).FirstOrDefaultAsync();
        return user is null ? NotFound() : Ok(user);
    }

    [Authorize]
    [HttpPatch("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateUserRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return NotFound();
        if (!string.IsNullOrWhiteSpace(req.DisplayName)) user.DisplayName = req.DisplayName!;
        if (!string.IsNullOrWhiteSpace(req.Username)) user.UserName = req.Username!;
        if (req.Steam64Id is not null) user.Steam64Id = req.Steam64Id;
        if (!string.IsNullOrWhiteSpace(req.RiotName)) user.RiotName = req.RiotName;
        if (!string.IsNullOrWhiteSpace(req.RiotTag)) user.RiotTag = req.RiotTag;
        user.UpdatedAt = DateTime.UtcNow;
        var res = await _userManager.UpdateAsync(user);
        return res.Succeeded ? Ok(new { userId = user.Id, user.UserName, user.DisplayName }) : BadRequest(res.Errors);
    }

    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> GetStats(Guid id, [FromQuery] Game game)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();
        if (string.IsNullOrWhiteSpace(user.RiotName) || string.IsNullOrWhiteSpace(user.RiotTag)) return BadRequest("User has no linked Riot account");
        var stats = await _stats.GetOrFetchAsync(id, user.RiotName!, user.RiotTag!, game);
        return Ok(new { userId = id, game, stats.Payload, stats.LastSyncedAt });
    }
}

public record UpdateUserRequest(string? Username, string? DisplayName, string? Steam64Id, string? RiotName, string? RiotTag); 