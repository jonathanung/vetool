using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using VeTool.Domain.Enums;

namespace VeTool.Domain.Entities;

public class Lobby
{
    public Guid Id { get; set; }
    public Game Game { get; set; }

    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    public LobbyStatus Status { get; set; } = LobbyStatus.Open;

    public Guid CreatedByUserId { get; set; }

    public int MaxPlayers { get; set; } = 10;

    [Column(TypeName = "jsonb")]
    public JsonDocument? CurrentMapPool { get; set; }

    [Column(TypeName = "jsonb")]
    public JsonDocument? Settings { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
} 