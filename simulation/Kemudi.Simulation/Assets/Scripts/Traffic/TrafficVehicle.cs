using UnityEngine;

namespace Kemudi.Simulation.Traffic
{
    /// <summary>
    /// Kendaraan AI sederhana berbasis waypoint (§36) — TANPA pathfinding
    /// kompleks: bergerak dari waypoint ke waypoint dengan MoveTowards,
    /// berhenti di lampu merah, lalu respawn/loop. Update di-throttle ke
    /// 5–10 Hz oleh <see cref="TrafficManager"/> (bukan setiap frame).
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public sealed class TrafficVehicle : MonoBehaviour
    {
        public enum Kind { Mobil, Motor, Truk, Bus, Ambulans, Polisi, Pemadam }

        [Header("Perilaku")]
        [SerializeField] private Kind kind = Kind.Mobil;
        [SerializeField] private float cruiseSpeed = 9f;      // m/s
        [SerializeField] private float acceleration = 3f;
        [SerializeField] private float brakeForce = 5f;
        [SerializeField] private float stopDistance = 2.5f;  // sebelum garis lampu
        [SerializeField] private float followDistance = 10f; // jarak aman antar kendaraan

        public Kind VehicleKind => kind;
        public float CruiseSpeed => cruiseSpeed;

        private Vector3[] _waypoints = System.Array.Empty<Vector3>();
        private int _wpIndex;
        private float _speed;
        private Rigidbody? _rb;

        private TrafficLightController[] _lights = System.Array.Empty<TrafficLightController>();

        public void Setup(Vector3[] waypoints, TrafficLightController[] lights, float speedFactor = 1f, int startIndex = 0)
        {
            _waypoints = waypoints;
            _lights = lights ?? System.Array.Empty<TrafficLightController>();
            cruiseSpeed *= speedFactor;
            _wpIndex = _waypoints.Length > 0 ? Mathf.Clamp(startIndex, 0, _waypoints.Length - 1) : 0;
            _speed = 0f;
            if (_waypoints.Length > 0)
                transform.position = _waypoints[_wpIndex];
        }

        private void Awake()
        {
            _rb = GetComponent<Rigidbody>();
            if (_rb != null)
            {
                _rb.isKinematic = true; // AI memakai transform, bukan physics penuh
                _rb.useGravity = false;
            }
        }

        /// <summary>Dipanggil TrafficManager 5–10 kali/detik (§79).</summary>
        public void Tick(float delta)
        {
            if (_waypoints.Length < 2) return;

            var target = TargetSpeed();
            if (_speed < target) _speed = Mathf.Min(target, _speed + acceleration * delta);
            else _speed = Mathf.Max(target, _speed - brakeForce * delta);

            var step = _speed * delta;
            while (step > 0f && _wpIndex < _waypoints.Length)
            {
                var waypoint = _waypoints[_wpIndex];
                var toWp = waypoint - transform.position;
                var dist = toWp.magnitude;
                if (dist <= step)
                {
                    transform.position = waypoint;
                    step -= dist;
                    _wpIndex++;
                    continue;
                }
                transform.position += toWp.normalized * step;
                step = 0f;
            }

            if (_wpIndex >= _waypoints.Length) _wpIndex = 0; // loop jalan

            // Hadap ke waypoint berikutnya.
            if (_wpIndex < _waypoints.Length)
            {
                var look = _waypoints[_wpIndex] - transform.position;
                if (look.sqrMagnitude > 0.001f)
                    transform.rotation = Quaternion.Slerp(transform.rotation,
                        Quaternion.LookRotation(new Vector3(look.x, 0f, look.z)),
                        delta * 3f);
            }
        }

        private float TargetSpeed()
        {
            var target = cruiseSpeed;

            // 1) Berhenti di lampu merah / kuning di depan.
            foreach (var light in _lights)
            {
                if (light == null || !light.MustStop) continue;
                var dz = transform.position.z - light.StopLineZ;
                if (dz > 0f && dz < 40f)
                {
                    var distToStop = dz - stopDistance;
                    if (distToStop > 0f)
                        target = Mathf.Min(target, Mathf.Sqrt(2f * brakeForce * distToStop));
                }
            }

            // 2) Jaga jarak dengan kendaraan di depan (semua aktor AI).
            foreach (var other in TrafficManager.ActiveVehicles)
            {
                if (other == this || other == null) continue;
                var gap = transform.position.z - other.transform.position.z;
                if (gap > 0f && gap < followDistance)
                    target = Mathf.Min(target, Mathf.Sqrt(2f * brakeForce * Mathf.Max(0f, gap - 3f)));
            }

            return Mathf.Max(0f, target);
        }
    }
}
