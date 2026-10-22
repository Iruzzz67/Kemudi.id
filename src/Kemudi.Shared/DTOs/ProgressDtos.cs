namespace Kemudi.Shared.DTOs;

/// <summary>Payload hasil simulasi yang dikirim dari Unity/klien ke API.</summary>
/// <summary>
/// Payload hasil simulasi yang dikirim dari Unity/klien ke API.
/// Nama field mengikuti JSON §62 dokumen migrasi (camelCase saat dikirim):
/// vehicleType, score, timeTakenMs, violations, offRoadCount, obstacleHits, completed.
/// </summary>
public sealed record SubmitSimulationRequest(
    string VehicleType,     // MOTOR | MOBIL | TRUK
    int Score,
    long TimeTakenMs,
    int Violations,
    int OffRoadCount,
    int ObstacleHits,
    bool Completed,
    string? TrainingMode = null);

/// <summary>Representasi riwayat latihan untuk dashboard.</summary>
public sealed record SimulationAttemptDto(
    string Id,
    string VehicleType,
    int Score,
    long TimeTakenMs,
    int Violations,
    int OffRoadCount,
    int ObstacleHits,
    bool Completed,
    DateTime CreatedAt);
