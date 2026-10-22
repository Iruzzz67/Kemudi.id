using Kemudi.Simulation.Vehicles;
using UnityEngine;

namespace Kemudi.Simulation.UI
{
    /// <summary>
    /// Panel pengaturan handling (§44).
    ///
    /// RELEASE: hanya menampilkan 4 parameter utama —
    ///     Steering · Brake · Acceleration · Grip
    ///
    /// DEBUG (Development Build): parameter lanjutan ikut tampil —
    ///     MaxSteerAngle, SteerRate, ReturnRate, FrontGrip, RearGrip,
    ///     HandbrakeForce, Friction, CenterOfMassY, AntiRollForce.
    ///
    /// Nilai ditulis langsung ke <see cref="VehicleConfig"/> (ScriptableObject)
    /// yang dibaca VehiclePhysics setiap FixedUpdate, jadi perubahan langsung
    /// berlaku tanpa refactor fisika. Di Editor, perubahan ikut tersimpan di
    /// asset hanya jika dibuat lewat Inspector; di runtime build tidak persist.
    /// Jangan membuka 15+ parameter kepada user biasa (§44).
    /// </summary>
    public sealed class VehicleTuningPanel : MonoBehaviour
    {
        [Header("Target")]
        [SerializeField] private VehicleConfig config = null!;

        [Header("Tampilan")]
        [SerializeField] private KeyCode toggleKey = KeyCode.Tab;
        [Tooltip("Skala slider GUI (makin besar = panel makin lebar).")]
        [SerializeField] private float sliderWidth = 260f;
        [SerializeField] private bool startHidden = true;

        public bool Visible { get; set; }

        private void Awake()
        {
            Visible = !startHidden;
        }

        private void Update()
        {
            if (UnityEngine.Input.GetKeyDown(toggleKey))
                Visible = !Visible;
        }

        private void OnGUI()
        {
            if (!Visible || config == null) return;

            // Header panel.
            var y = 120f;
            GUI.Box(new Rect(12f, y, sliderWidth + 24f, PanelHeight()), GUIContent.none);
            GUI.Label(new Rect(24f, y + 6f, sliderWidth, 20f), "Handling Settings [Tab]");
            y += 30f;

            // ── Release: hanya 4 parameter inti (§44) ──────────────────────
            config.MaxSteerAngle = Slider("Steering", config.MaxSteerAngle, 5f, 60f, ref y);
            config.BrakeForce = Slider("Brake", config.BrakeForce, 1f, 20f, ref y);
            config.Acceleration = Slider("Acceleration", config.Acceleration, 1f, 15f, ref y);
            config.TireGrip = Slider("Grip", config.TireGrip, 2f, 20f, ref y);

            // ── Debug build: parameter lanjutan (§44) ───────────────────────
            if (Debug.isDebugBuild)
            {
                GUI.Label(new Rect(24f, y + 4f, sliderWidth, 18f), "— Debug —");
                y += 24f;

                config.SteerRate = Slider("Steering Speed", config.SteerRate, 1f, 12f, ref y);
                config.ReturnRate = Slider("Return Speed", config.ReturnRate, 1f, 12f, ref y);
                config.FrontGrip = Slider("Front Grip", config.FrontGrip, 0.5f, 1.5f, ref y);
                config.RearGrip = Slider("Rear Grip", config.RearGrip, 0.5f, 1.5f, ref y);
                config.HandbrakeForce = Slider("Handbrake", config.HandbrakeForce, 0f, 10f, ref y);
                config.Friction = Slider("Friction", config.Friction, 0f, 6f, ref y);
                config.CenterOfMassY = Slider("Center of Mass Y", config.CenterOfMassY, -1f, 0.5f, ref y);
                config.AntiRollForce = Slider("Anti-Roll", config.AntiRollForce, 0f, 12000f, ref y);
            }
        }

        private float Slider(string label, float value, float min, float max, ref float y)
        {
            GUI.Label(new Rect(24f, y + 2f, 130f, 20f), label);
            value = GUI.HorizontalSlider(new Rect(160f, y + 6f, sliderWidth - 148f, 16f), value, min, max);
            GUI.Label(new Rect(sliderWidth - 14f, y + 2f, 46f, 20f), value.ToString("0.0"));
            y += 24f;
            return value;
        }

        private float PanelHeight()
        {
            var rows = Debug.isDebugBuild ? 4f + 9f : 4f;
            return rows * 24f + 36f;
        }
    }
}
