using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VeTool.Domain.Migrations
{
    /// <inheritdoc />
    public partial class LobbyChatAndExpiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "Lobbies",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.Sql("""UPDATE "Lobbies" SET "ExpiresAt" = "CreatedAt" + INTERVAL '24 hours'""");

            migrationBuilder.CreateTable(
                name: "LobbyChatMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LobbyId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Body = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LobbyChatMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LobbyChatMessages_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LobbyChatMessages_Lobbies_LobbyId",
                        column: x => x.LobbyId,
                        principalTable: "Lobbies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Lobbies_ExpiresAt",
                table: "Lobbies",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_LobbyChatMessages_LobbyId_CreatedAt",
                table: "LobbyChatMessages",
                columns: new[] { "LobbyId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_LobbyChatMessages_UserId",
                table: "LobbyChatMessages",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LobbyChatMessages");

            migrationBuilder.DropIndex(
                name: "IX_Lobbies_ExpiresAt",
                table: "Lobbies");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "Lobbies");
        }
    }
}
