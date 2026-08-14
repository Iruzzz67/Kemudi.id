using System;

namespace Kemudi.Simulation.Input
{
    /// <summary>
    /// Snapshot input universal yang dikonsumsi VehicleController setiap frame.
    /// Sumber input (keyboard/gamepad/VR/wheel/hand-tracking) TIDAK pernah
    /// ditulis langsung ke controller — semua lewat sini.
    /// </summary>
    [Serializable]
    public struct VehicleInputState
    {
        // Analog (0..1 / -1..1)
        public float Steering;      // -1 = kiri penuh, +1 = kanan penuh
        public float Throttle;      // 0..1
        public float Brake;         // 0..1
        public float Clutch;        // 0..1 (pedal kopling)

        // Diskrit (rising-edge, sekali per tekan)
        public bool HandbrakePressed;
        public bool GearUp;
        public bool GearDown;
        public bool ReverseRequested;
        public bool NeutralRequested;
        public bool CameraCycle;
        public bool Pause;
        public bool Ignition;

        // Saklar lampu & sein
        public bool HeadlightToggle;
        public bool HighBeamToggle;
        public bool HazardToggle;
        public bool TurnSignalLeft;
        public bool TurnSignalRight;
        public bool HornHeld;

        // Checklist pra-jalan (§43): B (sabuk), H (helm), J (jaket),
        // G (sarung tangan), F (sepatu), [ (kursi), ] (spion). Rising-edge
        // sekali per tekan.
        public bool ToggleSeatbelt;
        public bool ToggleHelmet;
        public bool ToggleJacket;
        public bool ToggleGloves;
        public bool ToggleBoots;
        public bool AdjustSeat;
        public bool AdjustMirrors;

        public static VehicleInputState Empty => new VehicleInputState();

        public readonly bool IsIdle =>
            Math.Abs(Steering) < 0.01f &&
            Throttle < 0.01f &&
            Brake < 0.01f &&
            Clutch < 0.01f &&
            !HandbrakePressed && !GearUp && !GearDown &&
            !ReverseRequested && !NeutralRequested && !CameraCycle &&
            !Pause && !Ignition && !HeadlightToggle && !HighBeamToggle &&
            !HazardToggle && !TurnSignalLeft && !TurnSignalRight && !HornHeld &&
            !ToggleSeatbelt && !ToggleHelmet && !ToggleJacket &&
            !ToggleGloves && !ToggleBoots && !AdjustSeat && !AdjustMirrors;
    }
}
