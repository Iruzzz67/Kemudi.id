using UnityEngine;
using UnityEngine.Rendering;

namespace Kemudi.Simulation.XR
{
    /// <summary>
    /// Vignette dinamis anti motion sickness: FOV dipersempit saat akselerasi
    /// tinggi / menikung tajam. Hanya lapisan kamera — TIDAK mengubah physics.
    /// </summary>
    public sealed class XRComfortSystem : MonoBehaviour
    {
        public enum ComfortMode { Normal, Comfort, Advanced }

        // 'Camera' polos akan di-resolve ke namespace Kemudi.Simulation.Camera
        // (saudara namespace ini), jadi tipe Unity-nya harus ditulis lengkap.
        [SerializeField] private UnityEngine.Camera targetCamera = null!;
        [SerializeField] private float baseFov = 90f;
        [SerializeField] private float maxNarrowFov = 70f;
        [SerializeField] private float smooth = 0.1f;

        public ComfortMode Mode { get; set; } = ComfortMode.Comfort;

        /// <summary>
        /// Sistem comfort hanya bekerja saat VR aktif (di desktop justru
        /// mengganggu). Di-set oleh KemudiSceneBootstrap dari status XRManager.
        /// </summary>
        public bool SystemActive { get; set; }

        private void Awake()
        {
            if (targetCamera == null) targetCamera = UnityEngine.Camera.main;
        }

        // TODO: sumber nilai akselerasi — sambungkan ke VehiclePhysics.
        private float _accelMagnitude;

        public void SetAcceleration(float magnitude) => _accelMagnitude = magnitude;

        private void LateUpdate()
        {
            if (!SystemActive || Mode == ComfortMode.Advanced || targetCamera == null) return;

            var t = Mathf.Clamp01(_accelMagnitude / 15f); // 0..15 m/s²
            var desiredFov = Mathf.Lerp(baseFov, maxNarrowFov, t * 0.5f);
            targetCamera.fieldOfView = Mathf.Lerp(targetCamera.fieldOfView, desiredFov, smooth);
        }
    }
}
