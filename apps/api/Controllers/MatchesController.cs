using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeTool.Api.Services.Matchmaking;
using VeTool.Domain.Enums;

namespace VeTool.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class MatchesController : ControllerBase
{
    private readonly MatchLifecycleService _matches;
    private readonly VetoSessionService _veto;

    public MatchesController(MatchLifecycleService matches, VetoSessionService veto)
    {
        _matches = matches;
        _veto = veto;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var summary = await _matches.GetSummaryAsync(id);
        return summary is null ? NotFound() : Ok(summary);
    }

    [Authorize]
    [HttpPut("{id:guid}/join-details")]
    public async Task<IActionResult> SetJoinDetails(Guid id, [FromBody] JoinDetailsRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var ok = await _matches.SetJoinDetailsAsync(id, userId, req.JoinDetails);
        if (!ok) return Forbid();
        var summary = await _matches.GetSummaryAsync(id);
        return Ok(summary);
    }

    [Authorize]
    [HttpPost("{id:guid}/veto/start")]
    public async Task<IActionResult> StartVeto(Guid id, [FromBody] StartVetoRequest? req)
    {
        BestOf? bestOf = req?.Mode is null ? null : VetoEngine.ParseBestOf(req.Mode);
        var state = await _veto.StartAsync(id, bestOf);
        if (state is null) return NotFound(new { message = "Match or map pool not found." });
        var summary = await _matches.GetSummaryAsync(id);
        return Ok(summary);
    }

    [Authorize]
    [HttpPost("{id:guid}/veto")]
    public async Task<IActionResult> Veto(Guid id, [FromBody] VetoActionRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var team = await _veto.TeamForUserAsync(id, userId);
        if (team == TeamSide.Unassigned) return Forbid();

        var action = req.Action.Equals("pick", StringComparison.OrdinalIgnoreCase) ? VetoAction.Pick : VetoAction.Ban;
        var result = await _veto.ApplyAsync(id, action, req.MapId, team);
        if (!result.Ok)
        {
            return result.Error switch
            {
                "no_session" => Conflict(new { message = "Veto not started." }),
                "wrong_side" => Conflict(new { message = "It is not your team's turn." }),
                "invalid_map" => BadRequest(new { message = "Map is not available." }),
                "invalid_action" => BadRequest(new { message = "That action is not allowed on this step." }),
                "veto_complete" => Conflict(new { message = "Veto is already complete." }),
                _ => BadRequest(new { message = result.Error })
            };
        }

        var summary = await _matches.GetSummaryAsync(id);
        return Ok(summary);
    }
}

public record JoinDetailsRequest(string? JoinDetails);
public record StartVetoRequest(string? Mode);
public record VetoActionRequest(string Action, Guid MapId);
