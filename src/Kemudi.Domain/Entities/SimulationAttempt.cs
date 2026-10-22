using Kemudi.Domain.Enums;

namespace Kemudi.Domain.Entities;

/// <summary>
/// Hasil satu percobaan simulasi mengemudi. Padanan dari model
/// <c>SimulationAttempt</c> pada schema Prisma lama.
/// </summary>
public sealed class SimulationAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;

    public VehicleType VehicleType { get; set; }
    public int Score { get; set; }            // 0-100
    public long TimeTakenMs { get; set; }
    public int Violations { get; set; }
    public int OffRoadCount { get; set; }
    public int ObstacleHits { get; set; }          // tabrakan dgn rintangan/kendaraan (§8)
    public TrainingMode? TrainingMode { get; set; }
    public bool Completed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
