using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VeTool.Domain.Entities;

namespace VeTool.Domain.Configurations;

public class RelationshipConfigurations : IEntityTypeConfiguration<Lobby>,
    IEntityTypeConfiguration<LobbyMembership>,
    IEntityTypeConfiguration<MapPoolMap>,
    IEntityTypeConfiguration<Match>,
    IEntityTypeConfiguration<VetoSession>,
    IEntityTypeConfiguration<VetoVote>,
    IEntityTypeConfiguration<UserSession>,
    IEntityTypeConfiguration<UserStats>
{
    public void Configure(EntityTypeBuilder<Lobby> builder)
    {
        builder.HasOne<ApplicationUser>().WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    public void Configure(EntityTypeBuilder<LobbyMembership> builder)
    {
        builder.HasOne<Lobby>().WithMany()
            .HasForeignKey(x => x.LobbyId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<ApplicationUser>().WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    public void Configure(EntityTypeBuilder<MapPoolMap> builder)
    {
        builder.HasOne<MapPool>().WithMany()
            .HasForeignKey(x => x.MapPoolId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<GameMap>().WithMany()
            .HasForeignKey(x => x.GameMapId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    public void Configure(EntityTypeBuilder<Match> builder)
    {
        builder.HasOne<Lobby>().WithMany()
            .HasForeignKey(x => x.LobbyId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<GameMap>().WithMany()
            .HasForeignKey(x => x.SelectedMapId)
            .OnDelete(DeleteBehavior.SetNull);
    }

    public void Configure(EntityTypeBuilder<VetoSession> builder)
    {
        builder.HasOne<Match>().WithOne()
            .HasForeignKey<VetoSession>(x => x.MatchId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<ApplicationUser>().WithMany()
            .HasForeignKey(x => x.NextActorUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }

    public void Configure(EntityTypeBuilder<VetoVote> builder)
    {
        builder.HasOne<VetoSession>().WithMany()
            .HasForeignKey(x => x.VetoSessionId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<ApplicationUser>().WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<GameMap>().WithMany()
            .HasForeignKey(x => x.MapId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    public void Configure(EntityTypeBuilder<UserSession> builder)
    {
        builder.HasOne<ApplicationUser>().WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    public void Configure(EntityTypeBuilder<UserStats> builder)
    {
        builder.HasOne<ApplicationUser>().WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
} 