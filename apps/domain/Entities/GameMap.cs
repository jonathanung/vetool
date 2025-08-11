using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using VeTool.Domain.Enums;

namespace VeTool.Domain.Entities;

public class GameMap
{
    public Guid Id { get; set; }
    public Game Game { get; set; }

    [MaxLength(64)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    [Column(TypeName = "jsonb")]
    public JsonDocument? Meta { get; set; }
} 