using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Enums;

namespace VeTool.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class MatchesController : ControllerBase
{
    private readonly AppDbContext _db;
    public MatchesController(AppDbContext db) { _db = db; }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var match = await _db.Matches.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound();
        var lobby = await _db.Lobbies.AsNoTracking().FirstOrDefaultAsync(l => l.Id == match.LobbyId);
        if (lobby == null) return NotFound();
        var game = lobby.Game;
        var pool = await _db.MapPools.AsNoTracking().Where(p => p.Game == game)
            .OrderByDescending(p => p.EffectiveAt).FirstOrDefaultAsync();
        var maps = new List<object>();
        if (pool != null)
        {
            var poolMaps = await _db.MapPoolMaps.AsNoTracking().Where(pm => pm.MapPoolId == pool.Id)
                .Join(_db.Maps, pm => pm.GameMapId, m => m.Id, (pm, m) => new { m.Id, m.Code, m.Name })
                .OrderBy(x => x.Name).ToListAsync();
            maps = poolMaps.Select(x => new { id = x.Id, code = x.Code, name = x.Name }).Cast<object>().ToList();
        }
        return Ok(new { id = match.Id, bestOf = (int)match.BestOf, game = game.ToString().ToLower(), maps });
    }
} 