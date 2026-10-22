using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace Kemudi.Simulation.Input
{
    /// <summary>
    /// Provider VR controller (§31) — mapping universal agar tidak terkunci
    /// pada satu merek headset. Semua aksi dipetakan lewat Input Action
    /// (OpenXR + Unity Input System); hasilnya sama dengan keyboard:
    /// VehicleInputState. Rising-edge dideteksi dari transisi button.
    ///
    /// Mapping (§31):
    ///   Left Stick X   = Steering
    ///   Left Stick Y   = (opsional walking/camera — diabaikan saat driving)
    ///   Right Stick    = Camera (siklus)
    ///   A              = Action / Enter / Confirm
    ///   B              = Cancel / Exit
    ///   X              = Gear Down
    ///   Y              = Gear Up
    ///   Trigger        = Gas
    ///   Grip           = Brake
    ///   Menu           = Pause
    /// </summary>
    public sealed class XRInputProvider : MonoBehaviour, UniversalInputSystem.IInputProvider
    {
#if ENABLE_INPUT_SYSTEM
        [Header("Input Actions (assign di Editor)")]
        [SerializeField] private InputActionReference moveAction = null!;      // Vector2 (stik kiri: X = kemudi)
        [SerializeField] private InputActionReference triggerAction = null!;   // float (gas)
        [SerializeField] private InputActionReference gripAction = null!;      // float (rem)
        [SerializeField] private InputActionReference buttonA = null!;         // enter / confirm
        [SerializeField] private InputActionReference buttonB = null!;         // cancel / exit
        [SerializeField] private InputActionReference buttonX = null!;         // gear down
        [SerializeField] private InputActionReference buttonY = null!;         // gear up
        [SerializeField] private InputActionReference menuAction = null!;      // pause
#endif

        public bool IsActive => enabled;

#if !ENABLE_INPUT_SYSTEM
        // Paket Unity Input System belum terpasang — provider nonaktif aman.
        public void Sample(VehicleInputState current, out VehicleInputState next)
        {
            next = current;
        }
#else

        private bool _prevA, _prevB, _prevX, _prevY, _prevMenu;
        private bool _prevLookCamera;
        private bool _lookWasCamera;

        [Header("Input Actions (assign di Editor)")]
        [SerializeField] private InputActionReference lookAction = null!; // Vector2 (stik kanan: X ekstrem = siklus kamera)

        public void Sample(VehicleInputState current, out VehicleInputState next)
        {
            var move = ReadVector2(moveAction);
            var trigger = ReadFloat(triggerAction);
            var grip = ReadFloat(gripAction);
            var look = ReadVector2(lookAction);
            // Right stick X ekstrem → siklus kamera (rising-edge per sentakan).
            var lookCamera = Mathf.Abs(look.x) > 0.85f;
            _lookWasCamera = lookCamera && !_prevLookCamera;
            _prevLookCamera = lookCamera;

            var a = ReadBool(buttonA);
            var b = ReadBool(buttonB);
            var x = ReadBool(buttonX);
            var y = ReadBool(buttonY);
            var menu = ReadBool(menuAction);

            next = new VehicleInputState
            {
                Steering = move.x,
                Throttle = Mathf.Clamp01(trigger),
                Brake = Mathf.Clamp01(grip),

                // Tombol diskrit: rising-edge (sekali per tekan).
                ReverseRequested = Edge(a, ref _prevA),
                CameraCycle = Edge(b, ref _prevB) || _lookWasCamera,
                GearDown = Edge(x, ref _prevX),
                GearUp = Edge(y, ref _prevY),
                Pause = Edge(menu, ref _prevMenu)
            };
        }

        private static bool Edge(bool current, ref bool previous)
        {
            var edge = current && !previous;
            previous = current;
            return edge;
        }

        private static Vector2 ReadVector2(InputActionReference action)
        {
            if (action == null || action.action == null) return Vector2.zero;
            return action.action.ReadValue<Vector2>();
        }

        private static float ReadFloat(InputActionReference action)
        {
            if (action == null || action.action == null) return 0f;
            return action.action.ReadValue<float>();
        }

        private static bool ReadBool(InputActionReference action)
        {
            if (action == null || action.action == null) return false;
            return action.action.ReadValue<float>() > 0.5f || action.action.IsPressed();
        }
#endif
    }
}
