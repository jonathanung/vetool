using System.Text.Json;
using VeTool.Domain.Entities;

namespace VeTool.Api.Services.Matchmaking;

public static class MatchPayload
{
    public static string? GetJoinDetails(Match match)
    {
        if (match.Result is null) return null;
        try
        {
            if (match.Result.RootElement.ValueKind == JsonValueKind.Object &&
                match.Result.RootElement.TryGetProperty("joinDetails", out var prop) &&
                prop.ValueKind == JsonValueKind.String)
            {
                return prop.GetString();
            }
        }
        catch
        {
            return null;
        }
        return null;
    }

    public static IReadOnlyList<Guid> GetSelectedMapIds(Match match)
    {
        if (match.Result is null) return Array.Empty<Guid>();
        try
        {
            if (match.Result.RootElement.ValueKind == JsonValueKind.Object &&
                match.Result.RootElement.TryGetProperty("selectedMapIds", out var prop) &&
                prop.ValueKind == JsonValueKind.Array)
            {
                return prop.EnumerateArray()
                    .Select(e => Guid.TryParse(e.GetString(), out var id) ? id : Guid.Empty)
                    .Where(id => id != Guid.Empty)
                    .ToList();
            }
        }
        catch
        {
            return Array.Empty<Guid>();
        }
        return Array.Empty<Guid>();
    }

    public static void SetJoinDetails(Match match, string? details)
    {
        Write(match, details, GetSelectedMapIds(match).ToList());
    }

    public static void SetSelectedMapIds(Match match, IReadOnlyList<Guid> ids)
    {
        Write(match, GetJoinDetails(match), ids.ToList());
    }

    private static void Write(Match match, string? joinDetails, List<Guid> selected)
    {
        match.Result = JsonSerializer.SerializeToDocument(new
        {
            joinDetails,
            selectedMapIds = selected.Select(id => id.ToString()).ToList()
        });
        match.UpdatedAt = DateTime.UtcNow;
        if (selected.Count > 0) match.SelectedMapId = selected[0];
    }
}
