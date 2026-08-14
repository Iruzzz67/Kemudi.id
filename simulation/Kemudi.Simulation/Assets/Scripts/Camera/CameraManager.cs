using UnityEngine;

namespace Kemudi.Simulation.Camera
{
    /// <summary>
    /// Kamera FPV / TPV (§34). Top-down HANYA tersedia sebagai debug mode
    /// (Development Build) — user biasa hanya menelusuri TPV ↔ FPV agar
    /// sesuai target performa. Di VR, head tracking mengambil alih; kamera
    /// ini hanya relevan untuk mode desktop.
    /// </summary>
    public sealed class CameraManager : MonoBehaviour
    {
        public enum CameraMode { Tpv, Fpv, TopDown }

        // Kualifikasi penuh: namespace Kemudi.Simulation.Camera menaungi nama
        // tipe `Camera` — tanpa UnityEngine.Camera, kompilasi gagal.
        [SerializeField] private UnityEngine.Camera cam = null!;
        [SerializeField] private Transform vehicle = null!;
        [SerializeField] private float tpvFollowSpeed = 6f;
        [SerializeField] private Vector3 fpvEyeOffset = new(0f, 1.4f, 0.2f);

        /// <summary>Mode kamera efektif yang dipakai user (tanpa TopDown).</summary>
        public CameraMode Mode { get; private set; } = CameraMode.Tpv;

        private Vector3 _tpvPosition;

        private void Awake()
        {
            if (cam == null) cam = UnityEngine.Camera.main;
        }

        /// <summary>
        /// Wire dependency — dipakai scene bootstrap (kamera & kendaraan dibuat
        /// saat runtime sehingga tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void Configure(UnityEngine.Camera camera, Transform target)
        {
            cam = camera;
            vehicle = target;
        }

        /// <summary>
        /// Siklus kamera user: TPV ↔ FPV. TopDown hanya masuk bila debug
        /// build mengizinkan (tombol debug memanggil <see cref="EnableDebugTopDown"/>).
        /// </summary>
        public void CycleMode()
        {
            var topDownAllowed = Debug.isDebugBuild && _debugTopDownRequested;
            Mode = Mode switch
            {
                CameraMode.Tpv => CameraMode.Fpv,
                CameraMode.Fpv when topDownAllowed => CameraMode.TopDown,
                _ => CameraMode.Tpv
            };
        }

        private bool _debugTopDownRequested;

        /// <summary>Debug build: izinkan TopDown dalam siklus kamera (§34).</summary>
        public void EnableDebugTopDown(bool enabled) => _debugTopDownRequested = enabled;

        private void LateUpdate()
        {
            if (vehicle == null) return;
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
