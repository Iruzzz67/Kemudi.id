using Kemudi.Simulation.Environment;
using Kemudi.Simulation.Traffic;
using UnityEngine;

namespace Kemudi.Simulation.Rules
{
    /// <summary>
    /// Deteksi aturan BERBASIS EVENT (trigger) — bukan pengecekan per frame
    /// (§46, §75). Semua zona memakai OnTriggerEnter/OnTriggerExit pada layer
    /// "Trigger" (collision matrix §16), sehingga biayanya jauh lebih murah.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public abstract class TriggerZone : MonoBehaviour
    {
        protected const string VehicleTag = "Vehicle";

        [Header("Trigger Zone")]
        [SerializeField] protected ViolationSystem violationSystem = null!;

        private void Awake() => GetComponent<Collider>().isTrigger = true;

        /// <summary>
        /// Wire dependency — dipakai TrackBuilder untuk zona yang dibuat saat
        /// runtime (komponen runtime tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void Configure(ViolationSystem system) => violationSystem = system;

        protected bool IsVehicle(Collider other) =>
            other.CompareTag(VehicleTag) || other.GetComponentInParent<Vehicles.VehicleController>() != null;
    }

    /// <summary>Zona lampu merah — memasuki area saat lampu merah = pelanggaran.</summary>
    public sealed class TrafficLightZone : TriggerZone
    {
        [SerializeField] private TrafficLightController light = null!;

        /// <summary>Wire lampu — dipakai scene bootstrap (zona dibuat saat runtime).</summary>
        public void Configure(TrafficLightController trafficLight) => light = trafficLight;

        private void OnTriggerEnter(Collider other)
        {
            if (!IsVehicle(other)) return;
            if (light != null && light.MustStop)
                violationSystem?.Register(ViolationSystem.ViolationType.RedLight, transform.position);
        }
    }

    /// <summary>Zona zebra cross — tidak memberi jalan saat pejalan kaki menyeberang.</summary>
    public sealed class CrosswalkZone : TriggerZone
    {
        // Dua mode: referensi langsung satu Pedestrian (di-set Inspector) ATAU
        // lewat PedestrianManager + index crossing (dipakai zona runtime).
        [SerializeField] private Pedestrian? pedestrian;
        [SerializeField] private Environment.PedestrianManager? manager;
        [SerializeField] private int crossingIndex;

        /// <summary>Wire mode manager — dipakai scene bootstrap (zona dibuat saat runtime).</summary>
        public void Configure(Environment.PedestrianManager pedestrianManager, int index)
        {
            manager = pedestrianManager;
            crossingIndex = index;
            pedestrian = null;
        }

        /// <summary>Wire mode satu pejalan kaki (Inspector).</summary>
        public void Configure(Pedestrian crossingPedestrian)
        {
            pedestrian = crossingPedestrian;
            manager = null;
        }

        private bool IsPedestrianCrossing()
        {
            if (manager != null) return manager.IsCrossing(crossingIndex);
            return pedestrian != null && pedestrian.InRoad;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!IsVehicle(other)) return;
            if (IsPedestrianCrossing())
                violationSystem?.Register(ViolationSystem.ViolationType.PedestrianPriority, transform.position);
        }
    }

    /// <summary>Zona finish — menyelesaikan simulasi.</summary>
    public sealed class FinishZone : TriggerZone
    {
        [SerializeField] private Core.SimulationManager simulationManager = null!;

        /// <summary>Wire dependency (zona runtime dari TrackBuilder).</summary>
        public void Configure(Core.SimulationManager manager) => simulationManager = manager;

        private void OnTriggerEnter(Collider other)
        {
            if (!IsVehicle(other)) return;
            simulationManager?.Finish();
        }
    }

    /// <summary>Zona jalan (menutupi area aspal) — keluar dari trigger = off-road (§76).</summary>
    public sealed class RoadZone : TriggerZone
    {
        [Tooltip("Cooldown antar pelanggaran off-road (detik).")]
        [SerializeField] private float cooldown = 3f;
        private float _lastOffRoad;

        private void OnTriggerExit(Collider other)
        {
            if (!IsVehicle(other)) return;
            if (Time.time - _lastOffRoad < cooldown) return;
            _lastOffRoad = Time.time;
            violationSystem?.Register(ViolationSystem.ViolationType.OffRoad, other.transform.position);
        }
    }

    /// <summary>Zona rambu batas kecepatan — memasuki zona sambil ngebut = pelanggaran.</summary>
    public sealed class SpeedZone : TriggerZone
    {
        [SerializeField] private float limitKmh = 40f;

        private void OnTriggerEnter(Collider other)
        {
            if (!IsVehicle(other)) return;
            var physics = other.GetComponentInParent<Vehicles.VehiclePhysics>();
            if (physics != null && physics.SpeedKmh > limitKmh + 5f)
                violationSystem?.Register(ViolationSystem.ViolationType.Speeding, transform.position,
                    $"Melebihi batas {limitKmh} km/j");
        }
    }
}
