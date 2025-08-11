using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using VeTool.Domain.Entities;
using VeTool.Domain.Enums;

namespace VeTool.Domain.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<Lobby> Lobbies => Set<Lobby>();
    public DbSet<LobbyMembership> LobbyMemberships => Set<LobbyMembership>();
    public DbSet<GameMap> Maps => Set<GameMap>();
    public DbSet<MapPool> MapPools => Set<MapPool>();
    public DbSet<MapPoolMap> MapPoolMaps => Set<MapPoolMap>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<VetoSession> VetoSessions => Set<VetoSession>();
    public DbSet<VetoVote> VetoVotes => Set<VetoVote>();
    public DbSet<UserStats> UserStats => Set<UserStats>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        var gameConverter = new EnumToStringConverter<Game>();
        var lobbyStatusConverter = new EnumToStringConverter<LobbyStatus>();
        var lobbyRoleConverter = new EnumToStringConverter<LobbyRole>();
        var teamSideConverter = new EnumToStringConverter<TeamSide>();
        var mapPoolSourceConverter = new EnumToStringConverter<MapPoolSource>();
        var bestOfConverter = new EnumToStringConverter<BestOf>();
        var matchStatusConverter = new EnumToStringConverter<MatchStatus>();
        var vetoPhaseConverter = new EnumToStringConverter<VetoPhase>();
        var vetoActionConverter = new EnumToStringConverter<VetoAction>();

        builder.Entity<ApplicationUser>(b =>
        {
            b.ToTable("AspNetUsers");
            b.Property(u => u.DisplayName).HasMaxLength(100).IsRequired();
            b.HasIndex(u => u.Email).IsUnique();
            b.HasIndex(u => u.UserName).IsUnique();
            b.Property(u => u.Steam64Id).HasMaxLength(64);
            b.Property(u => u.RiotName).HasMaxLength(32);
            b.Property(u => u.RiotTag).HasMaxLength(16);
            b.Property(u => u.AvatarUrl).HasMaxLength(512);
        });

        builder.Entity<UserSession>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.ExpiresAt });
            b.HasIndex(x => x.JwtJti).IsUnique();
            b.Property(x => x.UserAgent).HasMaxLength(256);
            b.Property(x => x.Ip).HasMaxLength(64);
        });

        builder.Entity<Lobby>(b =>
        {
            b.Property(x => x.Game).HasConversion(gameConverter).HasMaxLength(8);
            b.Property(x => x.Status).HasConversion(lobbyStatusConverter).HasMaxLength(16);
            b.Property(x => x.Name).HasMaxLength(120);
            b.Property(x => x.MaxPlayers).HasDefaultValue(10);
            b.HasIndex(x => new { x.Game, x.Status });
            b.HasIndex(x => x.CreatedByUserId);
            b.HasIndex(x => x.UpdatedAt);
        });

        builder.Entity<LobbyMembership>(b =>
        {
            b.HasIndex(x => new { x.LobbyId, x.UserId }).IsUnique();
            b.Property(x => x.Role).HasConversion(lobbyRoleConverter).HasMaxLength(16);
            b.Property(x => x.Team).HasConversion(teamSideConverter).HasMaxLength(16);
        });

        builder.Entity<GameMap>(b =>
        {
            b.Property(x => x.Game).HasConversion(gameConverter).HasMaxLength(8);
            b.HasIndex(x => new { x.Game, x.Code }).IsUnique();
            b.Property(x => x.Code).HasMaxLength(64);
            b.Property(x => x.Name).HasMaxLength(120);
        });

        builder.Entity<MapPool>(b =>
        {
            b.Property(x => x.Game).HasConversion(gameConverter).HasMaxLength(8);
            b.Property(x => x.Source).HasConversion(mapPoolSourceConverter).HasMaxLength(16);
            b.HasIndex(x => new { x.Game, x.EffectiveAt });
        });

        builder.Entity<MapPoolMap>(b =>
        {
            b.HasIndex(x => new { x.MapPoolId, x.GameMapId }).IsUnique();
        });

        builder.Entity<Match>(b =>
        {
            b.Property(x => x.BestOf).HasConversion(bestOfConverter).HasMaxLength(8);
            b.Property(x => x.Status).HasConversion(matchStatusConverter).HasMaxLength(16);
            b.HasIndex(x => x.LobbyId);
        });

        builder.Entity<VetoSession>(b =>
        {
            b.Property(x => x.Phase).HasConversion(vetoPhaseConverter).HasMaxLength(16);
            b.HasIndex(x => x.MatchId).IsUnique();
        });

        builder.Entity<VetoVote>(b =>
        {
            b.Property(x => x.Action).HasConversion(vetoActionConverter).HasMaxLength(8);
            b.HasIndex(x => new { x.VetoSessionId, x.UserId }).IsUnique();
        });

        builder.Entity<UserStats>(b =>
        {
            b.Property(x => x.Game).HasConversion(gameConverter).HasMaxLength(8);
            b.HasIndex(x => new { x.UserId, x.Game }).IsUnique();
        });
    }
} 