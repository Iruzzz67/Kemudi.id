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
        [SerializeField] private ChecklistManager checklist = null!;

        public VehicleInputState Input => inputSystem != null ? inputSystem.Current : VehicleInputState.Empty;
        public EngineController Engine => engine;
        public TransmissionController Transmission => transmission;
        public VehicleConfig Config => config;

        private float _speedMetersPerSecond;

        /// <summary>Diupdate VehiclePhysics setiap FixedUpdate.</summary>
        public void SetSpeed(float metersPerSecond) => _speedMetersPerSecond = metersPerSecond;

        private void Awake()
        {
            if (engine == null) engine = GetComponentInChildren<EngineController>();
            if (transmission == null) transmission = GetComponentInChildren<TransmissionController>();
            if (checklist == null) checklist = GetComponentInChildren<ChecklistManager>();

            // Rem tangan aktif saat mulai (§43: "lepas rem tangan" adalah item checklist).
            HandbrakeActive = true;
        }

        /// <summary>
        /// Wire dependency — dipakai scene bootstrap (komponen dibuat saat
        /// runtime sehingga tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void Configure(UniversalInputSystem input, VehicleConfig vehicleConfig,
            EngineController engineController, TransmissionController transmissionController,
            ChecklistManager checklistManager)
        {
            inputSystem = input;
            config = vehicleConfig;
            engine = engineController;
            transmission = transmissionController;
            checklist = checklistManager;
            // Transmisi butuh config sendiri (protected [SerializeField] — tidak
            // bisa diisi lewat Inspector pada komponen runtime).
            transmissionController?.SetConfig(vehicleConfig);
        }

        // Hasil kalkulasi yang dipakai fisika & UI
        public float SteeringInput { get; private set; }
        public bool HandbrakeActive { get; private set; }

        /// <summary>
        /// Disampling di Update (bukan FixedUpdate): input harus se-responsif
        /// mungkin. Fisika membaca hasilnya di FixedUpdate.
        /// </summary>
        private void Update()
        {
            var input = Input;
            if (config == null || inputSystem == null) return; // belum di-Configure

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
            if (input.HandbrakePressed)
            {
                HandbrakeActive = !HandbrakeActive;
                if (!HandbrakeActive) checklist?.MarkDone(ChecklistManager.Item.HandbrakeReleased);
            }

            UpdateChecklist(input);

            // Kemudi: rate-limited menuju target + speed-sensitive falloff.
            SteeringInput = Mathf.MoveTowards(
                SteeringInput,
                input.Steering,
                (input.Steering != 0f ? config.SteerRate : config.ReturnRate) * Time.deltaTime);
        }

        /// <summary>
        /// Checklist pra-jalan (§43): item dari tombol B/H/J/G/F serta item
        /// yang dideteksi otomatis (mesin, kopling, gigi satu).
        /// </summary>
        private void UpdateChecklist(VehicleInputState input)
        {
            if (checklist == null) return;

            if (input.ToggleSeatbelt) checklist.MarkDone(ChecklistManager.Item.Seatbelt);
            if (input.ToggleHelmet) checklist.MarkDone(ChecklistManager.Item.Helmet);
            if (input.ToggleJacket) checklist.MarkDone(ChecklistManager.Item.Jacket);
            if (input.ToggleGloves) checklist.MarkDone(ChecklistManager.Item.Gloves);
            if (input.ToggleBoots) checklist.MarkDone(ChecklistManager.Item.Boots);
            if (input.AdjustSeat) checklist.MarkDone(ChecklistManager.Item.SeatAdjusted);
            if (input.AdjustMirrors) checklist.MarkDone(ChecklistManager.Item.MirrorsAdjusted);

            // Deteksi otomatis dari sistem lain.
            if (engine != null && engine.IsRunning)
                checklist.MarkDone(ChecklistManager.Item.EngineOn);
            if (input.Clutch > 0.1f)
                checklist.MarkDone(ChecklistManager.Item.ClutchEngaged);
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
