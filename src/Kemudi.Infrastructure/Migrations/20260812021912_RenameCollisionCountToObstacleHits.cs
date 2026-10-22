using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kemudi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameCollisionCountToObstacleHits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "CollisionCount",
                table: "SimulationAttempts",
                newName: "ObstacleHits");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ObstacleHits",
                table: "SimulationAttempts",
                newName: "CollisionCount");
        }
    }
}
