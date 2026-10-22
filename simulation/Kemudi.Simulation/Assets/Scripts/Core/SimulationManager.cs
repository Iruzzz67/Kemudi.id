using System;
using Kemudi.Simulation.Rules;
using Kemudi.Simulation.Vehicles;
using UnityEngine;

namespace Kemudi.Simulation.Core
{
    /// <summary>
    /// Orkestrator fase simulasi (padanan <c>simStore.phase</c> di versi web).
    ///
    /// Alur mengikuti SIMULASI.md §5:
    ///   1. Selecting   — pilih kendaraan &amp; transmisi (MainMenuUI)
    ///   2. Walking     — berjalan kaki menuju kendaraan
    ///   3. Entering    — masuk ke kabin (animasi pintu)
    ///   4. PreDrive    — checklist pra-berkendara
    ///   5. Driving     — mesin menyala &amp; lintasan dijalani
    ///   6. Finished / Failed — skor &amp; hasil akhir
    /// </summary>
    public sealed class SimulationManager : MonoBehaviour
    {
        public enum Phase { Selecting, Walking, Entering, PreDrive, Driving, Finished, Failed }

        /// <summary>Lama fase Entering (buka → masuk → tutup pintu) sebelum checklist.</summary>
        private const float EnteringDurationSeconds = 0.9f;

        public event Action<Phase>? PhaseChanged;

        public Phase CurrentPhase { get; private set; } = Phase.Selecting;
        public float ElapsedMs { get; private set; }
        public string FailReason { get; private set; } = string.Empty;

        /// <summary>Percobaan sudah dimulai (menu pilih kendaraan disembunyikan).</summary>
        public bool RunStarted => CurrentPhase != Phase.Selecting;

        // ── Konfigurasi percobaan (dipilih di layar Selecting) ─────────────
        public VehicleConfig.VehicleType CurrentVehicleType { get; set; } = VehicleConfig.VehicleType.Mobil;
        public bool IsManualTransmission { get; set; }

        // ── Sub-sistem (di-wire oleh KemudiSceneBootstrap) ─────────────────
        public ViolationSystem Violations { get; private set; } = null!;
        public ScoringSystem Scoring { get; private set; } = null!;
        public ChecklistManager Checklist { get; private set; } = null!;

        [Header("Batas gagal")]
        [Tooltip("Pelanggaran aturan (tanpa rintangan) yang membuat latihan dihentikan.")]
        [SerializeField] private int failViolationLimit = 6;

        private float _enteringTimer;

        private void Update()
        {
            switch (CurrentPhase)
            {
                case Phase.Entering:
                    _enteringTimer += Time.deltaTime;
                    if (_enteringTimer >= EnteringDurationSeconds) BeginPreDrive();
                    break;

                case Phase.Driving:
                    ElapsedMs += Time.deltaTime * 1000f;
                    break;
            }
        }

        private void OnDestroy()
        {
            if (Violations != null) Violations.ViolationOccurred -= OnViolation;
            if (Checklist != null) Checklist.ChecklistCompleted -= OnChecklistCompleted;
        }

        public void Configure(ViolationSystem violations, ScoringSystem scoring, ChecklistManager checklist)
        {
            Violations = violations;
            Scoring = scoring;
            Checklist = checklist;

            if (Violations != null) Violations.ViolationOccurred += OnViolation;
            if (Checklist != null) Checklist.ChecklistCompleted += OnChecklistCompleted;
        }

        // ── Alur §5 ────────────────────────────────────────────────────────

        /// <summary>Langkah 1→2: setelah memilih kendaraan, mulai dari mode berjalan kaki.</summary>
        public void StartSimulation()
        {
            ResetRun();
            BeginWalking();
        }

        /// <summary>Langkah 2: pengguna muncul di area parkir dan berjalan kaki.</summary>
        public void BeginWalking() => SetPhase(Phase.Walking);

        /// <summary>Langkah 3: masuk ke kabin (dipanggil WalkingController saat di pintu).</summary>
        public void EnterVehicle()
        {
            if (CurrentPhase != Phase.Walking) return;
            _enteringTimer = 0f;
            SetPhase(Phase.Entering);
        }

        /// <summary>Langkah 4: checklist pra-berkendara (§43).</summary>
        public void BeginPreDrive()
        {
            if (CurrentPhase != Phase.PreDrive && CurrentPhase != Phase.Entering) return;

            if (Checklist != null)
            {
                Checklist.MarkDone(ChecklistManager.Item.EnteredVehicle);
                Checklist.MarkDone(ChecklistManager.Item.DoorClosed);
            }

            SetPhase(Phase.PreDrive);
        }

        /// <summary>Langkah 5: checklist selesai → berkendara (timer mulai).</summary>
        public void CompletePreDrive()
        {
            if (CurrentPhase != Phase.PreDrive) return;
            ElapsedMs = 0f;
            SetPhase(Phase.Driving);
        }

        /// <summary>Langkah 7a: melewati garis finish.</summary>
        public void Finish()
        {
            if (CurrentPhase == Phase.Finished || CurrentPhase == Phase.Failed) return;
            Scoring?.Finish();
            SetPhase(Phase.Finished);
        }

        /// <summary>Langkah 7b: latihan dihentikan (mis. terlalu banyak pelanggaran).</summary>
        public void Fail(string reason)
        {
            if (CurrentPhase == Phase.Finished || CurrentPhase == Phase.Failed) return;
            FailReason = reason;
            Debug.LogWarning($"[Kemudi.Sim] Simulasi dihentikan: {reason}");
            Scoring?.Fail();
            SetPhase(Phase.Failed);
        }

        /// <summary>Langkah 8 selesai → kembali ke layar pilih kendaraan.</summary>
        public void ReturnToSelecting()
        {
            ElapsedMs = 0f;
            FailReason = string.Empty;
            SetPhase(Phase.Selecting);
        }

        // ── Internal ───────────────────────────────────────────────────────

        private void ResetRun()
        {
            ElapsedMs = 0f;
            FailReason = string.Empty;
            Violations?.Reset();
            Scoring?.Reset();
            Checklist?.Reset(CurrentVehicleType, IsManualTransmission);
        }

        private void OnChecklistCompleted()
        {
            if (CurrentPhase != Phase.PreDrive) return;
            Scoring?.AddChecklistBonus();
            CompletePreDrive();
        }

        /// <summary>
        /// Pelanggaran → skor (rintangan dipisah dari pelanggaran aturan,
        /// konsisten dengan laporan hasil §62) dan cek batas gagal.
        /// </summary>
        private void OnViolation(ViolationSystem.Violation violation)
        {
            switch (violation.Type)
            {
                case ViolationSystem.ViolationType.ObstacleHit:
                    Scoring?.AddObstacleHit();
                    break;
                case ViolationSystem.ViolationType.OffRoad:
                    Scoring?.AddOffRoad();
                    break;
                case ViolationSystem.ViolationType.Collision:
                    Scoring?.AddCollision();
                    break;
                default:
                    Scoring?.AddViolation(violation.Severity);
                    break;
            }

            if (CurrentPhase != Phase.Driving || Violations == null) return;

            var ruleViolations = Violations.Count - Violations.CountOf(ViolationSystem.ViolationType.ObstacleHit);
            if (ruleViolations >= failViolationLimit)
                Fail($"Terlalu banyak pelanggaran ({ruleViolations}). Latihan dihentikan.");
        }

        private void SetPhase(Phase phase)
        {
            if (CurrentPhase == phase) return;
            CurrentPhase = phase;
            PhaseChanged?.Invoke(phase);
        }
    }
}
