namespace Kemudi.App.Models;

public class SimulationAttempt
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string VehicleType { get; set; } = string.Empty; // MOTOR, MOBIL, TRUK
    public int Score { get; set; }
    public long TimeTakenMs { get; set; }
    public int Violations { get; set; }
    public int OffRoadCount { get; set; }
    public int CollisionCount { get; set; }
    public bool Completed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
