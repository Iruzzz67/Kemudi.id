using System.Collections.Generic;
using Kemudi.Simulation.Environment;
using UnityEngine;

namespace Kemudi.Simulation.Rules
{
    /// <summary>
    /// Menabrak rintangan lintasan (cone, barrier, kendaraan parkir) = satu
    /// hit ObstacleHit per objek per percobaan — padanan obstacleHits di
    /// versi web (laporan hasil §62 memetakan CountOf(ObstacleHit)). Penalti
    /// skor ringan (-3 poin) via ScoringSystem.AddObstacleHit.
    ///
    /// Dedupe per GameObject agar kendaraan yang menempel di rintangan tidak
    /// menambah hit berulang kali selama masih bersinggungan. Dipasang pada
    /// kendaraan pemain; deteksi via OnCollisionEnter (event-driven, §46).
    /// </summary>
    public sealed class ObstacleCollisionWatcher : MonoBehaviour
    {
        [SerializeField] private ViolationSystem violations = null!;

        private readonly HashSet<GameObject> _hit = new();

        /// <summary>Wire dependency — dipakai scene bootstrap (komponen dibuat saat runtime).</summary>
        public void Configure(ViolationSystem system) => violations = system;

        /// <summary>Bersihkan hit antar percobaan (dipanggil SimulationManager.BeginPreDrive).</summary>
        public void ResetHits() => _hit.Clear();

        private void OnCollisionEnter(Collision collision)
        {
            if (violations == null) return;
            var root = collision.collider != null ? collision.collider.transform.root : null;
            if (root == null) return;
            if (root.GetComponent<SceneryObstacle>() == null) return;
            if (!_hit.Add(root.gameObject)) return;

            var contact = collision.contacts.Length > 0 ? collision.contacts[0].point : root.position;
            violations.Register(ViolationSystem.ViolationType.ObstacleHit, contact, "Menabrak rintangan");
        }
    }
}
