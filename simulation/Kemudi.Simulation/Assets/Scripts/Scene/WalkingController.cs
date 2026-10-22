using Kemudi.Simulation.Core;
using UnityEngine;

namespace Kemudi.Simulation.Scene
{
    /// <summary>
    /// Mode berjalan kaki (SIMULASI.md §5 langkah 2–3): pengguna muncul di
    /// area parkir, berjalan menuju kendaraan, lalu masuk ke kabin dengan
    /// tombol [E] saat sudah dekat.
    ///
    /// Komponen ini memegang kamera utama selama fase Walking — CameraManager
    /// baru mengambil alih setelah pengguna masuk kendaraan. Pergerakan memakai
    /// CharacterController (bukan transform.Translate) agar tetap bertumbukan
    /// dengan lingkungan.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public sealed class WalkingController : MonoBehaviour
    {
        [Header("Kecepatan")]
        [SerializeField] private float walkSpeed = 3.4f;
        [SerializeField] private float runSpeed = 6.5f;
        [SerializeField] private float gravity = -18f;

        [Header("Kamera")]
        [SerializeField] private float eyeHeight = 1.65f;
        [SerializeField] private float mouseSensitivity = 2.4f;
        [SerializeField] private float maxPitch = 80f;

        [Header("Masuk kendaraan")]
        [Tooltip("Jarak maksimum ke bodi kendaraan agar tombol [E] aktif.")]
        [SerializeField] private float enterDistance = 3.4f;

        private CharacterController _controller = null!;
        private UnityEngine.Camera _camera = null!;
        private SimulationManager _simulation = null!;
        private Transform? _vehicle;
        private float _yaw;
        private float _pitch;
        private float _verticalVelocity;

        /// <summary>Pengguna sudah cukup dekat untuk masuk kendaraan (dipakai HUD).</summary>
        public bool IsNearVehicle { get; private set; }

        /// <summary>Kontrol aktif selama fase berjalan kaki.</summary>
        public bool ControlsEnabled { get; set; } = true;

        /// <summary>
        /// Wire dependency + spawn pemain di area parkir menghadap kendaraan.
        /// </summary>
        public void Initialize(SimulationManager simulation, UnityEngine.Camera camera,
            Vector3 spawnPosition, float yaw, Transform? vehicle)
        {
            _simulation = simulation;
            _camera = camera;
            _vehicle = vehicle;
            _yaw = yaw;
            _pitch = 0f;
            _verticalVelocity = 0f;

            if (_controller == null) _controller = GetComponent<CharacterController>();

            // Teleport harus lewat disable/enable pada CharacterController.
            _controller.enabled = false;
            transform.position = spawnPosition;
            transform.rotation = Quaternion.Euler(0f, yaw, 0f);
            _controller.enabled = true;

            ControlsEnabled = true;
            IsNearVehicle = false;
            ApplyCamera();
        }

        public void SetVehicle(Transform? vehicle)
        {
            _vehicle = vehicle;
            IsNearVehicle = false;
        }

        /// <summary>Keluar dari mode berjalan kaki (pengguna sudah di kabin).</summary>
        public void Stop()
        {
            ControlsEnabled = false;
            IsNearVehicle = false;
        }

        private void Update()
        {
            if (!ControlsEnabled) return;

            Look();
            Move();
            CheckVehicleDoor();
        }

        private void Look()
        {
            var locked = Cursor.lockState == CursorLockMode.Locked;
            var lookingWithMouse = locked || UnityEngine.Input.GetMouseButton(1);
            if (lookingWithMouse)
            {
                _yaw += UnityEngine.Input.GetAxis("Mouse X") * mouseSensitivity;
                _pitch = Mathf.Clamp(_pitch - UnityEngine.Input.GetAxis("Mouse Y") * mouseSensitivity, -maxPitch, maxPitch);
            }

            transform.rotation = Quaternion.Euler(0f, _yaw, 0f);
            ApplyCamera();
        }

        private void ApplyCamera()
        {
            if (_camera == null) return;
            _camera.transform.SetPositionAndRotation(
                transform.position + Vector3.up * eyeHeight,
                Quaternion.Euler(_pitch, _yaw, 0f));
        }

        private void Move()
        {
            var x = 0f;
            var z = 0f;
            if (Key(KeyCode.A) || Key(KeyCode.LeftArrow)) x -= 1f;
            if (Key(KeyCode.D) || Key(KeyCode.RightArrow)) x += 1f;
            if (Key(KeyCode.W) || Key(KeyCode.UpArrow)) z += 1f;
            if (Key(KeyCode.S) || Key(KeyCode.DownArrow)) z -= 1f;

            if (_controller.isGrounded && _verticalVelocity < 0f) _verticalVelocity = -1f;
            _verticalVelocity += gravity * Time.deltaTime;

            var speed = Key(KeyCode.LeftShift) || Key(KeyCode.RightShift) ? runSpeed : walkSpeed;
            var move = (transform.right * x + transform.forward * z);
            if (move.sqrMagnitude > 1f) move.Normalize();

            _controller.Move((move * speed + Vector3.up * _verticalVelocity) * Time.deltaTime);
        }

        /// <summary>
        /// Deteksi pintu: jarak ke bodi kendaraan (collider) & permintaan masuk.
        /// </summary>
        private void CheckVehicleDoor()
        {
            if (_vehicle == null)
            {
                IsNearVehicle = false;
                return;
            }

            var collider = _vehicle.GetComponent<Collider>();
            var closest = collider != null ? collider.ClosestPoint(transform.position) : _vehicle.position;
            IsNearVehicle = Vector3.Distance(transform.position, closest) <= enterDistance;

            if (IsNearVehicle && UnityEngine.Input.GetKeyDown(KeyCode.E))
                _simulation?.EnterVehicle();
        }

        // 'Input' polos bentrok dengan namespace Kemudi.Simulation.Input.
        private static bool Key(KeyCode code) => UnityEngine.Input.GetKey(code);
    }
}
