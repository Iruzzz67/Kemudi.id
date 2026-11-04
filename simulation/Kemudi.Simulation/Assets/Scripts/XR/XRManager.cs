using Kemudi.Simulation.Input;
using UnityEngine;

namespace Kemudi.Simulation.XR
{
    /// <summary>
    /// Manajer sesi OpenXR. Hanya menginisialisasi rig dan menyediakan status
    /// sesi — kontrol kendaraan tetap lewat UniversalInputSystem (XRInputProvider
    /// akan menulis ke sana). Simulator TETAP berjalan tanpa VR.
    /// </summary>
    public sealed class XRManager : MonoBehaviour
    {
        public enum Mode { Desktop, VR }

        public Mode CurrentMode { get; private set; } = Mode.Desktop;

        /// <summary>Apakah VR sedang aktif (dibaca MainMenuUI, KemudiSceneBootstrap).</summary>
        public bool IsVrActive => CurrentMode == Mode.VR;

        [SerializeField] private GameObject? vrRig;   // XR Origin (dibuat di Editor)
        [SerializeField] private GameObject? desktopCameraRig;

        private UniversalInputSystem? _inputSystem;
        private Transform? _vehicleTarget;

        private void Awake()
        {
            CurrentMode = IsVrSupported() ? Mode.VR : Mode.Desktop;
            ApplyMode();
        }

        /// <summary>
        /// Wire input system & kamera rig — dipanggil KemudiSceneBootstrap.
        /// XRInputProvider didaftarkan ke input system bila VR aktif.
        /// </summary>
        public void Initialize(UniversalInputSystem input, GameObject cameraRig)
        {
            _inputSystem = input;

            if (IsVrActive && input != null)
            {
                // Daftarkan XRInputProvider bila ada di bawah rig ini.
                var xrInput = GetComponentInChildren<XRInputProvider>();
                if (xrInput != null) input.Register(xrInput);
            }
        }

        /// <summary>Target kendaraan untuk head tracking follow (VR only).</summary>
        public void SetVehicleTarget(Transform target) => _vehicleTarget = target;

        private static bool IsVrSupported()
        {
#if UNITY_XR_MANAGEMENT && ENABLE_XR
            var xr = UnityEngine.XR.XRSettings.isDeviceActive;
            return xr;
#else
            return false;
#endif
        }

        private void ApplyMode()
        {
            if (vrRig != null) vrRig.SetActive(CurrentMode == Mode.VR);
            if (desktopCameraRig != null) desktopCameraRig.SetActive(CurrentMode == Mode.Desktop);
        }

        /// <summary>Harus dipanggil oleh input provider XR saat controller aktif.</summary>
        public void NotifyControllersActive(bool active)
        {
            // TODO: aktifkan/nonaktifkan XRInputProvider & virtual steering wheel.
        }
    }
}
