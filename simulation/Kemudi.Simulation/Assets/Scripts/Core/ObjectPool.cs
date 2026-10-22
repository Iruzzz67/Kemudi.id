using System;
using System.Collections.Generic;
using UnityEngine;

namespace Kemudi.Simulation.Core
{
    /// <summary>
    /// Object pool generik (§47) — menghindari Instantiate/Destroy berulang
    /// untuk traffic vehicle, pedestrian, warning, dan efek. Dipakai oleh
    /// TrafficManager & PedestrianManager selama gameplay.
    /// </summary>
    public sealed class ObjectPool<T> where T : Component
    {
        private readonly T _prefab;
        private readonly Transform _parent;
        private readonly Stack<T> _available = new();
        private readonly List<T> _active = new();

        public int ActiveCount => _active.Count;

        public ObjectPool(T prefab, Transform parent, int prewarm = 0)
        {
            _prefab = prefab;
            _parent = parent;
            for (var i = 0; i < prewarm; i++) Release(CreateInstance());
        }

        /// <summary>Ambil instance (dari pool kalau ada, atau buat baru).</summary>
        public T Get()
        {
            var item = _available.Count > 0 ? _available.Pop() : CreateInstance();
            _active.Add(item);
            item.gameObject.SetActive(true);
            return item;
        }

        /// <summary>Kembalikan instance ke pool (nonaktif, bukan Destroy).</summary>
        public void Release(T item)
        {
            if (item == null) return;
            _active.Remove(item);
            item.gameObject.SetActive(false);
            _available.Push(item);
        }

        /// <summary>Kembalikan semua instance aktif ke pool.</summary>
        public void ReleaseAll()
        {
            // Iterasi snapshot — Release() memodifikasi _active (Remove) sehingga
            // foreach langsung akan melempar InvalidOperationException.
            foreach (var item in _active.ToArray()) Release(item);
        }

        private T CreateInstance()
        {
            var go = UnityEngine.Object.Instantiate(_prefab.gameObject, _parent);
            go.SetActive(false);
            return go.GetComponent<T>();
        }
    }
}
