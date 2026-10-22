using Kemudi.Simulation.Input;
using UnityEngine;

namespace Kemudi.Simulation.Vehicles
{
    /// <summary>
    /// Fisika kendaraan berbasis Rigidbody — dijalankan di FixedUpdate.
    /// Model sederhana (edukasi): gaya longitudinal + yaw dari kemudi.
    /// Larangan: transform.Translate / transform.position += untuk pergerakan.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public sealed class VehiclePhysics : MonoBehaviour
    {
        private Rigidbody _rb = null!;
        private VehicleController _controller = null!;

        [Header("Tuning")]
        [SerializeField] private float steerForceFactor = 3.5f;
        [SerializeField] private float lateralDamping = 2.2f;
        [SerializeField] private float handbrakeSlipFactor = 0.35f;

        public float SpeedKmh { get; private set; }

        private void Awake()
        {
            _rb = GetComponent<Rigidbody>();
            _controller = GetComponent<VehicleController>();
            if (_controller == null) _controller = GetComponentInParent<VehicleController>();
        }

        private void FixedUpdate()
        {
            var cfg = _controller.Config;
            if (cfg == null) return;

            // Center of mass lebih rendah → lebih stabil (anti-flipping).
            var com = _rb.centerOfMass;
            com.y = cfg.CenterOfMassY;
            _rb.centerOfMass = com;

            var input = _controller.Input;
            var isReversing = _controller.Transmission != null && _controller.Transmission.IsReverse;
            var speed = _rb.linearVelocity.magnitude;
            SpeedKmh = speed * 3.6f;
            _controller.SetSpeed(speed);

            ApplyEngineForces(cfg, input, isReversing, speed);
            ApplySteering(cfg, speed);
            ApplyLateralDamping(cfg, speed);
            ApplyDrag(cfg, speed);
        }

        private void ApplyEngineForces(VehicleConfig cfg, VehicleInputState input, bool isReversing, float speed)
        {
            if (!_controller.Engine.IsRunning) return; // mesin mati = tidak ada tenaga

            var maxSpeed = isReversing ? cfg.ReverseMaxSpeed : cfg.MaxSpeed;
            if (speed >= maxSpeed && !isReversing) return;

            var accel = cfg.Acceleration * input.Throttle;
            if (_controller.HandbrakeActive) accel *= 0.15f;

            // Mundur: arah berlawanan dengan forward.
            var forward = transform.forward;
            if (isReversing) forward = -forward;
            _rb.AddForce(forward * accel * _rb.mass, ForceMode.Force);

            // Rem
            if (input.Brake > 0f)
            {
                var brakePower = cfg.BrakeForce * input.Brake;
                _rb.AddForce(-_rb.linearVelocity.normalized * brakePower * _rb.mass, ForceMode.Force);
            }

            // Rem tangan: selip (kurangi cengkeraman lateral)
            if (_controller.HandbrakeActive)
            {
                _rb.AddForce(-_rb.linearVelocity.normalized * cfg.HandbrakeForce * _rb.mass, ForceMode.Force);
            }
        }

        private void ApplySteering(VehicleConfig cfg, float speed)
        {
            var steer = _controller.EffectiveSteering(SpeedKmh);
            var cornerFactor = cfg.FrontGrip * Mathf.Clamp01(cfg.TireGrip / Mathf.Max(1f, speed));

            // Torsi yaw sebanding kecepatan (setir diam di tempat = tidak memutar).
            var yawTorque = steer * cornerFactor * steerForceFactor * Mathf.Clamp01(speed * 0.15f);
            _rb.AddTorque(transform.up * yawTorque, ForceMode.Acceleration);
        }

        private void ApplyLateralDamping(VehicleConfig cfg, float speed)
        {
            if (speed < 0.1f) return;

            // Komponen kecepatan yang tegak lurus arah hadap dikurangi.
            var right = transform.right;
            var lateralVel = Vector3.Dot(_rb.linearVelocity, right) * right;
            var factor = _controller.HandbrakeActive ? handbrakeSlipFactor : cfg.RearGrip * 1.4f;
            _rb.AddForce(-lateralVel * lateralDamping * factor * _rb.mass, ForceMode.Force);
        }

        private void ApplyDrag(VehicleConfig cfg, float speed)
        {
            // Wheel damping rate (natural deceleration saat idle) + drag aerodinamis.
            _rb.AddForce(-_rb.linearVelocity * (cfg.Friction + speed * 0.004f), ForceMode.Acceleration);
        }
    }
}
