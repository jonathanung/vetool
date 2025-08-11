using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace VeTool.Api.Realtime;

[Authorize]
public class VetoHub : Hub
{
    public async Task JoinMatch(Guid matchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"match:{matchId}");
    }

    public async Task LeaveMatch(Guid matchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"match:{matchId}");
    }
} 