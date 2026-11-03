using UnityEngine;

namespace Kemudi.Simulation.XR
{
    /// <summary>
    /// Hand tracking (§32) — DEFAULT OFF karena menambah CPU/GPU dan tidak
    /// tersedia seragam di semua perangkat. User mengaktifkan lewat settings;
    /// hanya dijalankan bila perangkat mendukung (dicek saat enable).
    /// </summary>
    public sealed class HandTrackingManager : MonoBehaviour
    {
        [Tooltip("User menyalakan hand tracking (Settings → Hand Tracking).")]
        [SerializeField] private bool enabledByUser;

        /// <summary>Status aktual (OFF default — §32).</summary>
        public bool HandTrackingActive { get; private set; }

        /// <summary>Perangkat mendukung hand tracking?</summary>
        public bool Supported { get; private set; }

        private void Awake()
        {
            Supported = QuerySupport();
            Refresh();
        }

        private void OnEnable() => Refresh();

        /// <summary>Dipanggil UI settings saat user toggle hand tracking.</summary>
        public void SetEnabledByUser(bool value)
        {
            enabledByUser = value;
            Refresh();
        }

        private void Refresh()
        {
            // Hanya aktif bila user meminta DAN perangkat mendukung.
            HandTrackingActive = enabledByUser && Supported;
        }

        /// <summary>
        /// Deteksi dukungan perangkat. Menggunakan XRHandSubsystem bila paket
        /// OpenXR/XR Hands terpasang; tanpa paket tersebut, aman dinonaktifkan.
        /// </summary>
        private static bool QuerySupport()
        {
#if UNITY_XR_HANDS || (UNITY_2021_3_OR_NEWER && ENABLE_XR_HANDS)
            var subsystems = new System.Collections.Generic.List<UnityEngine.XR.Hands.XRHandSubsystem>();
            UnityEngine.SubsystemManager.GetSubsystems(subsystems);
            foreach (var s in subsystems)
            {
                if (s.running) return true;
            }
            return false;
#else
            return false; // paket XR Hands belum terpasang → tidak didukung
#endif
        }
    }
}
