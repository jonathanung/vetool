using System.Text.Json;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Matchmaking;

public static class LobbyConfig
{
    public static bool GetIsPublic(Lobby lobby)
    {
        try
        {
            if (lobby.Settings is null) return true;
            if (lobby.Settings.RootElement.TryGetProperty("isPublic", out var prop))
                return prop.ValueKind != JsonValueKind.False;
        }
        catch { /* default public */ }
        return true;
    }

    public static TeamSide GetFirstPickTeam(Lobby lobby)
    {
        try
        {
            if (lobby.Settings is not null &&
                lobby.Settings.RootElement.TryGetProperty("firstPickTeam", out var prop))
            {
                var raw = prop.ValueKind == JsonValueKind.String ? prop.GetString() : prop.ToString();
                if (string.Equals(raw, "B", StringComparison.OrdinalIgnoreCase) || raw == "2")
                    return TeamSide.B;
            }
        }
        catch { /* default A */ }
        return TeamSide.A;
    }

    public static IReadOnlyList<Guid> GetSelectedMapIds(Lobby lobby)
    {
        try
        {
            if (lobby.CurrentMapPool is not null &&
                lobby.CurrentMapPool.RootElement.TryGetProperty("mapIds", out var pool) &&
                pool.ValueKind == JsonValueKind.Array)
            {
                return ReadIds(pool);
            }
            if (lobby.Settings is not null &&
                lobby.Settings.RootElement.TryGetProperty("selectedMapIds", out var settings) &&
                settings.ValueKind == JsonValueKind.Array)
            {
                return ReadIds(settings);
            }
        }
        catch { /* empty */ }
        return Array.Empty<Guid>();
    }

    public static void Write(Lobby lobby, bool isPublic, TeamSide firstPick, IReadOnlyList<Guid> selectedMapIds)
    {
        var ids = selectedMapIds.Select(id => id.ToString()).ToList();
        lobby.Settings = JsonSerializer.SerializeToDocument(new
        {
            isPublic,
            firstPickTeam = firstPick == TeamSide.B ? "B" : "A",
            selectedMapIds = ids
        });
        lobby.CurrentMapPool = JsonSerializer.SerializeToDocument(new { mapIds = ids });
        lobby.UpdatedAt = DateTime.UtcNow;
    }

    private static List<Guid> ReadIds(JsonElement array)
    {
        var ids = new List<Guid>();
        foreach (var el in array.EnumerateArray())
        {
            var raw = el.ValueKind == JsonValueKind.String ? el.GetString() : el.ToString();
            if (Guid.TryParse(raw, out var id)) ids.Add(id);
        }
        return ids;
    }
}
