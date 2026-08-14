using Kemudi.Simulation.Performance;
using Kemudi.Simulation.Rules;
using Kemudi.Simulation.Vehicles;
using UnityEngine;

// NOTE: namespace dinamai Diagnostics — bukan `Debug` — karena namespace
// `Kemudi.Simulation.Debug` akan menaungi UnityEngine.Debug di semua file
// dalam hierarki Kemudi.Simulation.* (error CS0234 saat Debug.Log dipakai).
namespace Kemudi.Simulation.Diagnostics
{
    /// <summary>
    /// Debug overlay (§52): FPS, CPU/GPU, kecepatan kendaraan, RPM, gigi,
    /// kemudi, pelanggaran, zona, dan state fisika. HANYA aktif pada
    /// Development Build (UnityEngine.Debug.isDebugBuild).
    /// </summary>
    public sealed class DebugOverlay : MonoBehaviour
    {
        [SerializeField] private PerformanceManager? performance;
        [SerializeField] private VehiclePhysics? vehiclePhysics;
        [SerializeField] private VehicleController? vehicleController;
        [SerializeField] private ViolationSystem? violations;

        [SerializeField] private GUIStyle? style;

        private void Awake()
        {
            if (!Debug.isDebugBuild)
                Destroy(gameObject); // jangan pernah tampil di release
        }

        private void OnGUI()
        {
            if (!Debug.isDebugBuild) return;

            var fps = performance != null ? performance.CurrentFps : 1f / Mathf.Max(1e-4f, Time.unscaledDeltaTime);
            var lines = new System.Text.StringBuilder();
            lines.AppendLine($"FPS: {fps:F0}  |  Frame: {Time.unscaledDeltaTime * 1000f:F1} ms");
            lines.AppendLine($"Quality: {(performance != null ? performance.CurrentQuality : Performance.PerformanceManager.QualityLevel.High)}");
            if (vehiclePhysics != null)
                lines.AppendLine($"Speed: {vehiclePhysics.SpeedKmh:F0} km/h");
            if (vehicleController != null)
                lines.AppendLine($"Steer: {vehicleController.SteeringInput:F2}  |  Handbrake: {vehicleController.HandbrakeActive}");
            if (violations != null)
                lines.AppendLine($"Violations: {violations.Count}");
            lines.AppendLine($"Physics step: {Time.fixedDeltaTime:F4} s  |  Time scale: {Time.timeScale:F2}");

            var box = new Rect(10f, 10f, 320f, 140f);
            GUI.Box(box, GUIContent.none);
            GUI.Label(new Rect(20f, 18f, 300f, 130f), lines.ToString(), style);
        }
    }
}
