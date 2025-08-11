using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using VeTool.Domain.Enums;

namespace VeTool.Domain.Entities;

public class Match
{
    public Guid Id { get; set; }
    public Guid LobbyId { get; set; }

    public BestOf BestOf { get; set; } = BestOf.Bo1;
    public MatchStatus Status { get; set; } = MatchStatus.Pending;

    public Guid? SelectedMapId { get; set; }

    [Column(TypeName = "jsonb")]
    public JsonDocument? Result { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
} 