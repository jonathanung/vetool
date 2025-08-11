using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace VeTool.Domain.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(64)]
    public string? Steam64Id { get; set; }

    [MaxLength(32)]
    public string? RiotName { get; set; }

    [MaxLength(16)]
    public string? RiotTag { get; set; }

    [MaxLength(512)]
    public string? AvatarUrl { get; set; }

    public bool AvatarUploaded { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
} 