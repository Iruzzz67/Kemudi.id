using UnityEngine;

namespace Kemudi.Simulation.Audio
{
    /// <summary>
    /// Suara kendaraan: engine mengikuti RPM, skid, klakson, sein, warning.
    /// Audio di-mix terpisah per kategori (Engine/Vehicle/Environment/UI/VR).
    /// </summary>
    public sealed class VehicleAudioSystem : MonoBehaviour
    {
        [Header("Engine")]
        [SerializeField] private AudioSource engineSource = null!;
        [SerializeField] private AudioClip? engineLoop;
        [SerializeField] private float basePitch = 0.7f;
        [SerializeField] private float maxPitch = 1.6f;

        [Header("Klakson & sein")]
        [SerializeField] private AudioSource? hornSource;
        [SerializeField] private AudioClip? hornClip;
        [SerializeField] private AudioSource? indicatorSource;
        [SerializeField] private AudioClip? indicatorClip;

        public bool Muted { get; set; }

        public void SetEngineRpmRatio(float ratio)
        {
            if (engineSource == null) return;
            engineSource.pitch = Mathf.Lerp(basePitch, maxPitch, Mathf.Clamp01(ratio));
        }

        public void SetEngineRunning(bool running)
        {
            if (engineSource == null) return;
            if (engineSource.clip == null && engineLoop != null)
                engineSource.clip = engineLoop;
            if (running && !engineSource.isPlaying) engineSource.Play();
            else if (!running) engineSource.Stop();
        }

        public void Honk(bool held)
        {
            if (hornSource == null || hornClip == null) return;
            if (held && !hornSource.isPlaying) hornSource.PlayOneShot(hornClip);
        }

        public void TickIndicator(bool blinkOn)
        {
            if (indicatorSource == null || indicatorClip == null) return;
            if (blinkOn && !indicatorSource.isPlaying) indicatorSource.PlayOneShot(indicatorClip);
        }

        public void SetMuted(bool muted)
        {
            Muted = muted;
            var listener = FindObjectOfType<AudioListener>();
            if (listener != null) AudioListener.volume = muted ? 0f : 1f;
        }

        public void Silence()
        {
            if (engineSource != null) engineSource.Stop();
            if (hornSource != null) hornSource.Stop();
        }
    }
}
