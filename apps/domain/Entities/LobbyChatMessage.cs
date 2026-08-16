using System.ComponentModel.DataAnnotations;

namespace VeTool.Domain.Entities;

public class LobbyChatMessage
{
    public Guid Id { get; set; }
    public Guid LobbyId { get; set; }
    public Guid UserId { get; set; }

    [MaxLength(300)]
    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
