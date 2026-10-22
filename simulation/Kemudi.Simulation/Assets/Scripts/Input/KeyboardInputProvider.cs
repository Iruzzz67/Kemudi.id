using UnityEngine;

namespace Kemudi.Simulation.Input
{
    /// <summary>
    /// Provider keyboard — memetakan tombol (sama dengan aplikasi lama) ke
    /// <see cref="VehicleInputState"/>. Rising-edge flag dibersihkan setelah
    /// dibaca agar aksi sekali-tekan tidak terulang.
    /// </summary>
    public sealed class KeyboardInputProvider : MonoBehaviour, UniversalInputSystem.IInputProvider
    {
        private bool _handbrake, _gearUp, _gearDown, _reverse, _neutral;
        private bool _camera, _pause, _ignition;
        private bool _headlight, _highBeam, _hazard, _signalL, _signalR;
        private bool _seatbelt, _helmet, _jacket, _gloves, _boots;
        private bool _seat, _mirrors;

        public bool IsActive => enabled;

        public void Sample(VehicleInputState current, out VehicleInputState next)
        {
            next = new VehicleInputState
            {
                Steering = RawAxis(),
                Throttle = Key(KeyCode.W) || Key(KeyCode.UpArrow) ? 1f : 0f,
                Brake = Key(KeyCode.S) || Key(KeyCode.DownArrow) ? 1f : 0f,
                Clutch = Key(KeyCode.LeftShift) || Key(KeyCode.RightShift) ? 1f : 0f,
                HornHeld = Key(KeyCode.T),

                HandbrakePressed = Consume(ref _handbrake),
                GearUp = Consume(ref _gearUp),
                GearDown = Consume(ref _gearDown),
                ReverseRequested = Consume(ref _reverse),
                NeutralRequested = Consume(ref _neutral),
                CameraCycle = Consume(ref _camera),
                Pause = Consume(ref _pause),
                Ignition = Consume(ref _ignition),

                HeadlightToggle = Consume(ref _headlight),
                HighBeamToggle = Consume(ref _highBeam),
                HazardToggle = Consume(ref _hazard),
                TurnSignalLeft = Consume(ref _signalL),
                TurnSignalRight = Consume(ref _signalR),

                // Checklist pra-jalan (§43)
                ToggleSeatbelt = Consume(ref _seatbelt),
                ToggleHelmet = Consume(ref _helmet),
                ToggleJacket = Consume(ref _jacket),
                ToggleGloves = Consume(ref _gloves),
                ToggleBoots = Consume(ref _boots),
                AdjustSeat = Consume(ref _seat),
                AdjustMirrors = Consume(ref _mirrors)
            };
        }

        private void Update()
        {
            // Edge detection: hanya set saat keydown (bukan repeat).
            // Mapping tombol mengikuti tabel kontrol dokumen migrasi (§67).
            // NOTE: namespace Kemudi.Simulation.Input menaungi nama `Input` —
            // wajib kualifikasi penuh UnityEngine.Input.
            if (UnityEngine.Input.GetKeyDown(KeyCode.Space)) _handbrake = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.E) || UnityEngine.Input.GetKeyDown(KeyCode.Period) || UnityEngine.Input.GetKeyDown(KeyCode.PageUp)) _gearUp = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.Q) || UnityEngine.Input.GetKeyDown(KeyCode.Comma) || UnityEngine.Input.GetKeyDown(KeyCode.PageDown)) _gearDown = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.R)) _reverse = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.N)) _neutral = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.C)) _camera = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.P)) _pause = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.I)) _ignition = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.L)) _headlight = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.K)) _highBeam = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.V)) _hazard = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.Z)) _signalL = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.X)) _signalR = true;
            // Checklist (§43): B sabuk, H helm, J jaket, G sarung tangan, F sepatu
            if (UnityEngine.Input.GetKeyDown(KeyCode.B)) _seatbelt = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.H)) _helmet = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.J)) _jacket = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.G)) _gloves = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.F)) _boots = true;
            // Kursi & spion (Mobil/Truk, §43) — tombol tambahan di luar tabel §67
            if (UnityEngine.Input.GetKeyDown(KeyCode.LeftBracket)) _seat = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.RightBracket)) _mirrors = true;
        }

        private static bool Key(KeyCode code) => UnityEngine.Input.GetKey(code);

        private static bool Consume(ref bool flag)
        {
            var value = flag;
            flag = false;
            return value;
        }

        /// <summary>Steering keyboard: A/D atau panah kiri/kanan, tanpa smoothing.</summary>
        private static float RawAxis()
        {
            var axis = 0f;
            if (UnityEngine.Input.GetKey(KeyCode.A) || UnityEngine.Input.GetKey(KeyCode.LeftArrow)) axis -= 1f;
            if (UnityEngine.Input.GetKey(KeyCode.D) || UnityEngine.Input.GetKey(KeyCode.RightArrow)) axis += 1f;
            return axis;
        }
    }
}
