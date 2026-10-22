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

        [SerializeField] private GameObject vrRig = null!;   // XR Origin (dibuat di Editor)
        [SerializeField] private GameObject desktopCameraRig = null!;

        private void Awake()
        {
            CurrentMode = IsVrSupported() ? Mode.VR : Mode.Desktop;
            ApplyMode();
        }

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
