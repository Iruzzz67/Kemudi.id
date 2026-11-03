using Kemudi.Simulation.Input;
using Kemudi.Simulation.Rules;
using Kemudi.Simulation.Transmission;
using UnityEngine;

namespace Kemudi.Simulation.Vehicles
{
    /// <summary>
    /// Orkestrator kendaraan — BUKAN monolith. Ia membaca input universal lalu
    /// mengarahkan sub-sistem (engine, transmisi, kemudi, rem, fisika, audio).
    /// </summary>
    [RequireComponent(typeof(VehiclePhysics))]
    public sealed class VehicleController : MonoBehaviour
    {
        [Header("Dependency (dipasang otomatis / manual di scene)")]
        [SerializeField] private UniversalInputSystem inputSystem = null!;
        [SerializeField] private VehicleConfig config = null!;
        [SerializeField] private EngineController engine = null!;
        [SerializeField] private TransmissionController transmission = null!;

        public VehicleInputState Input => inputSystem != null ? inputSystem.Current : VehicleInputState.Empty;
        public EngineController Engine => engine;
        public TransmissionController Transmission => transmission;
        public VehicleConfig Config => config;

        private float _speedMetersPerSecond;

        /// <summary>Diupdate VehiclePhysics setiap FixedUpdate.</summary>
        public void SetSpeed(float metersPerSecond) => _speedMetersPerSecond = metersPerSecond;

        // Hasil kalkulasi yang dipakai fisika & UI
        public float SteeringInput { get; private set; }
        public bool HandbrakeActive { get; private set; }

        /// <summary>
        /// Wire semua dependency — dipanggil oleh KemudiSceneBootstrap.BuildVehicle().
        /// </summary>
        public void Configure(
            UniversalInputSystem input,
            VehicleConfig vehicleConfig,
            EngineController engineCtrl,
            TransmissionController transmissionCtrl,
            ChecklistManager checklist)
        {
            inputSystem = input;
            config = vehicleConfig;
            engine = engineCtrl;
            transmission = transmissionCtrl;

            // Wire engine ke config provider.
            if (engine != null) engine.Configure(vehicleConfig);

            // Tag kendaraan untuk collision detection (TriggerZones).
            gameObject.tag = "Vehicle";
        }

        private void Awake()
        {
            if (config == null)
                Debug.LogError("VehicleController: VehicleConfig belum di-assign.", this);

            if (engine == null) engine = GetComponentInChildren<EngineController>();
            if (transmission == null) transmission = GetComponentInChildren<TransmissionController>();
        }

        /// <summary>
        /// Disampling di Update (bukan FixedUpdate): input harus se-responsif
        /// mungkin. Fisika membaca hasilnya di FixedUpdate.
        /// </summary>
        private void Update()
        {
            var input = Input;

            if (engine != null)
                engine.SetRpmFromRatio(transmission != null
                    ? transmission.ComputeRpmRatio(_speedMetersPerSecond)
                    : 0f);

            // Aksi diskrit — dieksekusi sekali per tekan.
            if (input.Ignition) engine?.ToggleIgnition();
            if (input.GearUp) transmission?.ShiftUp(engine);
            if (input.GearDown) transmission?.ShiftDown(engine);
            if (input.ReverseRequested) transmission?.RequestReverse(engine);
            if (input.NeutralRequested) transmission?.RequestNeutral();
            if (input.HandbrakePressed) HandbrakeActive = !HandbrakeActive;

            // Kemudi: rate-limited menuju target + speed-sensitive falloff.
            SteeringInput = Mathf.MoveTowards(
                SteeringInput,
                input.Steering,
                (input.Steering != 0f ? config.SteerRate : config.ReturnRate) * Time.deltaTime);
        }

        /// <summary>Nilai kemudi efektif (sudah memperhitungkan falloff kecepatan).</summary>
        public float EffectiveSteering(float speedKmh)
        {
            var falloff = 1f / (1f + config.SpeedSteerFalloff * speedKmh);
            return SteeringInput * falloff * config.MaxSteerAngle;
        }
    }
}
