using System;
using System.Collections.Generic;
using UnityEngine;

namespace Kemudi.Simulation.Input
{
    /// <summary>
    /// Corong input tunggal: mengumpulkan provider (keyboard, gamepad, VR,
    /// wheel, hand tracking) menjadi satu <see cref="VehicleInputState"/>.
    /// Controller mengemudi hanya membaca hasil akhirnya.
    /// </summary>
    public sealed class UniversalInputSystem : MonoBehaviour
    {
        public interface IInputProvider
        {
            void Sample(VehicleInputState current, out VehicleInputState next);
            bool IsActive { get; }
        }

        private readonly List<IInputProvider> _providers = new();

        /// <summary>Snapshot input terbaru (dibaca VehicleController di Update).</summary>
        public VehicleInputState Current { get; private set; }

        private void Update()
        {
            var next = Current;
            foreach (var provider in _providers)
            {
                if (!provider.IsActive) continue;
                provider.Sample(Current, out var contributed);
                next = Merge(next, contributed);
            }
            Current = next;
        }

        public void Register(IInputProvider provider)
        {
            if (!_providers.Contains(provider)) _providers.Add(provider);
        }

        public void Unregister(IInputProvider provider) => _providers.Remove(provider);

        /// <summary>
        /// Gabungkan dua snapshot. Nilai analog: yang bukan nol menang (VR/gamepad
        /// mengambil alih saat aktif). Flag diskrit: OR (semua aksi sekali-tekan
        /// diteruskan).
        /// </summary>
        private static VehicleInputState Merge(VehicleInputState a, VehicleInputState b)
        {
            var merged = a;
            if (b.Steering != 0f) merged.Steering = b.Steering;
            if (b.Throttle > 0f) merged.Throttle = b.Throttle;
            if (b.Brake > 0f) merged.Brake = b.Brake;
            if (b.Clutch > 0f) merged.Clutch = b.Clutch;

            merged.HandbrakePressed |= b.HandbrakePressed;
            merged.GearUp |= b.GearUp;
            merged.GearDown |= b.GearDown;
            merged.ReverseRequested |= b.ReverseRequested;
            merged.NeutralRequested |= b.NeutralRequested;
            merged.CameraCycle |= b.CameraCycle;
            merged.Pause |= b.Pause;
            merged.Ignition |= b.Ignition;
            merged.HeadlightToggle |= b.HeadlightToggle;
            merged.HighBeamToggle |= b.HighBeamToggle;
            merged.HazardToggle |= b.HazardToggle;
            merged.TurnSignalLeft |= b.TurnSignalLeft;
            merged.TurnSignalRight |= b.TurnSignalRight;
            merged.HornHeld |= b.HornHeld;

            merged.ToggleSeatbelt |= b.ToggleSeatbelt;
            merged.ToggleHelmet |= b.ToggleHelmet;
            merged.ToggleJacket |= b.ToggleJacket;
            merged.ToggleGloves |= b.ToggleGloves;
            merged.ToggleBoots |= b.ToggleBoots;
            merged.AdjustSeat |= b.AdjustSeat;
            merged.AdjustMirrors |= b.AdjustMirrors;
            return merged;
        }
    }
}
