using System.Collections.Generic;
using Kemudi.Simulation.Rules;
using UnityEngine;

namespace Kemudi.Simulation.Environment
{
    /// <summary>
    /// Pembangun lintasan — §18, §74, §75, §76.
    ///
    /// TIDAK membuat 1600 GameObject per segmen (§18). Jalan dibuat sebagai:
    ///   1 road mesh (satu MeshFilter + MeshRenderer)
    ///   + 1 road collider (MeshCollider statis)
    ///   + trigger zone off-road & finish (collision matrix §16).
    ///
    /// Off-road memakai RoadZone (OnTriggerExit) — bukan pencarian centerline
    /// ribuan titik per frame (§76). Panggil <see cref="Build"/> di Editor/awal
    /// scene setelah waypoint di-assign.
    /// </summary>
    public sealed class TrackBuilder : MonoBehaviour
    {
        [Header("Waypoint (tengah jalan)")]
        [SerializeField] private Transform[] waypoints = System.Array.Empty<Transform>();

        [Header("Jalan")]
        [SerializeField] private float roadWidth = 10f;
        [Tooltip("Material jalan (Simple Lit / URP Lit).")]
        [SerializeField] private Material? roadMaterial;

        [Header("Trigger")]
        [Tooltip("Lebar trigger off-road (lebih lebar dari jalan agar tidak mudah kena).")]
        [SerializeField] private float triggerWidth = 14f;
        [SerializeField] private bool buildFinishZone = true;
        [SerializeField] private bool buildOffRoadZone = true;

        [Header("Dependencies (untuk zona yang dibuat saat runtime)")]
        [SerializeField] private Rules.ViolationSystem violationSystem = null!;
        [SerializeField] private Core.SimulationManager simulationManager = null!;

        private readonly List<Vector3> _points = new();

        /// <summary>Jalan sudah dibangun (hindari build ganda).</summary>
        public bool Built { get; private set; }

        /// <summary>
        /// Wire dependency — dipakai scene bootstrap (komponen dibuat saat
        /// runtime sehingga tidak bisa di-assign lewat Inspector).
        /// </summary>
        public void Configure(Rules.ViolationSystem violationSystem, Core.SimulationManager simulationManager)
        {
            this.violationSystem = violationSystem;
            this.simulationManager = simulationManager;
        }

        /// <summary>Set waypoint (Transform pembungkus posisi).</summary>
        public void SetWaypoints(Transform[] points) => waypoints = points;

        /// <summary>Set material jalan — dipakai scene bootstrap (komponen dibuat saat runtime).</summary>
        public void SetRoadMaterial(Material? material) => roadMaterial = material;

        public void Build()
        {
            if (Built || waypoints == null || waypoints.Length < 2)
            {
                Debug.LogWarning("TrackBuilder: butuh minimal 2 waypoint untuk membangun jalan.");
                return;
            }

            _points.Clear();
            foreach (var wp in waypoints)
            {
                if (wp != null) _points.Add(wp.position);
            }
            if (_points.Count < 2) return;

            var roadMesh = BuildRoadMesh(_points, roadWidth, "RoadMesh");
            var roadGo = new GameObject("Road");
            roadGo.transform.SetParent(transform, false);
            roadGo.transform.position = Vector3.zero;

            var filter = roadGo.AddComponent<MeshFilter>();
            filter.sharedMesh = roadMesh;
            var renderer = roadGo.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = roadMaterial;
            var collider = roadGo.AddComponent<MeshCollider>();
            collider.sharedMesh = roadMesh; // 1 collider utama (§74)

            if (buildOffRoadZone)
                BuildRoadZone(_points, triggerWidth);

            if (buildFinishZone)
                BuildFinishZone(_points[^1]);

            Built = true;
            Debug.Log($"[Kemudi.Track] Jalan dibangun: {_points.Count} waypoint, 1 mesh, 1 collider.");
        }

        /// <summary>Mesh jalan tunggal dari strip kanan-kiri sepanjang waypoint.</summary>
        private static Mesh BuildRoadMesh(List<Vector3> points, float width, string name)
        {
            var vertices = new List<Vector3>(points.Count * 2);
            var uvs = new List<Vector2>(points.Count * 2);
            float distance = 0f;

            var lastRight = Vector3.zero;
            for (var i = 0; i < points.Count; i++)
            {
                var forward = i < points.Count - 1
                    ? (points[i + 1] - points[i]).normalized
                    : (points[i] - points[i - 1]).normalized;
                var right = Vector3.Cross(Vector3.up, forward);
                if (right.sqrMagnitude < 0.001f)
                    right = lastRight != Vector3.zero ? lastRight : Vector3.right; // waypoint vertikal?
                right.Normalize();
                lastRight = right;

                vertices.Add(points[i] - right * (width * 0.5f));
                vertices.Add(points[i] + right * (width * 0.5f));

                if (i > 0) distance += Vector3.Distance(points[i], points[i - 1]);
                uvs.Add(new Vector2(0f, distance));
                uvs.Add(new Vector2(1f, distance));
            }

            var triangles = new int[(points.Count - 1) * 6];
            var t = 0;
            for (var i = 0; i < points.Count - 1; i++)
            {
                var a = i * 2;
                var b = i * 2 + 1;
                var c = i * 2 + 2;
                var d = i * 2 + 3;
                triangles[t++] = a; triangles[t++] = c; triangles[t++] = b;
                triangles[t++] = b; triangles[t++] = c; triangles[t++] = d;
            }

            var mesh = new Mesh { name = name };
            mesh.SetVertices(vertices);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        /// <summary>
        /// Zona off-road: satu BoxCollider trigger yang menutupi AABB seluruh
        /// jalan (diperlebar). Keluar dari box = pelanggaran (§76).
        ///
        /// CATATAN: sengaja TIDAK memakai MeshCollider trigger non-convex —
        /// Unity hanya mendukung trigger pada MeshCollider convex, sehingga
        /// OnTriggerExit tidak akan pernah terpanggil. Satu box mencegah juga
        /// false-positive di sambungan antar segmen.
        /// </summary>
        private void BuildRoadZone(List<Vector3> points, float width)
        {
            var zone = new GameObject("RoadZone");
            zone.transform.SetParent(transform, false);
            zone.transform.position = Vector3.zero;
            zone.layer = LayerMask.NameToLayer("Trigger") >= 0 ? LayerMask.NameToLayer("Trigger") : 0;

            var min = new Vector3(float.MaxValue, 0f, float.MaxValue);
            var max = new Vector3(float.MinValue, 0f, float.MinValue);
            foreach (var p in points)
            {
                min = Vector3.Min(min, p);
                max = Vector3.Max(max, p);
            }

            var box = zone.AddComponent<BoxCollider>();
            box.isTrigger = true;
            box.center = (min + max) * 0.5f;
            var size = max - min;
            size.x += width;   // perlebar lateral
            size.z += width;
            size.y = 2f;       // cukup tinggi untuk box kendaraan
            box.size = size;

            var roadZone = zone.AddComponent<RoadZone>(); // OnTriggerExit → OffRoad (§76)
            roadZone.Configure(violationSystem);
        }

        private void BuildFinishZone(Vector3 position)
        {
            var zone = GameObject.CreatePrimitive(PrimitiveType.Cube);
            zone.name = "FinishZone";
            zone.transform.SetParent(transform, false);
            zone.transform.position = position;
            zone.transform.localScale = new Vector3(roadWidth, 2f, 2f);

            var collider = zone.GetComponent<Collider>();
            collider.isTrigger = true;
            zone.layer = LayerMask.NameToLayer("Trigger") >= 0 ? LayerMask.NameToLayer("Trigger") : 0;
            Object.Destroy(zone.GetComponent<MeshRenderer>());

            var finish = zone.AddComponent<FinishZone>();
            finish.Configure(simulationManager);
        }
    }
}
