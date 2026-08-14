using Kemudi.Simulation.Vehicles;
using UnityEngine;

namespace Kemudi.Simulation.Scene
{
    /// <summary>
    /// Layar pilih kendaraan (fase Selecting) — IMGUI sederhana tanpa aset.
    /// Pilih Motor/Mobil/Truk + transmisi Manual/Automatic, lalu Mulai.
    /// </summary>
    public sealed class MainMenuUI : MonoBehaviour
    {
        private KemudiSceneBootstrap _bootstrap = null!;
        private VehicleConfig.VehicleType _selected = VehicleConfig.VehicleType.Mobil;
        private bool _manualTransmission;

        public void Bind(KemudiSceneBootstrap bootstrap) => _bootstrap = bootstrap;

        private void OnGUI()
        {
            if (_bootstrap == null || _bootstrap.RunStarted) return;

            const float width = 420f;
            var y = Screen.height * 0.5f - 190f;
            var x = Screen.width * 0.5f - width * 0.5f;

            GUI.Box(new Rect(x, y, width, 330f), GUIContent.none);
            GUI.Label(new Rect(x + 20f, y + 14f, width - 40f, 28f), "KEMUDI.ID — Simulasi (Scene #1)");

            // Kendaraan
            GUI.Label(new Rect(x + 20f, y + 54f, width - 40f, 20f), "Pilih Kendaraan:");
            var types = new[] { VehicleConfig.VehicleType.Motor, VehicleConfig.VehicleType.Mobil, VehicleConfig.VehicleType.Truk };
            var labels = new[] { "🏍 Motor", "🚗 Mobil", "🚚 Truk" };
            for (var i = 0; i < types.Length; i++)
            {
                var rect = new Rect(x + 20f + i * ((width - 40f) / 3f + 4f), y + 78f, (width - 40f) / 3f - 4f, 32f);
                if (GUI.Button(rect, labels[i], _selected == types[i] ? ActiveStyle() : GUI.skin.button))
                    _selected = types[i];
            }

            // Transmisi
            GUI.Label(new Rect(x + 20f, y + 124f, width - 40f, 20f), "Transmisi:");
            if (GUI.Button(new Rect(x + 20f, y + 148f, (width - 40f) * 0.5f - 2f, 32f),
                    _manualTransmission ? "● Manual" : "○ Manual"))
                _manualTransmission = true;
            if (GUI.Button(new Rect(x + 20f + (width - 40f) * 0.5f + 2f, y + 148f, (width - 40f) * 0.5f - 2f, 32f),
                    _manualTransmission ? "○ Automatic" : "● Automatic"))
                _manualTransmission = false;

            GUI.Label(new Rect(x + 20f, y + 192f, width - 40f, 40f),
                _manualTransmission
                    ? "Manual: kopling (Shift) wajib saat oper gigi. 3x salah = mesin mati (§68)."
                    : "Automatic: gigi berpindah otomatis dari RPM & kecepatan (§69).");

            // Mulai
            if (GUI.Button(new Rect(x + 20f, y + 244f, width - 40f, 40f), "▶ Mulai Simulasi"))
                _bootstrap.PrepareRun(_selected, _manualTransmission);

            GUI.Label(new Rect(x + 20f, y + 296f, width - 40f, 24f),
                "Alur: Selecting → PreDrive → Driving → Finish (§10). Kontrol: lihat HUD.");
        }

        private GUIStyle? _activeStyle;

        private GUIStyle ActiveStyle()
        {
            if (_activeStyle == null)
            {
                _activeStyle = new GUIStyle(GUI.skin.button)
                {
                    fontStyle = FontStyle.Bold
                };
                _activeStyle.normal.textColor = Color.yellow;
            }
            return _activeStyle;
        }
    }
}
