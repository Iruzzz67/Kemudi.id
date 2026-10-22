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
                TurnSignalRight = Consume(ref _signalR)
            };
        }

        private void Update()
        {
            // Catatan: 'Input' polos akan di-resolve ke namespace
            // Kemudi.Simulation.Input (namespace file ini) sehingga input
            // legacy Unity harus ditulis lengkap sebagai UnityEngine.Input.

            // Edge detection: hanya set saat keydown (bukan repeat).
            if (UnityEngine.Input.GetKeyDown(KeyCode.Space)) _handbrake = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.E) || UnityEngine.Input.GetKeyDown(KeyCode.PageUp)) _gearUp = true;
            if (UnityEngine.Input.GetKeyDown(KeyCode.Q) || UnityEngine.Input.GetKeyDown(KeyCode.PageDown)) _gearDown = true;
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
