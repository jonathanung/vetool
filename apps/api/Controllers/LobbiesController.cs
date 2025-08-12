using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class LobbiesController : ControllerBase
{
    private readonly AppDbContext _db;

    public LobbiesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateLobbyRequest req)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var lobby = new Lobby
        {
            Id = Guid.NewGuid(),
            Game = req.Game,
            Name = req.Name,
            CreatedByUserId = userId,
            Status = LobbyStatus.Open,
            MaxPlayers = req.MaxPlayers ?? 10
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
    public async Task<IActionResult> List([FromQuery] Game? game, [FromQuery] LobbyStatus? status)
    {
        var q = _db.Lobbies.AsNoTracking().AsQueryable();
        if (game.HasValue) q = q.Where(l => l.Game == game);
        if (status.HasValue) q = q.Where(l => l.Status == status);
        var list = await q.OrderByDescending(l => l.UpdatedAt).Take(50).ToListAsync();
        return Ok(list);
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
        if (!exists)
        {
            _db.LobbyMemberships.Add(new LobbyMembership { Id = Guid.NewGuid(), LobbyId = id, UserId = userId, Role = LobbyRole.Member });
            await _db.SaveChangesAsync();
        }
        return Ok();
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
}

public record CreateLobbyRequest(Game Game, string Name, int? MaxPlayers); 