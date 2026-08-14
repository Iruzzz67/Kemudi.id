using System;
using Kemudi.Simulation.Rules;
using UnityEngine;

namespace Kemudi.Simulation.Core
{
    /// <summary>
    /// Orkestrator fase simulasi (padanan <c>simStore.phase</c>).
    ///
    /// Alur DEFAULT (performa-first, dokumen migrasi §10 & §35):
    ///     Selecting → PreDrive → Driving → Finished/Failed
    ///
    /// Fase Walking (karakter berjalan ke kendaraan) BUKAN fitur wajib — ia
    /// menambah karakter 3D, animasi, collision, dan kamera ekstra. Diaktifkan
    /// hanya lewat <see cref="ImmersiveEntry"/>:
    ///     Selecting → Walking → Entering → PreDrive → Driving → Finished/Failed
    /// </summary>
    public sealed class SimulationManager : MonoBehaviour
    {
        public enum Phase { Selecting, Walking, Entering, PreDrive, Driving, Finished, Failed }

        public event Action<Phase>? PhaseChanged;

        /// <summary>Alur immersive (walking dulu) — default OFF (§35).</summary>
        [Header("Alur Simulasi")]
        [Tooltip("Default OFF: Selecting → PreDrive → Driving. ON menambahkan fase berjalan kaki ke kendaraan.")]
        [SerializeField] private bool immersiveEntry;

        /// <summary>Durasi animasi masuk kendaraan (detik) sebelum ke PreDrive.</summary>
        [SerializeField] private float enteringDuration = 2f;

        public Phase CurrentPhase { get; private set; } = Phase.Selecting;
        public float ElapsedMs { get; private set; }
        public bool ImmersiveEntry => immersiveEntry;

        private float _enteringTimer;

        private void Update()
        {
            switch (CurrentPhase)
            {
                case Phase.Driving:
                    ElapsedMs += Time.deltaTime * 1000f;
                    break;
                case Phase.Entering:
                    _enteringTimer += Time.deltaTime;
                    if (_enteringTimer >= enteringDuration)
                        BeginPreDrive(CurrentVehicleType, IsManualTransmission);
                    break;
            }
        }

        /// <summary>Mulai simulasi dari layar pilih kendaraan.</summary>
        public void StartSimulation()
        {
            ElapsedMs = 0f;
            if (immersiveEntry)
            {
                SetPhase(Phase.Walking);
            }
            else
            {
                // Default: langsung ke PreDrive (checklist) — walk tidak wajib.
                BeginPreDrive(CurrentVehicleType, IsManualTransmission);
            }
        }

        /// <summary>Jenis kendaraan yang sedang dipilih (disetel UI/scene).</summary>
        public Vehicles.VehicleConfig.VehicleType CurrentVehicleType { get; set; } = Vehicles.VehicleConfig.VehicleType.Mobil;

        /// <summary>Apakah transmisi manual (menambah item checklist kopling/gigi satu).</summary>
        public bool IsManualTransmission { get; set; }

        /// <summary>Hanya dipakai saat <see cref="ImmersiveEntry"/> aktif.</summary>
        public void StartWalking() => SetPhase(Phase.Walking);

        /// <summary>Karakter sampai di pintu kendaraan → animasi masuk.</summary>
        public void EnterVehicle()
        {
            _enteringTimer = 0f;
            SetPhase(Phase.Entering);
        }

        /// <summary>
        /// Memulai fase PreDrive (checklist). Reset checklist sesuai kendaraan
        /// & transmisi, lalu tandai item "masuk kendaraan" + "tutup pintu"
        /// (pemain sudah berada di dalam kabin saat fase ini).
        /// </summary>
        public void BeginPreDrive(Vehicles.VehicleConfig.VehicleType vehicleType, bool manualTransmission)
        {
            // Reset semua sistem penilaian untuk percobaan baru (§45-46).
            violationSystem?.Reset();
            scoringSystem?.Reset();

            checklist?.Reset(vehicleType, manualTransmission);
            checklist?.MarkDone(Rules.ChecklistManager.Item.EnteredVehicle);
            checklist?.MarkDone(Rules.ChecklistManager.Item.DoorClosed);
            SetPhase(Phase.PreDrive);
        }

        /// <summary>Checklist pra-jalan selesai → mengemudi dimulai.</summary>
        public void CompletePreDrive() => StartDriving();

        public void StartDriving()
        {
            ElapsedMs = 0f;
            SetPhase(Phase.Driving);
        }

        public void Finish() => SetPhase(Phase.Finished);

        /// <summary>Kembali ke layar pilih kendaraan (untuk restart percobaan).</summary>
        public void ReturnToSelecting() => SetPhase(Phase.Selecting);

        public void Fail(string reason)
        {
            Debug.LogWarning($"Simulasi dihentikan: {reason}");
            scoringSystem?.Fail(); // skor jadi 0 agar layar hasil mencerminkan kegagalan
            SetPhase(Phase.Failed);
        }

        // ── Wiring sistem aturan (event-driven, §45-46) ────────────────────
        // ViolationSystem (deteksi, event-based) → ScoringSystem (pencatatan).
        // Tidak ada pengecekan "semua aturan setiap frame" di sini — pemicu
        // datang dari TriggerZone / TrafficLightController / VehicleController.

        [SerializeField] private ViolationSystem violationSystem = null!;
        [SerializeField] private ScoringSystem scoringSystem = null!;
        [SerializeField] private Rules.ChecklistManager checklist = null!;

        private bool _wired;

        /// <summary>
        /// Wire sistem aturan — dipakai scene bootstrap (komponen dibuat saat
        /// runtime sehingga tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void Configure(ViolationSystem violationSystem, ScoringSystem scoringSystem, Rules.ChecklistManager checklist)
        {
            if (this.violationSystem != null)
                this.violationSystem.ViolationOccurred -= OnViolation;

            this.violationSystem = violationSystem;
            this.scoringSystem = scoringSystem;
            this.checklist = checklist;

            if (this.violationSystem != null)
                this.violationSystem.ViolationOccurred += OnViolation;
            _wired = this.violationSystem != null;
        }

        private void OnEnable()
        {
            if (violationSystem != null && scoringSystem != null && !_wired)
            {
                violationSystem.ViolationOccurred += OnViolation;
                _wired = true;
            }
        }

        private void OnDisable()
        {
            if (violationSystem != null && _wired)
            {
                violationSystem.ViolationOccurred -= OnViolation;
                _wired = false;
            }
        }

        private void OnViolation(ViolationSystem.Violation violation)
        {
            // ObstacleHit punya bobot ringan sendiri (-3 poin, konsisten web),
            // bukan lewat AddViolation(severity) yang lebih berat.
            if (violation.Type == ViolationSystem.ViolationType.ObstacleHit)
                scoringSystem?.AddObstacleHit();
            else
                scoringSystem?.AddViolation(violation.Severity);
        }

        private void SetPhase(Phase phase)
        {
            if (CurrentPhase == phase) return;
            CurrentPhase = phase;
            PhaseChanged?.Invoke(phase);
        }
    }
}
