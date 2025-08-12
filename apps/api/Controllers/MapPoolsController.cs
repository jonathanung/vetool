using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VeTool.Api.Services.External;
using VeTool.Domain.Data;
using VeTool.Domain.Enums;

namespace VeTool.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class MapPoolsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICs2PoolProvider _cs2;
    private readonly IValPoolProvider _val;

    public MapPoolsController(AppDbContext db, ICs2PoolProvider cs2, IValPoolProvider val)
    {
        _db = db; _cs2 = cs2; _val = val;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Game game)
    {
        var pools = await _db.MapPools.AsNoTracking().Where(p => p.Game == game).OrderByDescending(p => p.EffectiveAt).Take(1).ToListAsync();
        return Ok(pools);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromQuery] Game game)
    {
        if (game == Game.Cs2) await _cs2.UpsertActivePoolAsync(_db);
        else if (game == Game.Val) await _val.UpsertCompetitiveAsync(_db);
        else return BadRequest("Unsupported game");
        return Ok();
    }
} 