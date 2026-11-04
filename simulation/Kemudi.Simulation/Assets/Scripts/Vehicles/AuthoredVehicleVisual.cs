using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Kemudi.Simulation.Vehicles
{
    /// <summary>Loads the same authored mesh data used by the web GLBs, without an importer plugin.</summary>
    public sealed class AuthoredVehicleVisual : MonoBehaviour
    {
        [Serializable] private sealed class Recipe { public int version; public MaterialData[] materials; public GeometryData[] geometries; public NodeData[] nodes; }
        [Serializable] private sealed class MaterialData { public string name, color, emission; public float metalness, roughness, opacity, emissionIntensity; }
        [Serializable] private sealed class GeometryData { public float[] vertices, normals; public int[] indices; }
        [Serializable] private sealed class NodeData { public string name; public int parent, geometry, material; public float[] position, rotation, scale; public float radius; }
        private struct Wheel { public Transform transform; public float radius; }
        private readonly List<Mesh> _meshes = new();
        private readonly List<Material> _materials = new();
        private readonly List<Wheel> _wheels = new();
        private readonly List<Transform> _steering = new();
        private Transform _body, _steeringWheel;
        private Vector3 _bodyRest;
        private VehicleController _controller;
        private Rigidbody _rigidbody;
        private float _lastSpeed, _rollAngle;

        public static bool Build(GameObject vehicle, VehicleConfig config)
        {
            return BuildAsset(vehicle, "KemudiVehicles/" + config.Type.ToString().ToLowerInvariant());
        }

        public static bool BuildAsset(GameObject vehicle, string resourcePath)
        {
            var asset = Resources.Load<TextAsset>(resourcePath);
            if (asset == null) { Debug.LogError("[Kemudi] Authored mesh data missing: " + resourcePath); return false; }
            var recipe = JsonUtility.FromJson<Recipe>(asset.text);
            if (recipe == null || recipe.version != 1) return false;
            var owner = new GameObject("AuthoredVisual");
            owner.transform.SetParent(vehicle.transform, false);
            var visual = owner.AddComponent<AuthoredVehicleVisual>();
            visual._controller = vehicle.GetComponent<VehicleController>();
            visual._rigidbody = vehicle.GetComponent<Rigidbody>();
            visual.Load(recipe);
            if (visual._controller == null) visual.enabled = false;
            return true;
        }

        private void Load(Recipe recipe)
        {
            // A Resources material retains the URP shader in standalone builds.
            var template = Resources.Load<Material>("KemudiVehicles/VehicleBase");
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            foreach (var data in recipe.materials)
            {
                var mat = template != null ? new Material(template) : new Material(shader);
                mat.name = data.name;
                ColorUtility.TryParseHtmlString(data.color, out var color);
                color.a = data.opacity;
                mat.color = color;
                if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
                mat.SetFloat("_Metallic", data.metalness);
                if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", 1f - data.roughness);
                if (mat.HasProperty("_Glossiness")) mat.SetFloat("_Glossiness", 1f - data.roughness);
                ColorUtility.TryParseHtmlString(data.emission, out var emission);
                mat.SetColor("_EmissionColor", emission * data.emissionIntensity);
                if (emission.maxColorComponent > 0f) mat.EnableKeyword("_EMISSION");
                if (data.opacity < 1f)
                {
                    mat.SetOverrideTag("RenderType", "Transparent");
                    if (mat.HasProperty("_Surface")) mat.SetFloat("_Surface", 1f);
                    if (mat.HasProperty("_Mode")) mat.SetFloat("_Mode", 3f);
                    mat.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
                    mat.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
                    mat.SetFloat("_ZWrite", 0f);
                    mat.SetFloat("_Cull", (float)CullMode.Off);
                    mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                    mat.EnableKeyword("_ALPHABLEND_ON");
                    mat.SetShaderPassEnabled("ShadowCaster", false);
                    mat.renderQueue = (int)RenderQueue.Transparent;
                }
                _materials.Add(mat);
            }
            foreach (var data in recipe.geometries)
            {
                // Reflect Z to convert Three's right-handed -Z front to Unity's +Z front.
                var vertices = Vectors(data.vertices); var normals = Vectors(data.normals);
                var indices = (int[])data.indices.Clone();
                for (var i = 0; i < indices.Length; i += 3) (indices[i + 1], indices[i + 2]) = (indices[i + 2], indices[i + 1]);
                var mesh = new Mesh { name = "Kemudi authored mesh", indexFormat = vertices.Length > 65535 ? IndexFormat.UInt32 : IndexFormat.UInt16 };
                mesh.vertices = vertices; mesh.normals = normals; mesh.triangles = indices; mesh.RecalculateBounds();
                _meshes.Add(mesh);
            }
            var nodes = new Transform[recipe.nodes.Length];
            for (var i = 0; i < recipe.nodes.Length; i++)
            {
                var data = recipe.nodes[i];
                var node = new GameObject(data.name); nodes[i] = node.transform;
                node.transform.SetParent(data.parent < 0 ? transform : nodes[data.parent], false);
                node.transform.localPosition = new Vector3(data.position[0], data.position[1], -data.position[2]);
                node.transform.localRotation = new Quaternion(-data.rotation[0], -data.rotation[1], data.rotation[2], data.rotation[3]);
                node.transform.localScale = new Vector3(data.scale[0], data.scale[1], data.scale[2]);
                if (data.geometry >= 0)
                {
                    node.AddComponent<MeshFilter>().sharedMesh = _meshes[data.geometry];
                    var renderer = node.AddComponent<MeshRenderer>(); renderer.sharedMaterial = _materials[data.material];
                    renderer.shadowCastingMode = recipe.materials[data.material].opacity < 1f ? ShadowCastingMode.Off : ShadowCastingMode.On;
                }
                else
                {
                    if (data.name.StartsWith("Wheel_")) _wheels.Add(new Wheel { transform = node.transform, radius = data.radius });
                    if (data.name.StartsWith("Steer_")) _steering.Add(node.transform);
                    if (data.name == "BodyMotion") { _body = node.transform; _bodyRest = _body.localPosition; }
                    if (data.name == "SteeringWheel") _steeringWheel = node.transform;
                }
            }
        }

        private static Vector3[] Vectors(float[] packed)
        {
            var output = new Vector3[packed.Length / 3];
            for (var i = 0; i < output.Length; i++) output[i] = new Vector3(packed[i * 3], packed[i * 3 + 1], -packed[i * 3 + 2]);
            return output;
        }

        private void LateUpdate()
        {
            if (_rigidbody == null || _controller == null || Time.deltaTime <= 0f) return;
            var dt = Mathf.Min(Time.deltaTime, .05f);
#if UNITY_6000_0_OR_NEWER
            var velocity = _rigidbody.linearVelocity;
#else
            var velocity = _rigidbody.velocity;
#endif
            var speed = Vector3.Dot(velocity, _rigidbody.transform.forward);
            var steer = _controller.EffectiveSteering(Mathf.Abs(speed) * 3.6f);
            foreach (var wheel in _wheels) wheel.transform.Rotate(Vector3.right, speed * dt / wheel.radius * Mathf.Rad2Deg, Space.Self);
            foreach (var pivot in _steering) pivot.localRotation = Quaternion.Euler(0f, steer, 0f);
            if (_steeringWheel != null) _steeringWheel.localRotation = Quaternion.Euler(0f, 0f, -steer * 4.5f);
            if (_body != null)
            {
                var acceleration = Mathf.Clamp((speed - _lastSpeed) / dt, -10f, 10f);
                var lean = _controller.Config.Type == VehicleConfig.VehicleType.Motor ? -.18f : .035f;
                _rollAngle = Mathf.Lerp(_rollAngle, steer * Mathf.Clamp(speed / 10f, -1f, 1f) * lean, 1f - Mathf.Exp(-7f * dt));
                _body.localRotation = Quaternion.Slerp(_body.localRotation, Quaternion.Euler(acceleration * .16f, 0f, _rollAngle), 1f - Mathf.Exp(-7f * dt));
                _body.localPosition = Vector3.Lerp(_body.localPosition, _bodyRest + Vector3.up * (-Mathf.Abs(acceleration) * .002f), 1f - Mathf.Exp(-9f * dt));
            }
            _lastSpeed = speed;
        }

        private void OnDestroy()
        {
            foreach (var mesh in _meshes) Destroy(mesh);
            foreach (var material in _materials) Destroy(material);
        }
    }
}
