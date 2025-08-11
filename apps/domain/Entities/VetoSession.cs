using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using VeTool.Domain.Enums;

namespace VeTool.Domain.Entities;

public class VetoSession
{
    public Guid Id { get; set; }
    public Guid MatchId { get; set; }

    public VetoPhase Phase { get; set; } = VetoPhase.NotStarted;

    [Column(TypeName = "jsonb")]
    public JsonDocument? Order { get; set; }

    [Column(TypeName = "jsonb")]
    public JsonDocument? Picks { get; set; }

    [Column(TypeName = "jsonb")]
    public JsonDocument? Bans { get; set; }

    public Guid? NextActorUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class VetoVote
{
    public Guid Id { get; set; }
    public Guid VetoSessionId { get; set; }
    public Guid UserId { get; set; }

    public VetoAction Action { get; set; }
    public Guid MapId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
} 