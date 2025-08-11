using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VeTool.Domain.Data;
using VeTool.Domain.Enums;

namespace VeTool.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class MapPoolsController : ControllerBase
{
    private readonly AppDbContext _db;
    public MapPoolsController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Game game)
    {
        var pools = await _db.MapPools.AsNoTracking().Where(p => p.Game == game).OrderByDescending(p => p.EffectiveAt).Take(1).ToListAsync();
        return Ok(pools);
    }
} 