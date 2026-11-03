using System;
using Kemudi.Simulation.Rules;
using Kemudi.Simulation.Transmission;
using Kemudi.Simulation.Vehicles;
using UnityEngine;

namespace Kemudi.Simulation.Core
{
    /// <summary>
    /// Orkestrator fase simulasi: Selecting → Walking → Entering → PreDrive
    /// → Driving → Finished/Failed. Padanan <c>simStore.phase</c> di web.
    ///
    /// Alur lengkap (§10, §35):
    ///   1. Selecting — pilih kendaraan & transmisi
    ///   2. Walking — karakter berjalan ke kendaraan
    ///   3. Entering — animasi masuk kendaraan
    ///   4. PreDrive — checklist pra-jalan (§43)
    ///   5. Driving — simulasi aktif
    ///   6. Finished/Failed — skor & laporan
    /// </summary>
    public sealed class SimulationManager : MonoBehaviour
    {
        public enum Phase { Selecting, Walking, Entering, PreDrive, Driving, Finished, Failed }

        public event Action<Phase>? PhaseChanged;

        public Phase CurrentPhase { get; private set; } = Phase.Selecting;
        public float ElapsedMs { get; private set; }

        // ── Konfigurasi percobaan (di-set oleh KemudiSceneBootstrap) ──────
        public VehicleConfig.VehicleType CurrentVehicleType { get; set; } = VehicleConfig.VehicleType.Mobil;
        public bool IsManualTransmission { get; set; }

        // ── Dependency (di-wire oleh KemudiSceneBootstrap.BuildManagers) ───
        private ViolationSystem? _violations;
        private ScoringSystem? _scoring;
        private ChecklistManager? _checklist;

        /// <summary>
        /// Wire dependency — dipanggil sekali oleh KemudiSceneBootstrap.
        /// </summary>
        public void Configure(ViolationSystem violations, ScoringSystem scoring, ChecklistManager checklist)
        {
            _violations = violations;
            _scoring = scoring;
            _checklist = checklist;
        }

        private void Update()
        {
            if (CurrentPhase == Phase.Driving)
                ElapsedMs += Time.deltaTime * 1000f;
        }

        // ── Transisi fase ─────────────────────────────────────────────────

        /// <summary>Mulai simulasi dari fase Selecting → Walking (§35).</summary>
        public void StartSimulation()
        {
            ElapsedMs = 0f;
            SetPhase(Phase.Walking);
        }

        public void StartWalking() => SetPhase(Phase.Walking);

        public void EnterVehicle() => SetPhase(Phase.Entering);

        /// <summary>Masuk ke PreDrive (checklist pra-jalan §43).</summary>
        public void BeginPreDrive()
        {
            _checklist?.Reset(CurrentVehicleType, IsManualTransmission);
            SetPhase(Phase.PreDrive);
        }

        /// <summary>Checklist selesai → mulai mengemudi (§43 → §44).</summary>
        public void CompletePreDrive() => SetPhase(Phase.Driving);

        public void StartDriving()
        {
            ElapsedMs = 0f;
            _checklist?.Reset(CurrentVehicleType, IsManualTransmission);
            _scoring?.Reset();
            _violations?.ResetCount();
            SetPhase(Phase.Driving);
        }

        public void Finish() => SetPhase(Phase.Finished);

        public void Fail(string reason)
        {
            Debug.LogWarning($"Simulasi dihentikan: {reason}");
            _scoring?.Fail();
            SetPhase(Phase.Failed);
        }

        /// <summary>Kembali ke Selecting (restart, §48).</summary>
        public void ReturnToSelecting()
        {
            ElapsedMs = 0f;
            _scoring?.Reset();
            _violations?.ResetCount();
            SetPhase(Phase.Selecting);
        }

        private void SetPhase(Phase phase)
        {
            if (CurrentPhase == phase) return;
            CurrentPhase = phase;
            PhaseChanged?.Invoke(phase);
        }
    }
}
