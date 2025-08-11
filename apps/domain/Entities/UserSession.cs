using System.ComponentModel.DataAnnotations;

namespace VeTool.Domain.Entities;

public class UserSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    [MaxLength(128)]
    public string JwtJti { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    [MaxLength(256)]
    public string? UserAgent { get; set; }

    [MaxLength(64)]
    public string? Ip { get; set; }
} 