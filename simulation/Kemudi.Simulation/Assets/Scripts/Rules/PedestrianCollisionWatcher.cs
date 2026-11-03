using Kemudi.Simulation.Environment;
using UnityEngine;

namespace Kemudi.Simulation.Rules
{
    /// <summary>
    /// Menabrak pejalan kaki = langsung gagal (aturan inti, §64).
    /// Dipasang pada kendaraan pemain; deteksi via OnCollisionEnter dengan
    /// objek yang memiliki <see cref="Pedestrian"/>. Event-driven — bukan
    /// pengecekan per frame (§46).
    /// </summary>
    public sealed class PedestrianCollisionWatcher : MonoBehaviour
    {
        [SerializeField] private Core.SimulationManager simulation = null!;

        /// <summary>Wire dependency — dipakai scene bootstrap (komponen dibuat saat runtime).</summary>
        public void Configure(Core.SimulationManager manager) => simulation = manager;

        private void OnCollisionEnter(Collision collision)
        {
            if (simulation == null) return;
            if (collision.collider != null &&
                collision.collider.GetComponentInParent<Pedestrian>() != null)
            {
                simulation.Fail("Menabrak pejalan kaki!");
            }
        }
    }
}
