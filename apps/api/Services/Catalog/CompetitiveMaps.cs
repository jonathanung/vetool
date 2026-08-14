using VeTool.Domain.Enums;

namespace VeTool.Api.Services.Catalog;

public sealed record CompetitiveMapDef(Game Game, string Code, string Name);

public static class CompetitiveMaps
{
    public static readonly IReadOnlyList<CompetitiveMapDef> Cs2 =
    [
        new(Game.Cs2, "ancient", "Ancient"),
        new(Game.Cs2, "dust2", "Dust II"),
        new(Game.Cs2, "inferno", "Inferno"),
        new(Game.Cs2, "mirage", "Mirage"),
        new(Game.Cs2, "nuke", "Nuke"),
        new(Game.Cs2, "overpass", "Overpass"),
        new(Game.Cs2, "train", "Train")
    ];

    public static readonly IReadOnlyList<CompetitiveMapDef> Val =
    [
        new(Game.Val, "ascent", "Ascent"),
        new(Game.Val, "bind", "Bind"),
        new(Game.Val, "haven", "Haven"),
        new(Game.Val, "icebox", "Icebox"),
        new(Game.Val, "lotus", "Lotus"),
        new(Game.Val, "sunset", "Sunset"),
        new(Game.Val, "abyss", "Abyss")
    ];

    public static IReadOnlyList<CompetitiveMapDef> For(Game game) => game == Game.Val ? Val : Cs2;

    public static string Title(string code)
    {
        foreach (var map in Cs2.Concat(Val))
        {
            if (string.Equals(map.Code, code, StringComparison.OrdinalIgnoreCase)) return map.Name;
        }
        if (string.IsNullOrWhiteSpace(code)) return code;
        return char.ToUpperInvariant(code[0]) + code[1..];
    }
}
