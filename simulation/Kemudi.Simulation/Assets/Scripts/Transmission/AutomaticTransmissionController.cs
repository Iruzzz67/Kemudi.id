using UnityEngine;

namespace Kemudi.Simulation.Transmission
{
    /// <summary>
    /// Transmisi otomatis: upshift/downshift berdasarkan kecepatan & throttle,
    /// dengan hysteresis agar gigi tidak berpindah bolak-balik di batas RPM.
    /// </summary>
    public sealed class AutomaticTransmissionController : TransmissionController
    {
        [SerializeField] private float upshiftLoadFactor = 0.82f;
        [SerializeField] private float downshiftFactor = 0.55f;

        private float _speed;
        private bool _reverseRequested;

        public override void ShiftUp(EngineController engine) { /* otomatis */ }
        public override void ShiftDown(EngineController engine) { /* otomatis */ }

        public override void RequestReverse(EngineController engine)
        {
            _reverseRequested = !_reverseRequested;
        }

        public override void RequestNeutral()
        {
            // Dalam mode otomatis, netral tidak diperlukan untuk berkendara.
        }

        private void Update()
        {
            var rb = GetComponentInParent<Rigidbody>();
            if (rb == null) return;
            _speed = rb.linearVelocity.magnitude;

            if (_reverseRequested)
            {
                CurrentGear = Reverse;
                return;
            }

            // Pastikan gigi 1 aktif saat mulai bergerak (jangan menampilkan N
            // terus saat kendaraan sudah jalan).
            if (CurrentGear <= Neutral && _speed > 0.3f)
                CurrentGear = 0;

            var abs = Mathf.Abs(_speed);

            // Upshift
            for (int g = 0; g < config.GearCount - 1; g++)
            {
                if (abs > config.TopSpeedInGear(g) * upshiftLoadFactor)
                {
                    CurrentGear = Mathf.Max(CurrentGear, g + 1);
                    break;
                }
            }

            // Downshift (dengan hysteresis: threshold lebih rendah)
            for (int g = config.GearCount - 1; g > 0; g--)
            {
                if (abs < config.TopSpeedInGear(g) * downshiftFactor)
                    CurrentGear = Mathf.Min(CurrentGear, g - 1);
            }
        }

        public override float ComputeRpmRatio(float speed)
        {
            if (IsReverse) return 0.3f;
            var top = config.TopSpeedInGear(Mathf.Max(0, CurrentGear));
            return Mathf.Clamp01(speed / Mathf.Max(1f, top));
        }
    }
}
