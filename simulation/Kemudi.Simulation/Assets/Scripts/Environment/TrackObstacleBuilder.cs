using System.Collections.Generic;
using UnityEngine;

namespace Kemudi.Simulation.Environment
{
    /// <summary>
    /// Pembangun rintangan lintasan — padanan array OBSTACLES di lib/scenery.ts
    /// versi web, dengan LAYOUT YANG SUDAH DILEBARKAN agar mudah dilewati:
    ///
    ///   - Cone slalom di tepi jalan (lateral ±4.2 m dari tengah) → koridor
    ///     tengah ±8 m bebas; pemain bisa lewat lurus tanpa slalom rapat.
    ///   - Water barrier melintang di tepi jalan (lateral ±4.5 m, panjang 2.8 m)
    ///     → celah tengah ±6 m.
    ///   - Kendaraan parkir di bahu jalan (lateral ±4.2 m).
    ///
    /// Semua prop SOLID (memakai collider) → menabraknya tercatat sebagai
    /// hit ObstacleHit (penalti ringan -3 poin, obstacleHits di laporan §62).
    /// Celah yang lebar membuat pemain jarang menyentuh rintangan → jarang kena
    /// penalti.
    ///
    /// Rute diambil dari garis tengah (posisi waypoint TrackBuilder), jadi
    /// penempatan otomatis mengikuti belokan. Panggil <see cref="Build"/> di
    /// scene bootstrap setelah jalan dibangun.
    /// </summary>
    public sealed class TrackObstacleBuilder : MonoBehaviour
    {
        [Header("Celah (meter, diukur dari tengah jalan)")]
        [Tooltip("Cone slalom: geser lateral dari tengah jalan (tepi jalan ±5).")]
        [SerializeField] private float laneConeOffset = 4.2f;
        [Tooltip("Water barrier: geser lateral dari tengah jalan.")]
        [SerializeField] private float barrierOffset = 4.5f;
        [Tooltip("Panjang barrier yang tampil MELINTANG jalan (meter).")]
        [SerializeField] private float barrierLength = 2.8f;
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

            BuildSlalom(12f, 4, 6f);   // 4 cone berselang-seling, mulai jarak 12 m
            BuildBarriers(85f);        // 2 water barrier melintang di tepi jalan
            BuildParkedVehicle(165f);  // 1 mobil parkir di bahu jalan

            Debug.Log("[Kemudi.Track] Rintangan dibangun: 4 cone + 2 barrier + 1 kendaraan parkir (celah lebar).");
        }

        // ── Penempatan rintangan ───────────────────────────────────────────

        private void BuildSlalom(float startDistance, int count, float spacing)
        {
            for (var i = 0; i < count; i++)
            {
                var distance = startDistance + i * spacing;
                if (!PointAtDistance(distance, out var center, out var forward)) break;
                var right = RightAt(forward);
                var lateral = (i % 2 == 0 ? -1f : 1f) * laneConeOffset; // berselang kiri/kanan

                var cone = BuildCone();
                cone.transform.position = center + right * lateral + Vector3.up * 0.35f; // alas di permukaan jalan
                AddObstacleMarker(cone);
            }
        }

        private void BuildBarriers(float distance)
        {
            if (!PointAtDistance(distance, out var center, out var forward)) return;
            var right = RightAt(forward);
            var rotation = Quaternion.LookRotation(forward, Vector3.up);
            foreach (var side in new[] { -1f, 1f })
            {
                var barrier = GameObject.CreatePrimitive(PrimitiveType.Cube);
                barrier.name = "WaterBarrier";
                barrier.transform.SetParent(transform, false);
                barrier.transform.position = center + right * (side * barrierOffset) + Vector3.up * 0.3f;
                barrier.transform.rotation = rotation;
                // Melintang jalan: panjang sepanjang sumbu kanan, tebal tipis searah jalan.
                barrier.transform.localScale = new Vector3(barrierLength, 0.6f, 0.7f);
                SetRendererMaterial(barrier, new Color(0.95f, 0.55f, 0.1f), "Barrier");
                AddObstacleMarker(barrier);
            }
        }

        private void BuildParkedVehicle(float distance)
        {
            if (!PointAtDistance(distance, out var center, out var forward)) return;
            var right = RightAt(forward);
            var rotation = Quaternion.LookRotation(forward, Vector3.up);

            var root = new GameObject("ParkedCar");
            root.transform.SetParent(transform, false);
            root.transform.position = center + right * parkedVehicleOffset;
            root.transform.rotation = rotation;

            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.name = "Body";
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0f, 0.85f, 0f);
            body.transform.localScale = new Vector3(1.8f, 0.7f, 4.2f);
            SetRendererMaterial(body, new Color(0.2f, 0.45f, 0.9f), "ParkedCarBody");
            Object.Destroy(body.GetComponent<Collider>());

            var roof = GameObject.CreatePrimitive(PrimitiveType.Cube);
            roof.name = "Roof";
            roof.transform.SetParent(root.transform, false);
            roof.transform.localPosition = new Vector3(0f, 1.4f, -0.4f);
            roof.transform.localScale = new Vector3(1.6f, 0.5f, 2f);
            SetRendererMaterial(roof, new Color(0.1f, 0.2f, 0.45f), "ParkedCarRoof");
            Object.Destroy(roof.GetComponent<Collider>());

            // Satu collider utama pada root (rintangan fisik + penanda obstacle).
            var box = root.AddComponent<BoxCollider>();
            box.center = new Vector3(0f, 0.9f, 0f);
            box.size = new Vector3(1.8f, 1.8f, 4.2f);

            AddObstacleMarker(root);
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

        /// <summary>Titik & arah hadap pada garis tengah di jarak sepanjang polyline (meter).</summary>
        private bool PointAtDistance(float distance, out Vector3 point, out Vector3 forward)
        {
            point = _centerline[0];
            forward = Vector3.forward;
            var travelled = 0f;
            for (var i = 0; i < _centerline.Count - 1; i++)
            {
                var a = _centerline[i];
                var b = _centerline[i + 1];
                var segment = b - a;
                var length = segment.magnitude;
                if (travelled + length >= distance)
                {
                    var t = length > 0.001f ? Mathf.Max(0f, distance - travelled) / length : 0f;
                    point = Vector3.Lerp(a, b, t);
                    forward = segment.normalized;
                    return true;
                }
                travelled += length;
            }
            // Jarak melebihi akhir lintasan → pakai arah segmen terakhir.
            if (_centerline.Count >= 2)
                forward = (_centerline[_centerline.Count - 1] - _centerline[_centerline.Count - 2]).normalized;
            return false;
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
