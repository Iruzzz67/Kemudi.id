using System.Text;
using Kemudi.Simulation.Core;
using Kemudi.Simulation.Rules;
using Kemudi.Simulation.Vehicles;
using UnityEngine;
using UnityEngine.UI;

namespace Kemudi.Simulation.UI
{
    /// <summary>
    /// HUD Canvas (§42): speed, gear, RPM, engine, handbrake, sein, lampu,
    /// timer, skor, pelanggaran, warning. Informasi non-real-time di-update
    /// 5–10 Hz; warning & skor event-driven (tampil seketika).
    /// </summary>
    public sealed class HudController : MonoBehaviour
    {
        [Header("Referensi")]
        [SerializeField] private SimulationManager simulation = null!;
        [SerializeField] private ScoringSystem scoring = null!;
        [SerializeField] private ViolationSystem violations = null!;
        [SerializeField] private VehiclePhysics vehiclePhysics = null!;
        [SerializeField] private VehicleController vehicleController = null!;
        [SerializeField] private Transmission.TransmissionController transmission = null!;
        [SerializeField] private ChecklistManager checklist = null!;

        [Header("Teks UI")]
        [SerializeField] private Text speedText = null!;
        [SerializeField] private Text gearText = null!;
        [SerializeField] private Text rpmText = null!;
        [SerializeField] private Text statusText = null!;
        [SerializeField] private Text timerText = null!;
        [SerializeField] private Text scoreText = null!;
        [SerializeField] private Text violationsText = null!;
        [SerializeField] private Text warningText = null!;
        [SerializeField] private Text checklistText = null!;

        [Header("Update (Hz)")]
        [SerializeField, Range(1f, 30f)] private float updateHz = 10f;

        private readonly StringBuilder _sb = new();
        private float _timer;
        private float _warningUntil;

        private void OnEnable()
        {
            if (violations != null) violations.ViolationOccurred += OnViolation;
        }

        private void OnDisable()
        {
            if (violations != null) violations.ViolationOccurred -= OnViolation;
        }

        private void Update()
        {
            _timer += Time.deltaTime;
            var interval = 1f / Mathf.Max(1f, updateHz);
            if (_timer >= interval)
            {
                _timer = 0f;
                Refresh();
            }

            if (warningText != null)
            {
                warningText.gameObject.SetActive(Time.time < _warningUntil);
                if (Time.time < _warningUntil)
                    warningText.text = _sb.ToString();
            }
        }

        private void OnViolation(ViolationSystem.Violation violation)
        {
            _warningUntil = Time.time + 3f;
            _sb.Clear();
            _sb.Append(violation.Description);
            if (scoreText != null && scoring != null)
                scoreText.text = $"Skor: {scoring.RoundedScore}";
            if (violationsText != null)
                violationsText.text = $"Pelanggaran: {violations.Count}";
        }

        private void Refresh()
        {
            if (speedText != null && vehiclePhysics != null)
                speedText.text = $"{Mathf.RoundToInt(vehiclePhysics.SpeedKmh)} km/j";

            if (gearText != null)
                gearText.text = transmission != null ? $"Gigi: {transmission.GearLabel}" : "";

            if (rpmText != null)
                rpmText.text = vehicleController != null && vehicleController.Engine != null
                    ? $"RPM: {Mathf.RoundToInt(vehicleController.Engine.Rpm)}"
                    : "RPM: 0";

            if (timerText != null && simulation != null)
                timerText.text = $"{(simulation.ElapsedMs / 1000f):F1}s";

            if (scoreText != null && scoring != null)
                scoreText.text = $"Skor: {scoring.RoundedScore}";

            if (violationsText != null && violations != null)
                violationsText.text = $"Pelanggaran: {violations.Count}";

            if (statusText != null)
            {
                var status = new StringBuilder();
                status.Append(transmission != null && transmission.IsReverse ? "R " : "");
                if (checklist != null && checklist.IsComplete)
                    status.Append("✓ Checklist");
                statusText.text = status.ToString();
            }

            if (checklistText != null && checklist != null)
            {
                _sb.Clear();
                foreach (var item in checklist.RequiredItems())
                {
                    _sb.Append(checklist.IsDone(item) ? "✓ " : "○ ");
                    _sb.AppendLine(checklist.LabelOf(item));
                }
                checklistText.text = _sb.ToString();
            }
        }
    }
}
