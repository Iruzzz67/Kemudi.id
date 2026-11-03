using System;
using System.Collections.Generic;
using UnityEngine;

namespace Kemudi.Simulation.Rules
{
    /// <summary>
    /// Deteksi pelanggaran — DIPISAH dari pencatatan/penilaian (ScoringSystem).
    /// Setiap violation punya tipe, severity, lokasi, dan deskripsi.
    /// </summary>
    public sealed class ViolationSystem : MonoBehaviour
    {
        public enum ViolationType
        {
            RedLight,           // menerobos lampu merah
            PedestrianPriority, // tidak memberi jalan pejalan kaki
            OffRoad,            // keluar jalur
            Speeding,           // melebihi batas kecepatan
            WrongWay,           // melawan arus
            Collision,          // menabrak
            NoSignal,           // tidak memakai sein saat berbelok
            ObstacleHit         // menabrak rintangan lintasan (cone/barrier/parkir)
        }

        public readonly struct Violation
        {
            public readonly ViolationType Type;
            public readonly int Severity;         // 1..3
            public readonly float Timestamp;
            public readonly Vector3 Position;
            public readonly string Description;

            public Violation(ViolationType type, int severity, float timestamp, Vector3 position, string description)
            {
                Type = type; Severity = severity; Timestamp = timestamp;
                Position = position; Description = description;
            }
        }

        public event Action<Violation>? ViolationOccurred;
        public int Count { get; private set; }

        private readonly List<Violation> _log = new();

        /// <summary>Reset count & log antar percobaan (§48).</summary>
        public void ResetCount()
        {
            Count = 0;
            _log.Clear();
        }

        /// <summary>Jumlah pelanggaran bertipe tertentu (dipakai laporan §62).</summary>
        public int CountOf(ViolationType type)
        {
            var n = 0;
            foreach (var v in _log)
                if (v.Type == type) n++;
            return n;
        }

        /// <summary>Daftarkan satu pelanggaran; severity default per tipe.</summary>
        public void Register(ViolationType type, Vector3 position, string? description = null)
        {
            var severity = type switch
            {
                ViolationType.PedestrianPriority or ViolationType.RedLight => 3,
                ViolationType.Collision => 3,
                ViolationType.ObstacleHit => 1,
                ViolationType.WrongWay => 2,
                _ => 1
            };

            var violation = new Violation(
                type, severity, Time.time, position,
                description ?? DefaultDescription(type));

            Count++;
            _log.Add(violation);
            ViolationOccurred?.Invoke(violation);
        }

        private static string DefaultDescription(ViolationType type) => type switch
        {
            ViolationType.RedLight => "Menerobos lampu merah",
            ViolationType.PedestrianPriority => "Tidak memberi jalan kepada pejalan kaki",
            ViolationType.OffRoad => "Keluar jalur",
            ViolationType.Speeding => "Melebihi batas kecepatan",
            ViolationType.WrongWay => "Melawan arus",
            ViolationType.Collision => "Menabrak objek/kendaraan",
            ViolationType.NoSignal => "Tidak menggunakan sein",
            ViolationType.ObstacleHit => "Menabrak rintangan",
            _ => "Pelanggaran"
        };
    }
}
