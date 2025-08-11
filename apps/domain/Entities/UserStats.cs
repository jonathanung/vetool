using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using VeTool.Domain.Enums;

namespace VeTool.Domain.Entities;

public class UserStats
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Game Game { get; set; }

    [Column(TypeName = "jsonb")]
    public JsonDocument Payload { get; set; } = JsonDocument.Parse("{}");

    public DateTime? LastSyncedAt { get; set; }
} 