using System.Collections.Generic;
using UnityEngine;

namespace Kemudi.Simulation.Vehicles
{
    /// <summary>Wheel movement for the authored hatchback used by kinematic traffic.</summary>
    public sealed class TrafficWheelVisual : MonoBehaviour
    {
        private readonly List<Transform> _wheels = new();
        private Vector3 _previous;
        private void OnEnable() { _previous = transform.position; }
        private void Start() {
            foreach(var child in GetComponentsInChildren<Transform>())
                if(child.name.StartsWith("Wheel_") && child.GetComponent<MeshRenderer>() == null) _wheels.Add(child);
        }
        private void LateUpdate() {
            var delta = transform.position - _previous; _previous = transform.position;
            if(delta.sqrMagnitude > 25f) return; // Pooled respawn is not wheel travel.
            var angle = Vector3.Dot(delta, transform.forward) / .32f * Mathf.Rad2Deg;
            foreach(var wheel in _wheels)wheel.Rotate(Vector3.right,angle,Space.Self);
        }
    }
}
