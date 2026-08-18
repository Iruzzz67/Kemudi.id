using System.Collections.Generic;
using UnityEngine;

namespace Kemudi.Simulation.Environment
{
    /// <summary>
    /// Pembangun rintangan lintasan — padanan array SCENERY_ITEMS di lib/scenery.ts
    /// versi web (layout celah LEBAR agar konsisten dengan versi web yang sudah
    /// diperlonggar — lihat PANDUAN_PENEMPATAN_ASSET lama):
    ///
    ///   - Cone slalom di tepi jalan (lateral ±4.2 m) → koridor tengah ±8 m bebas.
    ///   - Water barrier / palang proyek di tepi jalan (lateral ±4.5 m).
    ///   - Kendaraan parkir, truk berhenti, dan bus di bahu jalan (lateral 3.8-4.2 m).
    ///   - Tiang pembatas di luar tepi jalan (±5.1 m).
    ///   - Lubang jalan (visual) di zona -508..-516.
    ///
    /// Semua prop SOLID (memakai collider fisik) → menabraknya tercatat sebagai
    /// hit ObstacleHit (penalti ringan -3 poin, obstacleHits di laporan §62)
    /// lewat Rules.ObstacleCollisionWatcher (OnCollisionEnter).
    ///
    /// Posisi ditempatkan lewat <see cref="PointNearZ"/> — titik garis tengah
    /// yang Z-nya paling dekat — sehingga otomatis mengikuti belokan lintasan.
    /// Panggil <see cref="Build"/> di scene bootstrap setelah jalan dibangun.
    /// </summary>
    public sealed class TrackObstacleBuilder : MonoBehaviour
    {
        [Header("Celah (meter, diukur dari tengah jalan)")]
        [Tooltip("Cone slalom: geser lateral dari tengah jalan (tepi jalan ±5).")]
        [SerializeField] private float laneConeOffset = 4.2f;
        [Tooltip("Water barrier: geser lateral dari tengah jalan.")]
        [SerializeField] private float barrierOffset = 4.5f;
        [Tooltip("Kendaraan parkir: geser lateral dari tengah jalan (bahu jalan).")]
        [SerializeField] private float parkedVehicleOffset = 4.2f;

        private readonly List<Vector3> _centerline = new();

        /// <summary>Setel garis tengah jalan (posisi waypoint TrackBuilder).</summary>
        public void SetCenterline(Vector3[] points)
        {
            _centerline.Clear();
            if (points != null)
            {
                foreach (var p in points) _centerline.Add(p);
            }
        }

        public void Build()
        {
            if (_centerline.Count < 2)
            {
                Debug.LogWarning("TrackObstacleBuilder: butuh minimal 2 titik garis tengah.");
                return;
            }

            // ── S-Curve: cone slalom berselang-seling (-202..-229) ────────────
            for (var i = 0; i < 4; i++)
                BuildConeAt(-202f - i * 9f, (i % 2 == 0 ? -1f : 1f) * laneConeOffset);

            // Water barrier kiri/kanan mengapit S-Curve.
            BuildBarrierAt(-246f, -barrierOffset);
            BuildBarrierAt(-254f, barrierOffset);

            // Tiang pembatas (permukiman & berkelok).
            BuildPoleAt(-275f, -5.1f);
            BuildPoleAt(-735f, 5.1f);

            // ── Zona proyek (cone penunjuk lubang + palang) ───────────────────
            BuildConeAt(-450f, -4.3f);
            BuildConeAt(-456f, -4.4f);
            BuildConeAt(-465f, -3.6f);
            BuildBarrierAt(-462f, -4.5f);
            BuildBarrierAt(-468f, 4.5f);
            BuildBarrierAt(-474f, 4.5f);

            // ── Kendaraan parkir & kendaraan berhenti ─────────────────────────
            BuildParkedVehicleAt(-120f, parkedVehicleOffset, "ParkedCar",
                new Vector3(1.8f, 1.8f, 4.2f), new Color(0.2f, 0.45f, 0.9f), new Color(0.1f, 0.2f, 0.45f));
            BuildParkedVehicleAt(-350f, -parkedVehicleOffset, "ParkedCar",
                new Vector3(1.8f, 1.8f, 4.2f), new Color(0.85f, 0.3f, 0.3f), new Color(0.5f, 0.15f, 0.15f));
            BuildParkedVehicleAt(-690f, parkedVehicleOffset, "ParkedCar",
                new Vector3(1.8f, 1.8f, 4.2f), new Color(0.9f, 0.8f, 0.4f), new Color(0.55f, 0.45f, 0.2f));
            BuildParkedVehicleAt(-495f, -3.8f, "ParkedTruck",
                new Vector3(2.5f, 3.2f, 7.5f), new Color(0.3f, 0.6f, 0.85f), new Color(0.15f, 0.3f, 0.5f));
            BuildParkedVehicleAt(-705f, 3.9f, "ParkedBus",
                new Vector3(2.5f, 3f, 8.5f), new Color(0.35f, 0.75f, 0.4f), new Color(0.2f, 0.45f, 0.25f));

            // ── Lubang jalan (visual untuk scene ini) ─────────────────────────
            BuildPotholeAt(-508f, -3.6f);
            BuildPotholeAt(-512f, 0f);
            BuildPotholeAt(-516f, 3.6f);

            // ── Cone akhir (mendekati finish) ─────────────────────────────────
            for (var i = 0; i < 3; i++)
                BuildConeAt(-798f - i * 9f, (i % 2 == 0 ? -1f : 1f) * 4.2f);

            Debug.Log("[Kemudi.Track] Rintangan dibangun: slalom + barrier + tiang + kendaraan parkir + truk/bus + lubang + cone akhir.");
        }

        // ── Penempatan rintangan per Z ───────────────────────────────────────

        private void BuildConeAt(float z, float offset)
        {
            if (!PointNearZ(z, out var center, out var forward)) return;
            var right = RightAt(forward);
            var cone = BuildCone();
            cone.transform.position = center + right * offset + Vector3.up * 0.35f; // alas di permukaan jalan
            cone.transform.rotation = Quaternion.LookRotation(forward, Vector3.up);
            AddObstacleMarker(cone);
        }

        private void BuildBarrierAt(float z, float offset)
        {
            if (!PointNearZ(z, out var center, out var forward)) return;
            var right = RightAt(forward);
            var rotation = Quaternion.LookRotation(forward, Vector3.up);

            var barrier = GameObject.CreatePrimitive(PrimitiveType.Cube);
            barrier.name = "WaterBarrier";
            barrier.transform.SetParent(transform, false);
            barrier.transform.position = center + right * offset + Vector3.up * 0.3f;
            barrier.transform.rotation = rotation;
            // Melintang jalan: panjang sepanjang sumbu kanan, tebal tipis searah jalan.
            barrier.transform.localScale = new Vector3(2.8f, 0.6f, 0.7f);
            SetRendererMaterial(barrier, new Color(0.95f, 0.55f, 0.1f), "Barrier");
            AddObstacleMarker(barrier);
        }

        private void BuildPoleAt(float z, float offset)
        {
            if (!PointNearZ(z, out var center, out var forward)) return;
            var right = RightAt(forward);

            var pole = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pole.name = "RoadPole";
            pole.transform.SetParent(transform, false);
            pole.transform.position = center + right * offset + Vector3.up * 0.8f;
            pole.transform.localScale = new Vector3(0.15f, 0.8f, 0.15f);
            SetRendererMaterial(pole, new Color(0.85f, 0.85f, 0.9f), "Pole");
            AddObstacleMarker(pole);
        }

        private void BuildParkedVehicleAt(float z, float offset, string name,
            Vector3 boxSize, Color bodyColor, Color roofColor)
        {
            if (!PointNearZ(z, out var center, out var forward)) return;
            var right = RightAt(forward);
            var rotation = Quaternion.LookRotation(forward, Vector3.up);

            var root = new GameObject(name);
            root.transform.SetParent(transform, false);
            root.transform.position = center + right * offset;
            root.transform.rotation = rotation;

            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.name = "Body";
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0f, boxSize.y * 0.25f, 0f);
            body.transform.localScale = new Vector3(boxSize.x * 0.72f, boxSize.y * 0.4f, boxSize.z);
            SetRendererMaterial(body, bodyColor, name + "Body");
            Object.Destroy(body.GetComponent<Collider>());

            var roof = GameObject.CreatePrimitive(PrimitiveType.Cube);
            roof.name = "Roof";
            roof.transform.SetParent(root.transform, false);
            roof.transform.localPosition = new Vector3(0f, boxSize.y * 0.55f, -boxSize.z * 0.1f);
            roof.transform.localScale = new Vector3(boxSize.x * 0.66f, boxSize.y * 0.35f, boxSize.z * 0.5f);
            SetRendererMaterial(roof, roofColor, name + "Roof");
            Object.Destroy(roof.GetComponent<Collider>());

            // Satu collider utama pada root (rintangan fisik + penanda obstacle).
            var box = root.AddComponent<BoxCollider>();
            box.center = new Vector3(0f, boxSize.y * 0.5f, 0f);
            box.size = boxSize;

            AddObstacleMarker(root);
        }

        private void BuildPotholeAt(float z, float offset)
        {
            if (!PointNearZ(z, out var center, out var forward)) return;
            var right = RightAt(forward);

            var pothole = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pothole.name = "Pothole";
            pothole.transform.SetParent(transform, false);
            pothole.transform.position = center + right * offset + Vector3.up * 0.505f; // sedikit di atas aspal
            pothole.transform.localScale = new Vector3(0.9f, 0.02f, 0.9f);
            SetRendererMaterial(pothole, new Color(0.08f, 0.08f, 0.08f), "Pothole");
            Object.Destroy(pothole.GetComponent<Collider>());
            // Catatan: zona perlambat (slow zone) tidak diimplementasikan di scene ini —
            // lubang tampil sebagai penanda visual, konsisten dengan versi web yang
            // memperlambat kendaraan tanpa penalti skor.
        }

        // ── Helper ─────────────────────────────────────────────────────────

        private GameObject BuildCone()
        {
            var cone = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            cone.name = "SlalomCone";
            cone.transform.SetParent(transform, false);
            cone.transform.localScale = new Vector3(0.5f, 0.35f, 0.5f); // radius 0.25, tinggi 0.7
            SetRendererMaterial(cone, new Color(0.95f, 0.4f, 0.1f), "Cone");
            return cone;
        }

        /// <summary>Titik & arah hadap pada garis tengah yang Z-nya paling dekat dengan target.</summary>
        private bool PointNearZ(float targetZ, out Vector3 point, out Vector3 forward)
        {
            point = _centerline[0];
            forward = Vector3.forward;
            if (_centerline.Count == 0) return false;

            var best = 0;
            var bestDist = float.MaxValue;
            for (var i = 0; i < _centerline.Count; i++)
            {
                var d = Mathf.Abs(_centerline[i].z - targetZ);
                if (d < bestDist) { bestDist = d; best = i; }
            }

            point = _centerline[best];
            forward = best < _centerline.Count - 1
                ? (_centerline[best + 1] - _centerline[best]).normalized
                : (_centerline[best] - _centerline[best - 1]).normalized;
            return true;
        }

        /// <summary>Sumbu kanan jalan (tegak lurus arah maju, di bidang XZ).</summary>
        private static Vector3 RightAt(Vector3 forward) => Vector3.Cross(Vector3.up, forward).normalized;

        private static void AddObstacleMarker(GameObject go)
        {
            if (go.GetComponent<SceneryObstacle>() == null)
                go.AddComponent<SceneryObstacle>();
        }

        private static void SetRendererMaterial(GameObject go, Color color, string name)
        {
            var renderer = go.GetComponent<Renderer>();
            if (renderer != null) renderer.sharedMaterial = CreateMaterial(color, name);
        }

        /// <summary>Material runtime sederhana (URP Lit → Standard → Diffuse → Unlit/Color).</summary>
        private static Material? CreateMaterial(Color color, string name)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            if (shader == null) shader = Shader.Find("Diffuse");
            if (shader == null) shader = Shader.Find("Unlit/Color");
            if (shader == null) return null; // tanpa shader → biarkan tanpa material

            var mat = new Material(shader) { name = name };
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
            else if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
            return mat;
        }
    }
}
