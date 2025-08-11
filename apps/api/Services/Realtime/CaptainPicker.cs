namespace VeTool.Api.Services.Realtime;

public interface ICaptainPicker
{
    IReadOnlyList<int> BuildPickOrder(int totalPlayers);
}

public sealed class CaptainPicker : ICaptainPicker
{
    public IReadOnlyList<int> BuildPickOrder(int totalPlayers)
    {
        // 1 / 2 / 2 / 2 / 1 repeating as needed, but do not exceed total players
        var pattern = new[] { 1, 2, 2, 2, 1 };
        var result = new List<int>();
        var remaining = totalPlayers - 2; // after selecting 2 captains
        var idx = 0;
        while (remaining > 0)
        {
            var take = Math.Min(pattern[idx % pattern.Length], remaining);
            result.Add(take);
            remaining -= take;
            idx++;
        }
        return result;
    }
} 