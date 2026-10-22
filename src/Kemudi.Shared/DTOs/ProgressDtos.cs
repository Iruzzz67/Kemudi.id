namespace Kemudi.Shared.DTOs;

/// <summary>Payload hasil simulasi yang dikirim dari Unity/klien ke API.</summary>
public sealed record SubmitSimulationRequest(
    string VehicleType,     // MOTOR | MOBIL | TRUK
    int Score,
    long TimeTakenMs,
    int Violations,
    int OffRoadCount,
    int CollisionCount,
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
    int CollisionCount,
    bool Completed,
    DateTime CreatedAt);
