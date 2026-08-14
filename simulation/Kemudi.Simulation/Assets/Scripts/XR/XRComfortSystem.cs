using UnityEngine;

namespace Kemudi.Simulation.XR
{
    /// <summary>
    /// Vignette dinamis anti motion sickness: FOV dipersempit saat akselerasi
    /// tinggi / menikung tajam. Hanya lapisan kamera — TIDAK mengubah physics.
    /// </summary>
    public sealed class XRComfortSystem : MonoBehaviour
    {
        public enum ComfortMode { Normal, Comfort, Advanced }

        // Kualifikasi penuh: namespace saudara Kemudi.Simulation.Camera
        // menaungi nama tipe `Camera`.
        [SerializeField] private UnityEngine.Camera targetCamera = null!;
        [SerializeField] private float baseFov = 90f;
        [SerializeField] private float maxNarrowFov = 70f;
        [SerializeField] private float smooth = 0.1f;

        public ComfortMode Mode { get; set; } = ComfortMode.Comfort;

        // TODO: sumber nilai akselerasi — sambungkan ke VehiclePhysics.
        private float _accelMagnitude;

        public void SetAcceleration(float magnitude) => _accelMagnitude = magnitude;

        private void LateUpdate()
        {
            if (Mode == ComfortMode.Advanced || targetCamera == null) return;

            var t = Mathf.Clamp01(_accelMagnitude / 15f); // 0..15 m/s²
            var desiredFov = Mathf.Lerp(baseFov, maxNarrowFov, t * 0.5f);
            targetCamera.fieldOfView = Mathf.Lerp(targetCamera.fieldOfView, desiredFov, smooth);
        }
    }
}
