using FluentAssertions;
using VeTool.Api.Services.Catalog;
using VeTool.Domain.Enums;

namespace VeTool.Tests.Catalog;

public class CompetitiveMapsTests
{
    [Fact]
    public void Seeded_cs2_and_valorant_pools_have_seven_named_maps()
    {
        CompetitiveMaps.Cs2.Should().HaveCount(7);
        CompetitiveMaps.Val.Should().HaveCount(7);
        CompetitiveMaps.For(Game.Cs2).Should().OnlyContain(m => !string.IsNullOrWhiteSpace(m.Name) && m.Name != m.Code.ToUpperInvariant());
        CompetitiveMaps.For(Game.Val).Should().Contain(m => m.Name == "Ascent");
        CompetitiveMaps.Title("mirage").Should().Be("Mirage");
        CompetitiveMaps.Title("ascent").Should().Be("Ascent");
    }
}
