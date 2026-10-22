using Kemudi.Simulation.Input;
using Kemudi.Simulation.Rules;
using Kemudi.Simulation.Transmission;
using UnityEngine;

namespace Kemudi.Simulation.Vehicles
{
    /// <summary>
    /// Orkestrator kendaraan — BUKAN monolith. Ia membaca input universal lalu
    /// mengarahkan sub-sistem (engine, transmisi, kemudi, rem, fisika, audio).
    ///
    /// Kontrol juga mencatat item checklist pra-berkendara (§43) yang memang
    /// berasal dari tindakan pengemudi: kopling, gigi satu, mesin menyala, dan
    /// rem tangan dilepas.
    /// </summary>
    [RequireComponent(typeof(VehiclePhysics))]
    public sealed class VehicleController : MonoBehaviour
    {
        [Header("Dependency (dipasang otomatis / manual di scene)")]
        [SerializeField] private UniversalInputSystem inputSystem = null!;
        [SerializeField] private VehicleConfig config = null!;
        [SerializeField] private EngineController engine = null!;
        [SerializeField] private TransmissionController transmission = null!;
        [SerializeField] private ChecklistManager? checklist;

        public VehicleInputState Input => inputSystem != null ? inputSystem.Current : VehicleInputState.Empty;
        public EngineController Engine => engine;
        public TransmissionController Transmission => transmission;
        public VehicleConfig Config => config;
        public ChecklistManager? Checklist => checklist;

        /// <summary>
        /// Kontrol hanya aktif saat pengguna berada di kendaraan (fase
        /// Entering/PreDrive/Driving). Di fase berjalan kaki input diabaikan.
        /// </summary>
        public bool ControlsEnabled { get; set; } = true;

        private float _speedMetersPerSecond;

        /// <summary>Diupdate VehiclePhysics setiap FixedUpdate.</summary>
        public void SetSpeed(float metersPerSecond) => _speedMetersPerSecond = metersPerSecond;

        // Hasil kalkulasi yang dipakai fisika & UI
        public float SteeringInput { get; private set; }

        /// <summary>Rem tangan — aktif saat pengguna baru masuk kabin (padanan web).</summary>
        public bool HandbrakeActive { get; private set; } = true;

        private void Awake()
        {
            if (config == null)
                Debug.LogError("VehicleController: VehicleConfig belum di-assign.", this);

            if (engine == null) engine = GetComponentInChildren<EngineController>();
            if (transmission == null) transmission = GetComponentInChildren<TransmissionController>();
        }

        /// <summary>
        /// Wire dependency — dipakai KemudiSceneBootstrap karena komponen
        /// kendaraan dibuat saat runtime (bukan lewat Inspector).
        /// </summary>
        public void Configure(UniversalInputSystem input, VehicleConfig vehicleConfig,
            EngineController engineController, TransmissionController transmissionController,
            ChecklistManager? checklistManager)
        {
            inputSystem = input;
            config = vehicleConfig;
            engine = engineController;
            transmission = transmissionController;
            checklist = checklistManager;

            // Pengguna masuk kabin dengan rem tangan terpasang.
            HandbrakeActive = true;
            SteeringInput = 0f;
        }

        /// <summary>
        /// Disampling di Update (bukan FixedUpdate): input harus se-responsif
        /// mungkin. Fisika membaca hasilnya di FixedUpdate.
        /// </summary>
        private void Update()
        {
            var input = Input;
            if (!ControlsEnabled) return;

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

            MarkChecklistFromControls(input);
        }

        /// <summary>
        /// Item checklist yang berasal langsung dari aksi pengemudi (§43):
        /// kopling, gigi satu, mesin menyala, rem tangan dilepas.
        /// </summary>
        private void MarkChecklistFromControls(VehicleInputState input)
        {
            if (checklist == null) return;

            if (input.Clutch > 0.1f) checklist.MarkDone(ChecklistManager.Item.ClutchEngaged);
            if (engine != null && engine.IsRunning) checklist.MarkDone(ChecklistManager.Item.EngineOn);
            if (!HandbrakeActive) checklist.MarkDone(ChecklistManager.Item.HandbrakeReleased);
            if (transmission != null && transmission.CurrentGear == 0)
                checklist.MarkDone(ChecklistManager.Item.FirstGearEngaged);
        }

        /// <summary>Nilai kemudi efektif (sudah memperhitungkan falloff kecepatan).</summary>
        public float EffectiveSteering(float speedKmh)
        {
            var falloff = 1f / (1f + config.SpeedSteerFalloff * speedKmh);
            return SteeringInput * falloff * config.MaxSteerAngle;
        }
    }
}
