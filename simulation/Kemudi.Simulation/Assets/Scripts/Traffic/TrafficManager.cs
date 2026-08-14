using System.Collections.Generic;
using Kemudi.Simulation.Core;
using UnityEngine;

namespace Kemudi.Simulation.Traffic
{
    /// <summary>
    /// Pengelola lalu lintas AI (§37): jumlah kendaraan aktif mengikuti budget
    /// kualitas (standalone 3–8, desktop 8–20), dipool (§47), dan di-update
    /// 5–10 kali/detik — BUKAN setiap frame (§36, §79).
    /// </summary>
    public sealed class TrafficManager : MonoBehaviour
    {
        [Header("Prefab & Pool")]
        [SerializeField] private TrafficVehicle vehiclePrefab = null!;
        [SerializeField] private int prewarm = 12;

        [Header("Budgets")]
        [SerializeField] private int standaloneBudget = 6;
        [SerializeField] private int desktopBudget = 14;

        [Tooltip("Kendaraan aktif saat ini (berubah oleh PerformanceManager).")]
        [SerializeField, Range(0, 24)] private int activeBudget = 6;

        [Header("Update (Hz)")]
        [SerializeField, Range(1f, 30f)] private float updateHz = 8f;

        [Header("Waypoints (jalur satu arah)")]
        [SerializeField] private Transform[] waypoints = System.Array.Empty<Transform>();
        [SerializeField] private TrafficLightController[] trafficLights = System.Array.Empty<TrafficLightController>();

        /// <summary>Semua kendaraan AI yang sedang aktif (dibaca TrafficVehicle untuk jarak aman).</summary>
        public static readonly List<TrafficVehicle> ActiveVehicles = new();

        private ObjectPool<TrafficVehicle> _pool = null!;
        private readonly List<TrafficVehicle> _running = new();
        private float _updateTimer;

        public int ActiveBudget => activeBudget;

        private void Awake()
        {
            // Pool dibuat di Configure (prefab diisi saat runtime oleh scene
            // bootstrap). Awake hanya membersihkan daftar statis.
            ActiveVehicles.Clear();
        }

        private void OnDestroy() => ActiveVehicles.Clear();

        /// <summary>
        /// Wire dependency — dipakai scene bootstrap (komponen dibuat saat
        /// runtime sehingga tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void Configure(TrafficVehicle prefab, Transform[] path, TrafficLightController[] lights)
        {
            vehiclePrefab = prefab;
            waypoints = path ?? System.Array.Empty<Transform>();
            trafficLights = lights ?? System.Array.Empty<TrafficLightController>();
            _pool = new ObjectPool<TrafficVehicle>(vehiclePrefab, transform, prewarm);
        }

        private void Update()
        {
            _updateTimer += Time.deltaTime;
            var interval = 1f / Mathf.Max(1f, updateHz);
            while (_updateTimer >= interval)
            {
                _updateTimer -= interval;
                Tick();
            }
        }

        private void Tick()
        {
            if (_pool == null || vehiclePrefab == null) return; // belum di-Configure

            // Sinkronkan jumlah kendaraan dengan budget (budget naik → spawn,
            // turun → lepaskan dari belakang).
            while (_running.Count < activeBudget)
            {
                var positions = WaypointPositions();
                if (positions.Length < 2)
                {
                    // Tanpa rute, jangan spawn — hindari kendaraan nyangkut di origin.
                    break;
                }

                var vehicle = _pool.Get();
                vehicle.Setup(positions, trafficLights,
                    speedFactor: UnityEngine.Random.Range(0.85f, 1.15f),
                    // Mulai dari waypoint ≥ 1 agar tidak menimpa spawn pemain (wp0).
                    startIndex: UnityEngine.Random.Range(1, positions.Length));
                _running.Add(vehicle);
                ActiveVehicles.Add(vehicle);
            }
            while (_running.Count > activeBudget)
            {
                var removed = _running[^1];
                _running.RemoveAt(_running.Count - 1);
                ActiveVehicles.Remove(removed);
                _pool.Release(removed);
            }

            foreach (var v in _running) v.Tick(1f / Mathf.Max(1f, updateHz));
        }

        /// <summary>Budget dari PerformanceManager (adaptive, §55-56).</summary>
        public void SetBudget(int budget)
        {
            activeBudget = Mathf.Clamp(budget, 0, 24);
        }

        public int BudgetForDesktop(bool standalone) => standalone ? standaloneBudget : desktopBudget;

        private Vector3[] WaypointPositions()
        {
            if (waypoints == null || waypoints.Length == 0) return System.Array.Empty<Vector3>();
            var result = new Vector3[waypoints.Length];
            for (var i = 0; i < waypoints.Length; i++)
                result[i] = waypoints[i] != null ? waypoints[i].position : Vector3.zero;
            return result;
        }
    }
}
