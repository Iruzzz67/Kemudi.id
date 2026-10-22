using System;
using UnityEngine;

namespace Kemudi.Simulation.Traffic
{
    /// <summary>
    /// Lampu lalu lintas — state machine GREEN → YELLOW → RED (§39).
    /// Satu controller dapat mengontrol beberapa persimpangan jika di-assign
    /// bersama (offset ditambah per fase). Visual cukup emisif material —
    /// tidak perlu animasi kompleks atau realtime light.
    /// </summary>
    public sealed class TrafficLightController : MonoBehaviour
    {
        public enum LightPhase { Green, Yellow, Red }

        [Header("Siklus (detik)")]
        [SerializeField] private float greenDuration = 6f;
        [SerializeField] private float yellowDuration = 1.5f;
        [SerializeField] private float redDuration = 4f;
        [Tooltip("Offset fase (detik) agar beberapa lampu tidak sinkron.")]
        [SerializeField] private float phaseOffset;

        public event Action<LightPhase>? PhaseChanged;

        public LightPhase CurrentPhase { get; private set; } = LightPhase.Green;

        /// <summary>Z (world) garis berhenti — dipakai AI untuk berhenti.</summary>
        public float StopLineZ => transform.position.z;

        [SerializeField] private Renderer[] lightRenderers = Array.Empty<Renderer>();
        [SerializeField] private Material? redMaterial;
        [SerializeField] private Material? yellowMaterial;
        [SerializeField] private Material? greenMaterial;

        private static readonly int EmissionColor = Shader.PropertyToID("_EmissionColor");

        private void Awake()
        {
            // Mulai siklus dari offset; Update akan men-sinkronkan fase.
            CurrentPhase = PhaseAt(Time.time + phaseOffset);
            ApplyVisual(CurrentPhase);
        }

        /// <summary>
        /// Wire renderer + material — dipakai scene bootstrap (komponen dibuat
        /// saat runtime sehingga tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void Configure(Renderer[] renderers, Material? red, Material? yellow, Material? green)
        {
            lightRenderers = renderers ?? Array.Empty<Renderer>();
            redMaterial = red;
            yellowMaterial = yellow;
            greenMaterial = green;
            ApplyVisual(CurrentPhase);
        }

        private void Update()
        {
            var phase = PhaseAt(Time.time + phaseOffset);
            if (phase == CurrentPhase) return;
            CurrentPhase = phase;
            ApplyVisual(phase);
            PhaseChanged?.Invoke(phase);
        }

        private LightPhase PhaseAt(float t)
        {
            var cycle = greenDuration + yellowDuration + redDuration;
            var m = t % cycle;
            if (m < greenDuration) return LightPhase.Green;
            if (m < greenDuration + yellowDuration) return LightPhase.Yellow;
            return LightPhase.Red;
        }

        public bool MustStop => CurrentPhase != LightPhase.Green;

        private void ApplyVisual(LightPhase phase)
        {
            if (lightRenderers == null) return;
            var mat = phase switch
            {
                LightPhase.Green => greenMaterial,
                LightPhase.Yellow => yellowMaterial,
                _ => redMaterial
            };
            if (mat == null) return;
            foreach (var r in lightRenderers)
            {
                if (r == null) continue;
                r.sharedMaterial = mat;
                // Emisif sederhana (tanpa realtime light — §28).
                if (r.material.HasProperty(EmissionColor))
                {
                    r.material.EnableKeyword("_EMISSION");
                    r.material.SetColor(EmissionColor, mat.color * 1.4f);
                }
            }
        }
    }
}
