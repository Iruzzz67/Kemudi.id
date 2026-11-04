using System;
using System.Collections.Generic;
using Kemudi.Simulation.Vehicles;
using UnityEngine;
using UnityEngine.Rendering;

namespace Kemudi.Simulation.Environment
{
    /// <summary>Shared authored buildings plus batched road furniture. No decorative colliders.</summary>
    public sealed class StreetscapeBuilder : MonoBehaviour
    {
        [Serializable] private sealed class Layout { public Placement[] items = Array.Empty<Placement>(); }
        [Serializable] private sealed class Placement {
            public string name = "", asset = ""; public float z, offset, yaw, scale; public bool faceRoad;
        }
        private readonly List<UnityEngine.Object> _owned = new();
        private readonly Dictionary<string, GameObject> _templates = new();
        private readonly List<Vector3>[] _vertices = { new(), new(), new(), new() };
        private readonly List<int>[] _triangles = { new(), new(), new(), new() };

        private Material Mat(string name, string hex)
        {
            var template = Resources.Load<Material>("KemudiVehicles/VehicleBase");
            var mat = new Material(template) { name = name, enableInstancing = true };
            ColorUtility.TryParseHtmlString(hex, out var color); mat.color = color;
            mat.SetFloat("_Smoothness", .12f); _owned.Add(mat); return mat;
        }
        private Texture2D Surface(bool paving)
        {
            var tex = new Texture2D(128, 128, TextureFormat.RGBA32, true) { wrapMode = TextureWrapMode.Repeat, anisoLevel = 4 };
            var pixels = new Color32[128 * 128]; uint seed = 731;
            for (var y = 0; y < 128; y++) for (var x = 0; x < 128; x++) {
                seed = unchecked(seed * 1664525 + 1013904223);
                var joint = paving && (y % 32 < 2 || (x + ((y / 32) % 2) * 32) % 64 < 2);
                var value = (byte)(joint ? 155 : (paving ? 218 : 210) + seed % (paving ? 10u : 28u));
                pixels[y * 128 + x] = new Color32(value, value, value, 255);
            }
            tex.SetPixels32(pixels); tex.Apply(true, true); _owned.Add(tex); return tex;
        }
        public void Build(List<Vector3> points, float width, Renderer road)
        {
            var asphalt = Mat("Fine asphalt", "#535e64"); asphalt.mainTexture = Surface(false);
            asphalt.mainTextureScale = new Vector2(width / 3f, 1f / 3f); road.sharedMaterial = asphalt;
            var paving = Mat("Paving blocks", "#c9c7b6"); paving.mainTexture = Surface(true);
            paving.mainTextureScale = new Vector2(2.5f, 1.25f);
            Ribbon(points, width / 2 + 1.15f, 2f, .085f, paving);
            Ribbon(points, -width / 2 - 1.15f, 2f, .085f, paving);
            var markings = Mat("Ivory markings", "#e6dfc4");
            Ribbon(points, width / 2 - .12f, .16f, .012f, markings);
            Ribbon(points, -width / 2 + .12f, .16f, .012f, markings);
            float travelled = 0, nextCurb = 1, nextDash = 6;
            for (var i = 1; i < points.Count; i++) {
                var vector = points[i] - points[i - 1]; var length = vector.magnitude; var forward = vector.normalized;
                var right = Vector3.Cross(Vector3.up, forward); var rotation = Quaternion.LookRotation(forward);
                for (; nextCurb < travelled + length; nextCurb += 1.6f) {
                    var p = points[i - 1] + forward * (nextCurb - travelled);
                    if (NearCrossing(p.z)) continue;
                    foreach (var side in new[] {-1, 1}) Box((int)(nextCurb / 1.6f) % 2, p + right * (side * (width / 2 + .16f)) + Vector3.up * .035f, rotation, new Vector3(.25f,.13f,1.57f));
                }
                for (; nextDash < travelled + length; nextDash += 9f) {
                    var p = points[i - 1] + forward * (nextDash - travelled);
                    if (!NearCrossing(p.z) && Mathf.Abs(p.z + 75) > 5 && Mathf.Abs(p.z + 650) > 5) Box(2,p + Vector3.up * .012f,rotation,new Vector3(.13f,.008f,3));
                }
                travelled += length;
            }
            for (var i = 0; i < 3; i++) MeshObject("Road details", _vertices[i], _triangles[i], null, i == 2 ? markings : Mat("Kerbstone", i == 0 ? "#c5c6bb" : "#737e7d"));
            var data = Resources.Load<TextAsset>("KemudiEnvironment/layout");
            if (data == null) return;
            foreach (var item in JsonUtility.FromJson<Layout>(data.text).items) {
                if (!_templates.TryGetValue(item.asset, out var template)) {
                    template = new GameObject("Template_" + item.asset); template.transform.SetParent(transform, false);
                    template.SetActive(false); AuthoredVehicleVisual.BuildAsset(template,"KemudiEnvironment/" + item.asset);
                    _templates.Add(item.asset,template);
                }
                Locate(points,item.z,out var center,out var forward);
                var right = Vector3.Cross(Vector3.up,forward);
                var instance = Instantiate(template,transform); instance.name = item.name;
                instance.transform.position = center + right * item.offset;
                // Recipe import reflects +Z facades to -Z; rotate that facade towards the road.
                var facing = item.faceRoad ? (item.offset > 0 ? 90f : -90f) : 0f;
                instance.transform.rotation = Quaternion.LookRotation(forward) * Quaternion.Euler(0,item.yaw * Mathf.Rad2Deg + facing,0);
                instance.transform.localScale = Vector3.one * item.scale; instance.SetActive(true);
            }
        }
        private static bool NearCrossing(float z) => Mathf.Abs(z + 150) < 3 || Mathf.Abs(z + 390) < 3 || Mathf.Abs(z + 850) < 3;
        private static void Locate(List<Vector3> points,float z,out Vector3 center,out Vector3 forward) {
            var index = 1; while (index < points.Count - 1 && points[index].z > z) index++;
            forward = (points[index] - points[index - 1]).normalized;
            center = Vector3.Lerp(points[index - 1],points[index],Mathf.InverseLerp(points[index - 1].z,points[index].z,z));
        }
        private void Ribbon(List<Vector3> points,float offset,float width,float height,Material material) {
            var vertices = new List<Vector3>(); var indices = new List<int>(); var uv = new List<Vector2>(); float distance = 0;
            for (var i = 0; i < points.Count; i++) {
                var forward = i < points.Count - 1 ? points[i + 1] - points[i] : points[i] - points[i - 1];
                var right = Vector3.Cross(Vector3.up,forward.normalized);
                if(i > 0)distance += Vector3.Distance(points[i],points[i-1]);
                vertices.Add(points[i]+right*(offset-width/2)+Vector3.up*height);vertices.Add(points[i]+right*(offset+width/2)+Vector3.up*height);
                uv.Add(new Vector2(0,distance));uv.Add(new Vector2(1,distance));
                if(i>0){var a=(i-1)*2;indices.AddRange(new[]{a,a+2,a+1,a+1,a+2,a+3});}
            }
            MeshObject("Road ribbon",vertices,indices,uv,material);
        }
        private void Box(int batch,Vector3 p,Quaternion q,Vector3 size) {
            var v=_vertices[batch];var t=_triangles[batch];var start=v.Count;
            foreach(var s in new[]{new Vector3(-1,-1,-1),new Vector3(1,-1,-1),new Vector3(1,1,-1),new Vector3(-1,1,-1),new Vector3(-1,-1,1),new Vector3(1,-1,1),new Vector3(1,1,1),new Vector3(-1,1,1)}) v.Add(p+q*Vector3.Scale(s,size*.5f));
            foreach(var n in new[]{0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5})t.Add(start+n);
        }
        private void MeshObject(string name,List<Vector3> v,List<int> t,List<Vector2>? uv,Material mat) {
            var mesh=new Mesh{name=name,indexFormat=IndexFormat.UInt32};mesh.SetVertices(v);mesh.SetTriangles(t,0);if(uv!=null)mesh.SetUVs(0,uv);mesh.RecalculateNormals();mesh.RecalculateBounds();_owned.Add(mesh);
            var go=new GameObject(name);go.transform.SetParent(transform,false);go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=mat;
        }
        private void OnDestroy(){foreach(var resource in _owned)Destroy(resource);}
    }
}
