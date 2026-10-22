using System;
using UnityEngine;

namespace Kemudi.Simulation.Transmission
{
    /// <summary>
    /// Mesin: state pengapian OFF → ACC → ON → START (crank) → ON, stall,
    /// dan RPM. Sama dengan <c>lib/engine.ts</c> aplikasi lama.
    /// </summary>
    public sealed class EngineController : MonoBehaviour
    {
        public enum EngineState { Off, Acc, On, Crank }

        public event Action<bool>? RunningChanged;

        [SerializeField] private float crankDurationSeconds = 1.1f;

        public EngineState State { get; private set; } = EngineState.Off;
        public bool IsRunning => State == EngineState.On && _running;
        public float Rpm { get; private set; }

        private bool _running;
        private float _crankTimer;
        private VehicleConfigProvider _config = null!;

        // Dibuat terpisah agar EngineController tidak bergantung langsung pada
        // ScriptableObject (memudahkan unit test).
        public interface VehicleConfigProvider
        {
            float EngineIdleRpm { get; }
            float EngineRedlineRpm { get; }
        }

        /// <summary>
        /// Wire konfigurasi — dipakai scene bootstrap (komponen dibuat saat
        /// runtime sehingga tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void Configure(Vehicles.VehicleConfig config)
        {
            _config = new VehicleConfigAdapter(config);
        }

        private sealed class VehicleConfigAdapter : VehicleConfigProvider
        {
            private readonly Vehicles.VehicleConfig _config;

            public VehicleConfigAdapter(Vehicles.VehicleConfig config) => _config = config;

            public float EngineIdleRpm => _config.EngineIdleRpm;
            public float EngineRedlineRpm => _config.EngineRedlineRpm;
        }

        private void Update()
        {
            if (State == EngineState.Crank)
            {
                _crankTimer += Time.deltaTime;
                if (_crankTimer >= crankDurationSeconds)
                {
                    State = EngineState.On;
                    _running = true;
                    _crankTimer = 0f;
                    RunningChanged?.Invoke(true);
                }
            }

            if (!_running) return;

            var idle = _config?.EngineIdleRpm ?? 800f;
            var redline = _config?.EngineRedlineRpm ?? 7000f;
            // TODO: RPM sebenarnya bergantung beban (gas) & gigi — disetel oleh
            // TransmissionController. Di sini hanya fallback idle→redline.
            Rpm = Mathf.Lerp(idle, redline, Mathf.Clamp01(Time.time * 0.01f));
        }

        /// <summary>Satu langkah saklar kunci: OFF → ACC → ON → START → ON.</summary>
        public void ToggleIgnition()
        {
            switch (State)
            {
                case EngineState.Off:
                    State = EngineState.Acc;
                    break;
                case EngineState.Acc:
                    State = EngineState.On;
                    break;
                case EngineState.On when !_running:
                    State = EngineState.Crank; // starter
                    break;
                case EngineState.On when _running:
                    // Mematikan mesin saat berjalan.
                    Stop();
                    break;
            }
        }

        /// <summary>Setel RPM dari rasio (0..1) yang dihitung transmisi.</summary>
        public void SetRpmFromRatio(float ratio)
        {
            var idle = _config?.EngineIdleRpm ?? 800f;
            var redline = _config?.EngineRedlineRpm ?? 7000f;
            Rpm = Mathf.Lerp(idle, redline, Mathf.Clamp01(ratio));
        }

        public void Stall(string reason = "Mesin mati (stall)!")
        {
            Debug.LogWarning(reason);
            Stop();
        }

        private void Stop()
        {
            State = EngineState.Off;
            _running = false;
            Rpm = 0f;
            RunningChanged?.Invoke(false);
        }
    }
}
