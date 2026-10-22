using UnityEngine;

namespace Kemudi.Simulation.Camera
{
    /// <summary>
    /// Kamera FPV / TPV / TopDown untuk fase berkendara.
    ///
    /// Di VR (head tracking dari XR rig), kamera ini dinonaktifkan
    /// (<see cref="EnableVrMode"/>) karena posisi kepala dikendalikan headset.
    ///
    /// Saat fase berjalan kaki (Walking), kamera dikendalikan
    /// WalkingController — CameraManager tidak menggerakkan apa pun sampai
    /// pengguna masuk ke kendaraan.
    /// </summary>
    public sealed class CameraManager : MonoBehaviour
    {
        public enum CameraMode { Tpv, Fpv, TopDown }

        // Catatan: namespace file ini adalah Kemudi.Simulation.Camera, sehingga
        // referensi tipe kamera Unity harus memakai nama lengkap UnityEngine.Camera
        // (kalau tidak, 'Camera' di-resolve sebagai namespace → CS0118).
        [SerializeField] private UnityEngine.Camera cam = null!;
        [SerializeField] private Transform vehicle = null!;
        [SerializeField] private float tpvFollowSpeed = 6f;
        [SerializeField] private Vector3 fpvEyeOffset = new(0f, 1.4f, 0.2f);
        [SerializeField] private Vector3 vrSeatOffset = new(0f, 1.2f, -0.1f);

        public CameraMode Mode { get; private set; } = CameraMode.Tpv;

        /// <summary>VR aktif → posisi kamera mengikuti headset, bukan mode desktop.</summary>
        public bool IsVrMode { get; private set; }

        /// <summary>Kamera sedang dipegang WalkingController (fase berjalan kaki).</summary>
        public bool IsWalkMode { get; private set; }

        private Vector3 _tpvPosition;

        private void Awake()
        {
            if (cam == null) cam = UnityEngine.Camera.main;
        }

        /// <summary>Wire dependency — dipakai scene bootstrap (komponen dibuat runtime).</summary>
        public void Configure(UnityEngine.Camera? camera, Transform? target)
        {
            if (camera != null) cam = camera;
            if (target != null) vehicle = target;
        }

        /// <summary>Ganti target kendaraan (dipanggil setiap kali kendaraan dibuat).</summary>
        public void SetVehicleTarget(Transform? target)
        {
            vehicle = target;
            _tpvPosition = Vector3.zero;
            var config = target != null ? target.GetComponent<Vehicles.VehicleController>()?.Config : null;
            if (config != null)
            {
                fpvEyeOffset = config.Type switch
                {
                    Vehicles.VehicleConfig.VehicleType.Motor => new Vector3(0f, 1.15f, 0f),
                    Vehicles.VehicleConfig.VehicleType.Truk => new Vector3(.55f, 2.03f, 2.20f),
                    _ => new Vector3(.46f, 1.275f, .08f)
                };
                vrSeatOffset = fpvEyeOffset;
                if (cam != null) cam.nearClipPlane = .03f;
            }
        }

        public void CycleMode()
        {
            Mode = Mode switch
            {
                CameraMode.Tpv => CameraMode.Fpv,
                CameraMode.Fpv => CameraMode.TopDown,
                _ => CameraMode.Tpv
            };
            Debug.Log($"[Kemudi.Camera] Mode kamera: {Mode}");
        }

        public void SetMode(CameraMode mode) => Mode = mode;

        /// <summary>VR tanpa mode desktop (head tracking mengambil alih).</summary>
        public void EnableVrMode()
        {
            IsVrMode = true;
            IsWalkMode = false;
        }

        public void DisableVrMode() => IsVrMode = false;

        /// <summary>
        /// Fase berjalan kaki: WalkingController memegang kamera; CameraManager
        /// berhenti menggerakkannya sampai pengguna masuk kendaraan.
        /// </summary>
        public void SetWalkMode(bool walking)
        {
            IsWalkMode = walking;
            if (!walking) _tpvPosition = Vector3.zero;
        }

        private void LateUpdate()
        {
            if (cam == null) return;
            if (IsWalkMode) return;   // dipegang WalkingController (fase berjalan kaki)
            if (IsVrMode) return;     // head tracking XR rig yang menggerakkan kamera
            if (vehicle == null) return;

            switch (Mode)
            {
                case CameraMode.Tpv: UpdateTpv(); break;
                case CameraMode.Fpv: UpdateFpv(); break;
                case CameraMode.TopDown: UpdateTopDown(); break;
            }
        }

        /// <summary>
        /// Offset titik duduk (relatif ke kendaraan) yang dipakai XRManager
        /// saat memposisikan XR rig di kabin (§33) — satu sumber kebenaran
        /// supaya kursi VR dan kamera FPV tidak pernah berbeda.
        /// </summary>
        public Vector3 VrSeatOffset => vrSeatOffset;

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
