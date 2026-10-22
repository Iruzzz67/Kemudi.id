using UnityEngine;

namespace Kemudi.Simulation.Transmission
{
    /// <summary>
    /// Basis transmisi. Nilai gigi: -2 = Reverse, -1 = Neutral, 0..n = gigi maju
    /// (padanan <c>lib/transmission.ts</c>).
    /// </summary>
    public abstract class TransmissionController : MonoBehaviour
    {
        public const int Reverse = -2;
        public const int Neutral = -1;

        [SerializeField] protected Vehicles.VehicleConfig config = null!;

        public int CurrentGear { get; protected set; } = Neutral;
        public bool IsReverse => CurrentGear == Reverse;
        public bool IsNeutral => CurrentGear == Neutral;
        public string GearLabel => CurrentGear == Reverse ? "R" : CurrentGear == Neutral ? "N" : (CurrentGear + 1).ToString();

        /// <summary>
        /// Wire konfigurasi kendaraan — dipakai scene bootstrap (komponen dibuat
        /// saat runtime sehingga tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void SetConfig(Vehicles.VehicleConfig vehicleConfig) => config = vehicleConfig;

        public abstract void ShiftUp(EngineController engine);
        public abstract void ShiftDown(EngineController engine);
        public abstract void RequestReverse(EngineController engine);
        public abstract void RequestNeutral();

        /// <summary>RPM target mesin untuk gigi & kecepatan saat ini (0..1 ratio).</summary>
        public virtual float ComputeRpmRatio(float speed) => 0f;
    }
}
