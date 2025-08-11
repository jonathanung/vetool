using System.ComponentModel.DataAnnotations;
using VeTool.Domain.Enums;

namespace VeTool.Domain.Entities;

public class MapPool
{
    public Guid Id { get; set; }
    public Game Game { get; set; }

    [MaxLength(120)]
    public string Label { get; set; } = string.Empty;

    public MapPoolSource Source { get; set; } = MapPoolSource.Api;

    public DateTime? EffectiveAt { get; set; }
}

public class MapPoolMap
{
    public Guid Id { get; set; }
    public Guid MapPoolId { get; set; }
    public Guid GameMapId { get; set; }
    public int OrderIndex { get; set; }
} 