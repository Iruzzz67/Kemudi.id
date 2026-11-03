using UnityEngine;

namespace Kemudi.Simulation.Camera
{
    /// <summary>
    /// Kamera FPV / TPV / TopDown. Di VR, head tracking mengambil alih —
    /// kamera ini hanya relevan untuk mode desktop.
    /// </summary>
    public sealed class CameraManager : MonoBehaviour
    {
        public enum CameraMode { Tpv, Fpv, TopDown }

        [SerializeField] private UnityEngine.Camera? cam;
        [SerializeField] private Transform? vehicle;
        [SerializeField] private float tpvFollowSpeed = 6f;
        [SerializeField] private Vector3 fpvEyeOffset = new(0f, 1.4f, 0.2f);

        public CameraMode Mode { get; private set; } = CameraMode.Tpv;

        /// <summary>Mode VR menonaktifkan semua kamera desktop.</summary>
        public bool VrMode { get; private set; }

        private Vector3 _tpvPosition;

        private void Awake()
        {
            if (cam == null) cam = UnityEngine.Camera.main;
        }

        /// <summary>
        /// Wire kamera & target kendaraan — dipanggil KemudiSceneBootstrap.
        /// </summary>
        public void Configure(UnityEngine.Camera? camera, Transform? vehicleTransform)
        {
            if (camera != null) cam = camera;
            if (vehicleTransform != null) vehicle = vehicleTransform;
        }

        /// <summary>Aktifkan mode VR — kamera desktop dimatikan, head tracking aktif.</summary>
        public void EnableVrMode()
        {
            VrMode = true;
            // Di VR, kamera utama dikontrol oleh XR Origin — nonaktifkan
            // gerakan manual (LateUpdate) supaya tidak bertabrakan.
            if (cam != null) cam.enabled = false;
        }

        public void CycleMode()
        {
            Mode = Mode switch
            {
                CameraMode.Tpv => CameraMode.Fpv,
                CameraMode.Fpv => CameraMode.TopDown,
                _ => CameraMode.Tpv
            };
        }

        private void LateUpdate()
        {
            if (VrMode) return; // VR: head tracking mengontrol kamera
            if (vehicle == null || cam == null) return;
            switch (Mode)
            {
                case CameraMode.Tpv: UpdateTpv(); break;
                case CameraMode.Fpv: UpdateFpv(); break;
                case CameraMode.TopDown: UpdateTopDown(); break;
            }
        }

        private void UpdateTpv()
        {
            var desired = vehicle.position - vehicle.forward * 8f + Vector3.up * 3.2f;
            _tpvPosition = Vector3.Lerp(_tpvPosition == Vector3.zero ? desired : _tpvPosition, desired, tpvFollowSpeed * Time.deltaTime);
            cam.transform.position = _tpvPosition;
            cam.transform.LookAt(vehicle.position + vehicle.forward * 3f);
        }

        private void UpdateFpv()
        {
            cam.transform.SetPositionAndRotation(
                vehicle.position + vehicle.rotation * fpvEyeOffset,
                vehicle.rotation);
        }

        private void UpdateTopDown()
        {
            cam.transform.position = vehicle.position + Vector3.up * 22f;
            cam.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        }
    }
}
