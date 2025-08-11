using System.ComponentModel.DataAnnotations;
using VeTool.Domain.Enums;

namespace VeTool.Domain.Entities;

public class LobbyMembership
{
    public Guid Id { get; set; }
    public Guid LobbyId { get; set; }
    public Guid UserId { get; set; }

    public LobbyRole Role { get; set; } = LobbyRole.Member;
    public TeamSide Team { get; set; } = TeamSide.Unassigned;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; }
} 