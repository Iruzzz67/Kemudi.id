using UnityEngine;

namespace Kemudi.Simulation.Rules
{
    /// <summary>
    /// Sistem penilaian 0-100 dengan bobot konfigurabel (bukan hard-code di
    /// VehicleController). Input: pelanggaran, off-road, tabrakan, waktu,
    /// checklist, kelancaran.
    /// </summary>
    [System.Serializable]
    public sealed class ScoringConfig
    {
        [Header("Bobot (total 100)")]
        [Range(0, 100)] public float BaseScore = 100f;
        [Range(0, 10)] public float PenaltyPerViolation = 8f;
        [Range(0, 5)] public float PenaltyPerOffRoad = 4f;
        [Range(0, 5)] public float PenaltyPerObstacleHit = 3f;
        [Range(0, 10)] public float PenaltyPerCollision = 12f;
        [Range(0, 1)] public float TimeDecayPerSecond = 0.05f;
        [Range(0, 20)] public float ChecklistBonus = 5f;
    }

    public sealed class ScoringSystem : MonoBehaviour
    {
        [SerializeField] private ScoringConfig config = new();
        // Batas gagal (jumlah pelanggaran) dikelola SimulationManager agar
        // keputusan fase (Fail) tetap satu pintu.

        public float Score { get; private set; } = 100f;
        public bool Finished { get; private set; }
        public bool Failed { get; private set; }

        public void Reset(ScoringConfig? overrides = null)
        {
            if (overrides != null) config = overrides;
            Score = config.BaseScore;
            Finished = false;
            Failed = false;
        }

        public void AddViolation(int severity)
        {
            Score = Mathf.Max(0f, Score - config.PenaltyPerViolation * severity);
        }

        public void AddOffRoad() => Score = Mathf.Max(0f, Score - config.PenaltyPerOffRoad);

        /// <summary>Menabrak rintangan lintasan (cone/barrier/kendaraan) — §62.</summary>
        public void AddObstacleHit() => Score = Mathf.Max(0f, Score - config.PenaltyPerObstacleHit);

        public void AddCollision() => Score = Mathf.Max(0f, Score - config.PenaltyPerCollision);

        public void AddChecklistBonus() => Score = Mathf.Min(100f, Score + config.ChecklistBonus);

        public void TickTime(float deltaSeconds)
            => Score = Mathf.Max(0f, Score - config.TimeDecayPerSecond * deltaSeconds);

        public void Finish() => Finished = true;

        public void Fail() { Failed = true; Finished = true; Score = 0f; }

        public int RoundedScore => Mathf.RoundToInt(Score);
    }
}
