using Kemudi.Simulation.Input;
using UnityEngine;

namespace Kemudi.Simulation.Transmission
{
    /// <summary>
    /// Transmisi manual: wajib injak kopling sebelum oper gigi. Oper tanpa
    /// kopling = gear grind; 3 kesalahan beruntun = stall (sama aplikasi lama).
    /// </summary>
    public sealed class ManualTransmissionController : TransmissionController
    {
        [SerializeField] private int clutchMistakeLimit = 3;

        public int ClutchMistakes { get; private set; }
        public bool GearBlocked { get; private set; }
        public float ClutchPedal { get; private set; }

        private UniversalInputSystem? _inputSystem;

        public void Bind(UniversalInputSystem input) => _inputSystem = input;

        private void Update()
        {
            if (_inputSystem != null)
                ClutchPedal = _inputSystem.Current.Clutch;
        }

        public override void ShiftUp(EngineController engine) => Shift(engine, +1);
        public override void ShiftDown(EngineController engine) => Shift(engine, -1);

        private void Shift(EngineController engine, int delta)
        {
            if (ClutchPedal <= 0.1f)
            {
                // Gear grind: tanpa kopling.
                ClutchMistakes++;
                if (ClutchMistakes >= clutchMistakeLimit)
                {
                    ClutchMistakes = 0;
                    engine.Stall("Mesin mati! Terlalu banyak oper gigi tanpa kopling.");
                }
                return;
            }

            ClutchMistakes = 0;
            var target = CurrentGear + delta;
            if (IsReverse) target = 0;
            if (target < 0 || target >= config.GearCount) return;

            CurrentGear = target;
            GearBlocked = false;
        }

        public override void RequestReverse(EngineController engine)
        {
            if (ClutchPedal <= 0.1f)
            {
                engine.Stall("Oper gigi tanpa kopling!");
                return;
            }
            if (CurrentGear == Neutral) CurrentGear = Reverse;
            else if (IsReverse) CurrentGear = Neutral;
        }

        public override void RequestNeutral()
        {
            if (ClutchPedal <= 0.1f) return;
            CurrentGear = Neutral;
        }

        public override float ComputeRpmRatio(float speed)
        {
            if (IsNeutral || IsReverse) return 0.2f;
            var top = config.TopSpeedInGear(CurrentGear);
            return Mathf.Clamp01(speed / Mathf.Max(1f, top));
        }
    }
}
