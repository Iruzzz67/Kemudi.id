using System.Text;
using Kemudi.Simulation.Core;
using UnityEngine;

namespace Kemudi.Simulation.Scene
{
    /// <summary>
    /// HUD IMGUI ringan untuk scene #1 — menampilkan petunjuk tiap fase
    /// (berjalan kaki, masuk kabin, checklist pra-jalan §43), speed/gear/RPM
    /// saat mengemudi, skor, dan layar hasil.
    ///
    /// Juga menangani input global: penalti waktu (§45), siklus kamera (C),
    /// dan restart (R). Transisi checklist → mengemudi ditangani
    /// SimulationManager (ChecklistCompleted), bukan lagi polling di sini.
    ///
    /// Ini pengganti sementara HudController (Canvas) sampai scene dibuat
    /// penuh di Editor dengan UI aset.
    /// </summary>
    public sealed class SceneHud : MonoBehaviour
    {
        private KemudiSceneBootstrap _bootstrap = null!;
        private readonly StringBuilder _sb = new();

        public void Bind(KemudiSceneBootstrap bootstrap) => _bootstrap = bootstrap;

        private void Update()
        {
            if (_bootstrap == null || !_bootstrap.RunStarted) return;
            var sim = _bootstrap.Simulation;
            if (sim == null) return;

            // Penalti waktu saat mengemudi (§45).
            if (sim.CurrentPhase == SimulationManager.Phase.Driving && _bootstrap.Scoring != null)
                _bootstrap.Scoring.TickTime(Time.deltaTime);

            // Siklus kamera TPV ↔ FPV ↔ TopDown (§34) saat berkendara.
            if (sim.CurrentPhase == SimulationManager.Phase.Driving
                && _bootstrap.Input != null && _bootstrap.Input.Current.CameraCycle
                && _bootstrap.CameraRig != null)
            {
                _bootstrap.CameraRig.CycleMode();
            }

            // Restart saat selesai/gagal.
            if (UnityEngine.Input.GetKeyDown(KeyCode.R))
            {
                if (sim.CurrentPhase == SimulationManager.Phase.Finished ||
                    sim.CurrentPhase == SimulationManager.Phase.Failed)
                {
                    _bootstrap.Restart();
                }
            }
        }

        private void OnGUI()
        {
            if (_bootstrap == null || !_bootstrap.RunStarted || _bootstrap.Simulation == null) return;
            var sim = _bootstrap.Simulation;

            switch (sim.CurrentPhase)
            {
                case SimulationManager.Phase.Walking:
                    DrawWalking(sim);
                    break;
                case SimulationManager.Phase.Entering:
                    DrawEntering();
                    break;
                case SimulationManager.Phase.PreDrive:
                    DrawChecklist(sim);
                    break;
                case SimulationManager.Phase.Driving:
                    DrawDriving();
                    break;
                case SimulationManager.Phase.Finished:
                    DrawResult(sim, finished: true);
                    break;
                case SimulationManager.Phase.Failed:
                    DrawResult(sim, finished: false);
                    break;
            }
        }

        /// <summary>Langkah 2: berjalan kaki menuju kendaraan.</summary>
        private void DrawWalking(SimulationManager sim)
        {
            var nearDoor = _bootstrap.Walker != null && _bootstrap.Walker.IsNearVehicle;

            _sb.Clear();
            _sb.AppendLine("MODE BERJALAN KAKI");
            _sb.AppendLine();
            _sb.AppendLine("Gerak   : W A S D / panah");
            _sb.AppendLine("Lari    : Shift");
            _sb.AppendLine("Lihat   : gerakkan mouse (klik kanan bila kursor bebas)");
            _sb.AppendLine("Masuk   : [E] saat berada di dekat kendaraan");
            _sb.AppendLine();
            _sb.AppendLine(nearDoor
                ? "▶ Dekat kendaraan — tekan [E] untuk masuk kabin."
                : "Dekati kendaraan yang diparkir di depan Anda.");

            GUI.Box(new Rect(12f, 60f, 420f, 170f), GUIContent.none);
            GUI.Label(new Rect(24f, 68f, 400f, 155f), _sb.ToString());

            // Prompt besar saat sudah di pintu.
            if (nearDoor)
            {
                const float w = 420f;
                var x = Screen.width * 0.5f - w * 0.5f;
                var y = Screen.height * 0.72f;
                GUI.Box(new Rect(x, y, w, 46f), GUIContent.none);
                GUI.Label(new Rect(x + 16f, y + 13f, w - 32f, 24f),
                    $"Tekan [E] untuk masuk {sim.CurrentVehicleType}");
            }
        }

        /// <summary>Langkah 3: masuk ke kabin (animasi pintu berjalan singkat).</summary>
        private void DrawEntering()
        {
            const float w = 360f;
            var x = Screen.width * 0.5f - w * 0.5f;
            var y = Screen.height * 0.5f - 30f;
            GUI.Box(new Rect(x, y, w, 60f), GUIContent.none);
            GUI.Label(new Rect(x + 20f, y + 20f, w - 40f, 24f), "Masuk ke kabin...");
        }

        /// <summary>Langkah 4: checklist pra-jalan (§43).</summary>
        private void DrawChecklist(SimulationManager sim)
        {
            var checklist = _bootstrap.Checklist;
            if (checklist == null) return;

            _sb.Clear();
            _sb.AppendLine("CHECKLIST PRA-JALAN — tekan tombol untuk mencentang:");
            foreach (var item in checklist.RequiredItems())
            {
                _sb.Append(checklist.IsDone(item) ? "  ✓ " : "  ○ ");
                _sb.AppendLine(checklist.LabelOf(item));
            }
            _sb.AppendLine();
            _sb.AppendLine("Mesin [I] · Rem tangan [Space] · Kopling [Shift] · Gigi [E]/[Q]");
            _sb.AppendLine("Sabuk [B] · Kursi [ · Spion ] atau [M]");
            _sb.AppendLine("Helm/Jaket/Sarung/Sepatu [H/J/G/F]");
            _sb.AppendLine("Gas [W] · Rem [S] · Setir [A]/[D] · Kamera [C] · Pause [P]");

            GUI.Box(new Rect(12f, 60f, 470f, 240f), GUIContent.none);
            GUI.Label(new Rect(24f, 68f, 450f, 225f), _sb.ToString());
        }

        /// <summary>Langkah 5–6: HUD berkendara.</summary>
        private void DrawDriving()
        {
            _sb.Clear();
            _sb.AppendLine($"Speed  : {Mathf.RoundToInt(SpeedKmh())} km/j");
            _sb.AppendLine($"Gigi   : {GearLabel()}");
            _sb.AppendLine($"RPM    : {Mathf.RoundToInt(Rpm())}");
            _sb.AppendLine($"Waktu  : {(_bootstrap.Simulation.ElapsedMs / 1000f):F1} s");
            _sb.AppendLine($"Skor   : {(_bootstrap.Scoring != null ? _bootstrap.Scoring.RoundedScore : 0)}");
            _sb.AppendLine($"Langkah: {(_bootstrap.Violations != null ? _bootstrap.Violations.Count : 0)} pelanggaran");

            GUI.Box(new Rect(12f, 60f, 250f, 150f), GUIContent.none);
            GUI.Label(new Rect(24f, 68f, 230f, 135f), _sb.ToString());
        }

        /// <summary>Langkah 7–8: skor & hasil akhir.</summary>
        private void DrawResult(SimulationManager sim, bool finished)
        {
            var title = finished ? "✅ SIMULASI SELESAI" : "❌ SIMULASI GAGAL";
            var score = _bootstrap.Scoring != null ? _bootstrap.Scoring.RoundedScore : 0;
            var violations = _bootstrap.Violations != null ? _bootstrap.Violations.Count : 0;
            var time = sim.ElapsedMs / 1000f;

            _sb.Clear();
            _sb.AppendLine(title);
            _sb.AppendLine();
            _sb.AppendLine($"Skor      : {score}/100");
            _sb.AppendLine($"Waktu     : {time:F1} s");
            _sb.AppendLine($"Pelanggaran: {violations}");
            if (!finished && !string.IsNullOrEmpty(sim.FailReason))
                _sb.AppendLine($"Alasan    : {sim.FailReason}");
            _sb.AppendLine();
            _sb.AppendLine("Tekan [R] untuk mengulang.");

            var w = 380f;
            var x = Screen.width * 0.5f - w * 0.5f;
            var y = Screen.height * 0.5f - 100f;
            GUI.Box(new Rect(x, y, w, 200f), GUIContent.none);
            GUI.Label(new Rect(x + 24f, y + 18f, w - 48f, 170f), _sb.ToString());
        }

        private float SpeedKmh()
        {
            var physics = _bootstrap.Vehicle != null
                ? _bootstrap.Vehicle.GetComponent<Vehicles.VehiclePhysics>()
                : null;
            return physics != null ? physics.SpeedKmh : 0f;
        }

        private string GearLabel()
        {
            var transmission = _bootstrap.Vehicle != null
                ? _bootstrap.Vehicle.Transmission
                : null;
            return transmission != null ? transmission.GearLabel : "-";
        }

        private float Rpm()
        {
            var engine = _bootstrap.Vehicle != null
                ? _bootstrap.Vehicle.Engine
                : null;
            return engine != null ? engine.Rpm : 0f;
        }
    }
}
