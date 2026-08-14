using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Matchmaking;

public static class MatchStartGate
{
    public const string NeedTwoPlayers = "need_two_players";
    public const string NeedTwoCaptains = "need_two_captains";

    public static bool CanStart(IEnumerable<(LobbyRole Role, TeamSide Team)> members, out string? error)
    {
        var list = members.ToList();
        if (list.Count < 2)
        {
            error = NeedTwoPlayers;
            return false;
        }

        var hasA = list.Any(m => m.Team == TeamSide.A && IsCaptainSeat(m.Role, m.Team));
        var hasB = list.Any(m => m.Team == TeamSide.B && IsCaptainSeat(m.Role, m.Team));
        if (!hasA || !hasB)
        {
            error = NeedTwoCaptains;
            return false;
        }

        error = null;
        return true;
    }

    public static bool IsCaptainSeat(LobbyRole role, TeamSide team)
        => team is TeamSide.A or TeamSide.B && role is LobbyRole.Captain or LobbyRole.Owner;
}
