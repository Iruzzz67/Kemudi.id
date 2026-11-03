using Kemudi.Domain.Enums;

namespace Kemudi.Domain.Entities;

/// <summary>
/// Konfigurasi kendaraan (data-driven). Nilai awal diambil dari
/// <c>lib/vehicles.ts</c> pada aplikasi lama.
/// </summary>
public sealed class Vehicle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public VehicleType Type { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Color { get; set; } = "#3b82f6";

    // Dimensi (meter)
    public double Length { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }

    // Performa
    public double MaxSpeed { get; set; }          // m/s
    public double ReverseMaxSpeed { get; set; }   // m/s
    public double Acceleration { get; set; }      // m/s^2
    public double Braking { get; set; }           // m/s^2
    public double Friction { get; set; }          // m/s^2 (idle deceleration)
    public double Wheelbase { get; set; }         // m

    // Handling
    public double MaxSteerAngle { get; set; }     // rad
    public double SteerRate { get; set; }         // rad/s
    public double TireGrip { get; set; }          // m/s^2 max lateral accel
    public double LeanAmount { get; set; }        // visual body roll gain

    // Transmisi
    public int GearCount { get; set; }
    public double[] GearRatios { get; set; } = Array.Empty<double>();

    // Kamera
    public double CameraDistance { get; set; }
    public double CameraHeight { get; set; }
}
