using System.Collections.Generic;
using Kemudi.Simulation.Core;
using UnityEngine;

namespace Kemudi.Simulation.Environment
{
    /// <summary>
    /// Pengelola pejalan kaki: 1 aktor aktif per zebra cross (§38), dipool
    /// (§47), update 5 Hz (§79). Jumlah crossing mengikuti budget kualitas
    /// (1 di LOW/standalone, 2 di MEDIUM, 3+ di HIGH — §54).
    /// </summary>
    public sealed class PedestrianManager : MonoBehaviour
    {
        [System.Serializable]
        public struct Crossing
        {
            public Transform sideA;
            public Transform sideB;
        }

        [Header("Prefab & Pool")]
        [SerializeField] private Pedestrian pedestrianPrefab = null!;
        [SerializeField] private int prewarm = 4;

        [Header("Zebra Cross")]
        [SerializeField] private Crossing[] crossings = System.Array.Empty<Crossing>();

        [Header("Budget")]
        [Tooltip("Jumlah crossing yang diaktifkan (diubah PerformanceManager).")]
        [SerializeField, Range(0, 6)] private int activeCrossings = 2;

        [Header("Update (Hz)")]
        [SerializeField, Range(1f, 30f)] private float updateHz = 5f;

        public int ActiveCrossings => activeCrossings;

        private ObjectPool<Pedestrian> _pool = null!;
        private readonly List<Pedestrian> _active = new();
        private float _timer;

        private void Awake()
        {
            // Pool dibuat di Configure (prefab diisi saat runtime oleh scene
            // bootstrap) — Awake tidak melakukan apa-apa.
        }

        /// <summary>
        /// Wire dependency — dipakai scene bootstrap (komponen dibuat saat
        /// runtime sehingga tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void Configure(Pedestrian prefab, Crossing[] crossingList)
        {
            pedestrianPrefab = prefab;
            crossings = crossingList ?? System.Array.Empty<Crossing>();
            _pool = new ObjectPool<Pedestrian>(pedestrianPrefab, transform, prewarm);
        }

        /// <summary>
        /// Apakah pejalan kaki di zebra cross <paramref name="index"/> sedang
        /// menyeberang — dipakai CrosswalkZone (§38).
        /// </summary>
        public bool IsCrossing(int index)
        {
            if (index < 0 || index >= _active.Count) return false;
            return _active[index] != null && _active[index].InRoad;
        }

        private void Update()
        {
            _timer += Time.deltaTime;
            var interval = 1f / Mathf.Max(1f, updateHz);
            while (_timer >= interval)
            {
                _timer -= interval;
                Tick();
            }
        }

        private void Tick()
        {
            if (_pool == null || pedestrianPrefab == null) return; // belum di-Configure

            var wanted = Mathf.Min(activeCrossings, crossings.Length);
            while (_active.Count < wanted)
            {
                var idx = _active.Count;
                var c = crossings[idx];
                if (c.sideA == null || c.sideB == null) break;
                var p = _pool.Get();
                p.Setup(c.sideA.position, c.sideB.position);
                _active.Add(p);
            }
            while (_active.Count > wanted)
            {
                var removed = _active[^1];
                _active.RemoveAt(_active.Count - 1);
                _pool.Release(removed);
            }

            foreach (var p in _active) p.Tick(1f / Mathf.Max(1f, updateHz));
        }

        /// <summary>Budget dari PerformanceManager (adaptive, §55-56).</summary>
        public void SetBudget(int count) => activeCrossings = Mathf.Clamp(count, 0, this.crossings.Length);
    }
}
