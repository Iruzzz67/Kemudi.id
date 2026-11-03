namespace Kemudi.Shared.DTOs;

/// <summary>Ringkasan kendaraan untuk halaman landing & pemilihan.</summary>
public sealed record VehicleDto(
    string Type,        // MOTOR | MOBIL | TRUK
    string Label,
    string Description,
    string Color,
    double MaxSpeed,    // m/s
    int GearCount);
