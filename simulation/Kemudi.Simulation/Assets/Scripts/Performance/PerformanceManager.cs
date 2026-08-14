using System;
using System.Collections.Generic;
using Kemudi.Simulation.Environment;
using Kemudi.Simulation.Traffic;
using UnityEngine;

namespace Kemudi.Simulation.Performance
{
    /// <summary>
    /// PerformanceManager (§52-56): monitor FPS, preset kualitas
    /// LOW/MEDIUM/HIGH, dan penurunan bertahap saat FPS di bawah target
    /// (adaptive). Urutan pengurangan: traffic → shadow → efek → LOD.
    /// </summary>
    public sealed class PerformanceManager : MonoBehaviour
    {
        public enum QualityLevel { Low, Medium, High }

        [System.Serializable]
        public sealed class QualityPreset
        {
            [Header("Rendering")]
            public float ShadowDistance = 40f;
            public float LodBias = 1f;
            public int MaxLights = 4;

            [Header("Simulasi (budget)")]
            public int TrafficBudget = 6;
            public int PedestrianCrossings = 2;
        }

        [Header("Presets (§54)")]
        [SerializeField] private QualityPreset low = new()
        {
            ShadowDistance = 0f, LodBias = 1.6f, MaxLights = 2,
            TrafficBudget = 3, PedestrianCrossings = 1
        };
        [SerializeField] private QualityPreset medium = new()
        {
            ShadowDistance = 25f, LodBias = 1.2f, MaxLights = 4,
            TrafficBudget = 5, PedestrianCrossings = 2
        };
        [SerializeField] private QualityPreset high = new()
        {
            ShadowDistance = 50f, LodBias = 1f, MaxLights = 8,
            TrafficBudget = 8, PedestrianCrossings = 3
        };

        [Header("Target FPS (§53)")]
        [SerializeField, Range(30f, 120f)] private float targetFps = 72f;
        [SerializeField, Range(1f, 10f)] private float degradeAfterSeconds = 3f;
        [SerializeField, Range(1f, 30f)] private float upgradeAfterSeconds = 15f;

        [Header("Dependencies")]
        [SerializeField] private TrafficManager? traffic;
        [SerializeField] private PedestrianManager? pedestrians;

        [Header("Adaptive ($55)")]
        [SerializeField] private bool adaptiveEnabled = true;

        public QualityLevel CurrentQuality { get; private set; } = QualityLevel.High;
        public float CurrentFps { get; private set; } = 60f;

        private readonly Queue<float> _frameTimes = new();
        private const int FrameWindow = 30;

        private float _degradeTimer;
        private float _upgradeTimer;
        private bool _standalone;

        private void Awake()
        {
            _standalone = Application.isMobilePlatform; // Quest = mobile platform
            ApplyQuality(CurrentQuality);
        }

        private void Update()
        {
            // FPS monitor: rata-rata jendela 30 frame.
            _frameTimes.Enqueue(Time.unscaledDeltaTime);
            if (_frameTimes.Count > FrameWindow) _frameTimes.Dequeue();

            var total = 0f;
            foreach (var t in _frameTimes) total += t;
            CurrentFps = _frameTimes.Count > 0 ? _frameTimes.Count / Mathf.Max(1e-4f, total) : 0f;

            if (!adaptiveEnabled) return;

            // Turun satu tingkat setelah FPS < target beberapa detik.
            if (CurrentFps < targetFps && CurrentQuality != QualityLevel.Low)
            {
                _degradeTimer += Time.unscaledDeltaTime;
                _upgradeTimer = 0f;
                if (_degradeTimer >= degradeAfterSeconds)
                {
                    _degradeTimer = 0f;
                    StepQuality(-1);
                }
            }
            // Naik lagi hanya jika FPS nyaman dalam waktu lama.
            else if (CurrentFps > targetFps + 5f && CurrentQuality != QualityLevel.High)
            {
                _upgradeTimer += Time.unscaledDeltaTime;
                _degradeTimer = 0f;
                if (_upgradeTimer >= upgradeAfterSeconds)
                {
                    _upgradeTimer = 0f;
                    StepQuality(+1);
                }
            }
            else
            {
                _degradeTimer = 0f;
                _upgradeTimer = 0f;
            }
        }

        private void StepQuality(int direction)
        {
            var next = (int)CurrentQuality + direction;
            CurrentQuality = (QualityLevel)Mathf.Clamp(next, (int)QualityLevel.Low, (int)QualityLevel.High);
            ApplyQuality(CurrentQuality);
            Debug.Log($"[Kemudi.Performance] Kualitas -> {CurrentQuality} (FPS {CurrentFps:F0})");
        }

        private void ApplyQuality(QualityLevel level)
        {
            var preset = level switch
            {
                QualityLevel.Low => low,
                QualityLevel.High => high,
                _ => medium
            };

            // Rendering (kualitas global Unity + jarak shadow/LOD).
            QualitySettings.shadowDistance = preset.ShadowDistance;
            QualitySettings.lodBias = preset.LodBias;
            QualitySettings.maximumLODLevel = level == QualityLevel.Low ? 1 : 0;

            // Budget simulasi — dipakai TrafficManager/PedestrianManager.
            traffic?.SetBudget(_standalone ? preset.TrafficBudget : Mathf.Max(preset.TrafficBudget, 8));
            pedestrians?.SetBudget(preset.PedestrianCrossings);
        }

        public QualityPreset CurrentPreset() => CurrentQuality switch
        {
            QualityLevel.Low => low,
            QualityLevel.High => high,
            _ => medium
        };
    }
}
