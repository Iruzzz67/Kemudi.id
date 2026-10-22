using UnityEngine;

namespace Kemudi.Simulation.Environment
{
    /// <summary>
    /// Penanda objek rintangan lintasan (cone slalom, water barrier, kendaraan
    /// parkir) yang dibuat <see cref="TrackObstacleBuilder"/>. Dipakai
    /// Rules.ObstacleCollisionWatcher untuk menghitung obstacleHits (§62) —
    /// padanan SCENERY_ITEMS solid/soft di lib/scenery.ts versi web.
    /// </summary>
    public sealed class SceneryObstacle : MonoBehaviour
    {
    }
}
