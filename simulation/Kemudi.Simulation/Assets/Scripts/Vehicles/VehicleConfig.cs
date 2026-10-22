using System;
using UnityEngine;

namespace Kemudi.Simulation.Vehicles
{
    /// <summary>
    /// Konfigurasi data-driven kendaraan (ScriptableObject). Nilai awal diambil
    /// dari <c>lib/vehicles.ts</c> aplikasi lama — bisa dibuat via menu
    /// Assets → Create → Kemudi → Vehicle Config.
    /// </summary>
    [CreateAssetMenu(fileName = "VehicleConfig", menuName = "Kemudi/Vehicle Config")]
    public sealed class VehicleConfig : ScriptableObject
    {
        public enum VehicleType { Motor, Mobil, Truk }

        [Header("Identitas")]
        public VehicleType Type;
        public string Label = "Mobil";
        [TextArea] public string Description = "";

        [Header("Dimensi (meter)")]
        public float Length = 4.2f;
        public float Width = 1.8f;
        public float Height = 1.4f;
        public float WheelBase = 2.6f;
        public float TrackWidth = 1.5f;
        public float Mass = 1300f;          // kg

        [Header("Performa (m/s & m/s²)")]
        public float MaxSpeed = 19.44f;   // 70 km/j (batas maksimum semua kendaraan)
        public float ReverseMaxSpeed = 6f;
        public float Acceleration = 6f;
        public float BrakeForce = 9f;
        public float HandbrakeForce = 4f;
        public float Friction = 2.5f;       // idle deceleration

        [Header("Handling")]
        public float MaxSteerAngle = 32f;   // derajat
        public float SteerRate = 4.5f;      // rad/s
        public float ReturnRate = 6f;
        public float SpeedSteerFalloff = 0.12f; // menyusut saat cepat
        public float TireGrip = 9f;         // m/s² max lateral accel
        public float FrontGrip = 1f;
        public float RearGrip = 1f;
        public float CenterOfMassY = -0.2f; // lebih rendah = lebih stabil
        public float AntiRollForce = 5000f;

        [Header("Mesin & Transmisi")]
        public float EngineIdleRpm = 800f;
        public float EngineRedlineRpm = 7000f;
        public float[] GearRatios = { 3.4f, 2.2f, 1.6f, 1.25f, 1.0f };
        public float FinalDrive = 3.9f;
        public float ReverseRatio = 3.2f;

        [Header("Kamera")]
        public float CameraDistance = 8f;
        public float CameraHeight = 3.2f;

        public int GearCount => GearRatios.Length;

        public float TopSpeedInGear(int gear) =>
            gear < 0 || gear >= GearRatios.Length ? 0f : MaxSpeed / GearRatios[gear];
    }
}
