using UnityEngine;

namespace Kemudi.Simulation.Audio
{
    /// <summary>
    /// Suara kendaraan berbasis CLIP + crossfade (§41) — bukan synthesizer
    /// CPU-heavy. 3–4 clip (idle, low, high) dicampur dengan pitch & volume
    /// mengikuti RPM. Kategori suara dipisah via AudioMixer di scene.
    /// </summary>
    public sealed class VehicleAudioSystem : MonoBehaviour
    {
        [Header("Engine (crossfade idle → low → high)")]
        [SerializeField] private AudioSource engineLow = null!;
        [SerializeField] private AudioSource engineHigh = null!;
        [SerializeField] private AudioClip? idleClip;
        [SerializeField] private AudioClip? lowRpmClip;
        [SerializeField] private AudioClip? highRpmClip;
        [SerializeField] private float idlePitch = 0.7f;
        [SerializeField] private float maxPitch = 1.6f;
        [SerializeField] private float crossfadeSpeed = 4f;

        [Header("Klakson & sein")]
        [SerializeField] private AudioSource? hornSource;
        [SerializeField] private AudioClip? hornClip;
        [SerializeField] private AudioSource? indicatorSource;
        [SerializeField] private AudioClip? indicatorClip;

        public bool Muted { get; set; }

        private float _lowVolume = 1f;

        /// <summary>Ratio RPM 0..1 menentukan pitch + crossfade antar clip.</summary>
        public void SetEngineRpmRatio(float ratio)
        {
            if (engineLow == null || engineHigh == null) return;

            var r = Mathf.Clamp01(ratio);
            var targetLow = Mathf.Clamp01(1f - r * 1.6f); // low memudar menuju high
            _lowVolume = Mathf.Clamp01(Mathf.MoveTowards(_lowVolume, targetLow, crossfadeSpeed * Time.deltaTime));
            engineLow.volume = _lowVolume;
            engineHigh.volume = 1f - _lowVolume;

            var pitch = Mathf.Lerp(idlePitch, maxPitch, r);
            engineLow.pitch = pitch;
            engineHigh.pitch = pitch;
        }

        public void SetEngineRunning(bool running)
        {
            if (engineLow == null) return;
            Assign(engineLow, idleClip != null ? idleClip : lowRpmClip);
            Assign(engineHigh, highRpmClip);

            if (running)
            {
                if (!engineLow.isPlaying) engineLow.Play();
                if (!engineHigh.isPlaying) engineHigh.Play();
            }
            else
            {
                engineLow.Stop();
                engineHigh.Stop();
            }
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
            if (engineLow != null) engineLow.Stop();
            if (engineHigh != null) engineHigh.Stop();
            if (hornSource != null) hornSource.Stop();
        }

        private static void Assign(AudioSource source, AudioClip? clip)
        {
            if (clip != null && source.clip != clip)
                source.clip = clip;
        }
    }
}
