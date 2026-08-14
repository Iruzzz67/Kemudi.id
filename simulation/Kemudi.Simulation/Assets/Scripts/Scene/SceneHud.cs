using System.Text;
using Kemudi.Simulation.Core;
using UnityEngine;

namespace Kemudi.Simulation.Scene
{
    /// <summary>
    /// HUD IMGUI ringan untuk scene #1 — menampilkan fase, checklist pra-jalan
    /// (§43), speed/gear/RPM saat mengemudi, skor, dan layar hasil.
    ///
    /// Juga menjembatani alur: checklist selesai → CompletePreDrive → Driving,
    /// penalti waktu (scoring.TickTime), siklus kamera (C), dan restart (R).
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

            // Checklist selesai → mulai mengemudi.
            if (sim.CurrentPhase == SimulationManager.Phase.PreDrive &&
                _bootstrap.Checklist != null && _bootstrap.Checklist.IsComplete)
            {
                sim.CompletePreDrive();
            }

            // Penalti waktu saat mengemudi (§45).
            if (sim.CurrentPhase == SimulationManager.Phase.Driving && _bootstrap.Scoring != null)
                _bootstrap.Scoring.TickTime(Time.deltaTime);

            // Siklus kamera TPV ↔ FPV (§34).
            if (_bootstrap.Input != null && _bootstrap.Input.Current.CameraCycle && _bootstrap.CameraRig != null)
                _bootstrap.CameraRig.CycleMode();

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
            _sb.AppendLine("Sabuk [B] · Kursi: key '[' · Spion: key ']' · Helm/Jaket/Sarung/Sepatu [H/J/G/F]");
            _sb.AppendLine("Gas [W] · Rem [S] · Setir [A]/[D] · Kamera [C] · Pause [P]");

            GUI.Box(new Rect(12f, 60f, 440f, 210f), GUIContent.none);
            GUI.Label(new Rect(24f, 68f, 420f, 195f), _sb.ToString());
        }

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
            _sb.AppendLine();
            _sb.AppendLine("Tekan [R] untuk mengulang.");

            var w = 340f;
            var x = Screen.width * 0.5f - w * 0.5f;
            var y = Screen.height * 0.5f - 90f;
            GUI.Box(new Rect(x, y, w, 180f), GUIContent.none);
            GUI.Label(new Rect(x + 24f, y + 18f, w - 48f, 150f), _sb.ToString());
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
