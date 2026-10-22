using Kemudi.Simulation.Input;
using UnityEngine;

namespace Kemudi.Simulation.XR
{
    /// <summary>
    /// Manajer sesi OpenXR. Hanya menginisialisasi rig dan menyediakan status
    /// sesi — kontrol kendaraan tetap lewat UniversalInputSystem (XRInputProvider
    /// menulis ke sana). Simulator TETAP berjalan tanpa VR (mode Desktop).
    ///
    /// Saat VR aktif, rig (XR Origin) mengikuti titik duduk kendaraan supaya
    /// pengguna "duduk" di kabin — padanan kamera FPV + seatOffset versi web.
    /// </summary>
    public sealed class XRManager : MonoBehaviour
    {
        public enum Mode { Desktop, VR }

        public Mode CurrentMode { get; private set; } = Mode.Desktop;

        /// <summary>Headset/sesi OpenXR aktif (mode VR).</summary>
        public bool IsVrActive => CurrentMode == Mode.VR;

        [SerializeField] private GameObject vrRig = null!;   // XR Origin (dibuat di Editor)
        [SerializeField] private GameObject desktopCameraRig = null!;
        [SerializeField] private Vector3 vrSeatOffset = new(0f, 0.9f, 0f);
        [SerializeField] private float followSpeed = 6f;

        private UniversalInputSystem? _inputSystem;
        private Camera.CameraManager? _cameraManager;
        private Transform? _vehicleTarget;
        private Vector3 _rigPosition;
        private Vector3 _headAtSeat;
        private bool _seatCalibrated;

        private void Awake()
        {
            CurrentMode = IsVrSupported() ? Mode.VR : Mode.Desktop;
        }

        /// <summary>
        /// Wire dependency (dipanggil KemudiSceneBootstrap setelah semua sistem
        /// dibuat): rig, input universal, dan kamera desktop.
        /// </summary>
        public void Initialize(UniversalInputSystem input, Camera.CameraManager cameraManager)
        {
            _inputSystem = input;
            _cameraManager = cameraManager;

            if (vrRig == null) vrRig = FindExistingRig();
            if (vrRig == null && IsVrActive) vrRig = CreateRuntimeRig();

            ApplyMode();
            if (IsVrActive) RegisterXRInput();
        }

        private static bool IsVrSupported()
        {
            return UnityEngine.XR.XRSettings.isDeviceActive;
        }

        /// <summary>
        /// Cari XR Origin yang sudah ada di scene (dibuat lewat Editor).
        /// Pencarian lewat nama agar tidak terikat paket XR Interaction Toolkit.
        /// </summary>
        private static GameObject? FindExistingRig()
        {
            foreach (var candidate in new[] { "XR Origin", "XR Origin (XR Rig)", "XR Rig" })
            {
                var found = GameObject.Find(candidate);
                if (found != null) return found;
            }
            return null;
        }

        /// <summary>
        /// Fallback bila scene belum punya XR Origin: buat rig minimal
        /// (camera child) agar headset tetap mendapat gambar.
        /// </summary>
        private GameObject CreateRuntimeRig()
        {
            var rig = new GameObject("XR Origin (Runtime)");
            rig.transform.SetParent(transform, false);

            var camGo = new GameObject("XR Camera");
            camGo.transform.SetParent(rig.transform, false);
            camGo.transform.localPosition = new Vector3(0f, 1.6f, 0f);
            camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<UnityEngine.Camera>();
            cam.fieldOfView = 90f;
            cam.nearClipPlane = 0.05f;
            camGo.AddComponent<AudioListener>();

            Debug.Log("[Kemudi.XR] XR Origin runtime dibuat (fallback).");
            return rig;
        }

        private void ApplyMode()
        {
            if (vrRig != null) vrRig.SetActive(CurrentMode == Mode.VR);
            if (desktopCameraRig != null) desktopCameraRig.SetActive(CurrentMode == Mode.Desktop);
        }

        /// <summary>Daftarkan provider VR controller ke input universal (§31).</summary>
        public void RegisterXRInput()
        {
            if (_inputSystem == null) return;

            var provider = GetComponent<XRInputProvider>();
            if (provider == null) provider = gameObject.AddComponent<XRInputProvider>();
            _inputSystem.Register(provider);

            Debug.Log("[Kemudi.XR] XRInputProvider terdaftar ke UniversalInputSystem.");
        }

        /// <summary>
        /// Titik duduk VR mengikuti kendaraan. Dipanggil bootstrap setiap kali
        /// kendaraan dibuat / diganti.
        /// </summary>
        public void SetVehicleTarget(Transform? target)
        {
            _vehicleTarget = target;
            _rigPosition = Vector3.zero;
            _seatCalibrated = false;
        }

        private void LateUpdate()
        {
            if (!IsVrActive || vrRig == null || _vehicleTarget == null) return;

            var seatOffset = _cameraManager != null
                ? _cameraManager.VrSeatOffset
                : vrSeatOffset;
            var desired = _vehicleTarget.position + _vehicleTarget.rotation * seatOffset;

            // Offset the origin by the initial tracked head position once. Otherwise
            // headset height is added on top of eye height, placing the driver above the roof.
            if (!_seatCalibrated)
            {
                var head = vrRig.GetComponentInChildren<UnityEngine.Camera>();
                _headAtSeat = head != null ? vrRig.transform.InverseTransformPoint(head.transform.position) : Vector3.zero;
                _seatCalibrated = true;
            }
            desired -= _vehicleTarget.rotation * _headAtSeat;

            _rigPosition = _rigPosition == Vector3.zero
                ? desired
                : Vector3.Lerp(_rigPosition, desired, followSpeed * Time.deltaTime);

            vrRig.transform.SetPositionAndRotation(
                _rigPosition,
                Quaternion.Slerp(vrRig.transform.rotation, _vehicleTarget.rotation, followSpeed * Time.deltaTime));
        }

        /// <summary>Harus dipanggil oleh input provider XR saat controller aktif.</summary>
        public void NotifyControllersActive(bool active)
        {
            // Provider sudah terdaftar lewat RegisterXRInput(); status ini
            // disediakan untuk UI/debug.
            Debug.Log($"[Kemudi.XR] Controller active: {active}");
        }
    }
}
