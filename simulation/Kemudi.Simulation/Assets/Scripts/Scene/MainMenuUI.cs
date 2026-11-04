using Kemudi.Simulation.Vehicles;
using Kemudi.Simulation.XR;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace Kemudi.Simulation.Scene
{
    /// <summary>
    /// Layar pilih kendaraan (fase Selecting) — PHASE 4-5 (VR support).
    ///
    /// Desktop: IMGUI sederhana tanpa aset Canvas (tetap seperti sebelumnya).
    /// VR: World-space Canvas dengan TextMeshPro, posisi di depan kursi pengemudi.
    ///
    /// Pilih Motor/Mobil/Truk + transmisi Manual/Automatic, lalu Mulai.
    /// Di VR, menu muncul sebagai panel floating di depan pengemudi.
    /// </summary>
    public sealed class MainMenuUI : MonoBehaviour
    {
        private KemudiSceneBootstrap _bootstrap = null!;
        private VehicleConfig.VehicleType _selected = VehicleConfig.VehicleType.Mobil;
        private bool _manualTransmission;

        // ── VR World-space Canvas ─────────────────────────────────────────
        private Canvas? _vrCanvas;
        private bool _isVrMode;
        private bool _vrInitialized;

        // VR UI elements.
        private TextMeshProUGUI? _vrTitle;
        private TextMeshProUGUI? _vrDescription;
        private TextMeshProUGUI? _vrStartHint;
        private Button? _vrMotorBtn;
        private Button? _vrMobilBtn;
        private Button? _vrTrukBtn;
        private Button? _vrManualBtn;
        private Button? _vrAutomaticBtn;
        private Button? _vrStartBtn;
        private TextMeshProUGUI? _vrMotorLabel;
        private TextMeshProUGUI? _vrMobilLabel;
        private TextMeshProUGUI? _vrTrukLabel;
        private TextMeshProUGUI? _vrManualLabel;
        private TextMeshProUGUI? _vrAutomaticLabel;

        public void Bind(KemudiSceneBootstrap bootstrap) => _bootstrap = bootstrap;

        private void Start()
        {
            // Deteksi VR mode dari XRManager.
            var xrManager = FindFirstObjectByType<XRManager>();
            _isVrMode = xrManager != null && xrManager.IsVrActive;

            if (_isVrMode)
            {
                CreateVrMenu();
            }
        }

        // ── Desktop Mode (IMGUI) ──────────────────────────────────────────

        private void OnGUI()
        {
            if (_bootstrap == null || _bootstrap.RunStarted) return;

            // Di VR, gunakan world-space canvas (bukan IMGUI).
            if (_isVrMode)
            {
                UpdateVrMenu();
                return;
            }

            // Desktop IMGUI — tetap seperti sebelumnya.
            DrawDesktopMenu();
        }

        private void DrawDesktopMenu()
        {
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

        // ── VR Mode (World-space Canvas) ──────────────────────────────────

        /// <summary>
        /// Buat world-space canvas untuk VR menu.
        /// Panel muncul 1.5m di depan kursi pengemudi, menghadap pengemudi.
        /// </summary>
        private void CreateVrMenu()
        {
            if (_vrInitialized) return;
            _vrInitialized = true;

            // Canvas root.
            var canvasGo = new GameObject("VR Main Menu");
            canvasGo.transform.SetParent(transform, false);
            canvasGo.transform.localPosition = new Vector3(0f, 1.4f, -1.5f); // di depan kursi
            canvasGo.transform.localRotation = Quaternion.Euler(0f, 0f, 0f); // menghadap kursi

            _vrCanvas = canvasGo.AddComponent<Canvas>();
            _vrCanvas.renderMode = RenderMode.WorldSpace;
            _vrCanvas.sortingOrder = 200;

            var rt = canvasGo.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(600f, 400f);
            rt.localScale = Vector3.one * 0.002f; // skala world-space

            // CanvasScaler.
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.dynamicPixelsPerUnit = 10;

            // Background panel (semi-transparan).
            var bg = CreateVrChild(canvasGo.transform, "Background", new Vector2(0f, 0f), new Vector2(600f, 400f));
            var bgImg = bg.AddComponent<Image>();
            bgImg.color = new Color(0.1f, 0.1f, 0.15f, 0.92f);

            // Title.
            _vrTitle = CreateVrText(canvasGo.transform, "Title", "KEMUDI.ID — Simulasi VR",
                new Vector2(0f, 160f), new Vector2(560f, 40f), 28f, TextAlignmentOptions.Center);
            _vrTitle.fontStyle = FontStyles.Bold;
            _vrTitle.color = Color.white;

            // Subtitle.
            _vrDescription = CreateVrText(canvasGo.transform, "Subtitle", "Pilih Kendaraan & Transmisi",
                new Vector2(0f, 130f), new Vector2(560f, 25f), 16f, TextAlignmentOptions.Center);
            _vrDescription.color = new Color(0.7f, 0.7f, 0.7f);

            // ── Vehicle Buttons ───────────────────────────────────────────
            var btnY = 70f;
            var btnWidth = 170f;
            var btnHeight = 50f;
            var spacing = 10f;
            var startX = -(btnWidth * 1.5f + spacing);

            _vrMotorBtn = CreateVrButton(canvasGo.transform, "MotorBtn", "🏍 Motor",
                new Vector2(startX, btnY), new Vector2(btnWidth, btnHeight), OnMotorClicked);
            _vrMotorLabel = _vrMotorBtn.GetComponentInChildren<TextMeshProUGUI>();

            _vrMobilBtn = CreateVrButton(canvasGo.transform, "MobilBtn", "🚗 Mobil",
                new Vector2(startX + btnWidth + spacing, btnY), new Vector2(btnWidth, btnHeight), OnMobilClicked);
            _vrMobilLabel = _vrMobilBtn.GetComponentInChildren<TextMeshProUGUI>();

            _vrTrukBtn = CreateVrButton(canvasGo.transform, "TrukBtn", "🚚 Truk",
                new Vector2(startX + (btnWidth + spacing) * 2, btnY), new Vector2(btnWidth, btnHeight), OnTrukClicked);
            _vrTrukLabel = _vrTrukBtn.GetComponentInChildren<TextMeshProUGUI>();

            // ── Transmission Buttons ──────────────────────────────────────
            var transY = -10f;
            var transWidth = 260f;

            _vrManualBtn = CreateVrButton(canvasGo.transform, "ManualBtn", "● Manual",
                new Vector2(-transWidth * 0.5f - 5f, transY), new Vector2(transWidth, btnHeight), OnManualClicked);
            _vrManualLabel = _vrManualBtn.GetComponentInChildren<TextMeshProUGUI>();

            _vrAutomaticBtn = CreateVrButton(canvasGo.transform, "AutomaticBtn", "○ Automatic",
                new Vector2(transWidth * 0.5f + 5f, transY), new Vector2(transWidth, btnHeight), OnAutomaticClicked);
            _vrAutomaticLabel = _vrAutomaticBtn.GetComponentInChildren<TextMeshProUGUI>();

            // ── Start Button ──────────────────────────────────────────────
            _vrStartBtn = CreateVrButton(canvasGo.transform, "StartBtn", "▶ Mulai Simulasi",
                new Vector2(0f, -80f), new Vector2(300f, 60f), OnStartClicked);

            var startLabel = _vrStartBtn.GetComponentInChildren<TextMeshProUGUI>();
            if (startLabel != null)
            {
                startLabel.fontSize = 22f;
                startLabel.fontStyle = FontStyles.Bold;
            }

            // ── Hint Text ─────────────────────────────────────────────────
            _vrStartHint = CreateVrText(canvasGo.transform, "Hint",
                "A = Select | Trigger = Gas | Grip = Brake | Menu = Pause",
                new Vector2(0f, -130f), new Vector2(560f, 25f), 12f, TextAlignmentOptions.Center);
            _vrStartHint.color = new Color(0.5f, 0.5f, 0.5f);

            // Initial state.
            UpdateVrButtonHighlights();

            Debug.Log("[Kemudi.VR] VR Main Menu dibuat (world-space canvas).");
        }

        private void UpdateVrMenu()
        {
            // Update button highlights sesuai selection state.
            UpdateVrButtonHighlights();

            // Update description.
            if (_vrDescription != null)
            {
                _vrDescription.text = _manualTransmission
                    ? "Manual: kopling wajib saat oper gigi. 3x salah = mesin mati."
                    : "Automatic: gigi berpindah otomatis dari RPM & kecepatan.";
            }
        }

        private void UpdateVrButtonHighlights()
        {
            // Vehicle selection.
            HighlightButton(_vrMotorBtn, _vrMotorLabel, _selected == VehicleConfig.VehicleType.Motor);
            HighlightButton(_vrMobilBtn, _vrMobilLabel, _selected == VehicleConfig.VehicleType.Mobil);
            HighlightButton(_vrTrukBtn, _vrTrukLabel, _selected == VehicleConfig.VehicleType.Truk);

            // Transmission selection.
            HighlightButton(_vrManualBtn, _vrManualLabel, _manualTransmission);
            HighlightButton(_vrAutomaticBtn, _vrAutomaticLabel, !_manualTransmission);
        }

        private static void HighlightButton(Button? btn, TextMeshProUGUI? label, bool selected)
        {
            if (btn == null) return;

            var img = btn.GetComponent<Image>();
            if (img != null)
            {
                img.color = selected
                    ? new Color(0.2f, 0.5f, 0.9f, 0.9f) // biru aktif
                    : new Color(0.25f, 0.25f, 0.3f, 0.8f); // abu-abu gelap
            }

            if (label != null)
            {
                label.color = selected ? Color.white : new Color(0.7f, 0.7f, 0.7f);
                label.fontStyle = selected ? FontStyles.Bold : FontStyles.Normal;
            }
        }

        // ── VR Button Callbacks ───────────────────────────────────────────

        private void OnMotorClicked()
        {
            _selected = VehicleConfig.VehicleType.Motor;
            Debug.Log("[Kemudi.VR] Kendaraan dipilih: Motor");
        }

        private void OnMobilClicked()
        {
            _selected = VehicleConfig.VehicleType.Mobil;
            Debug.Log("[Kemudi.VR] Kendaraan dipilih: Mobil");
        }

        private void OnTrukClicked()
        {
            _selected = VehicleConfig.VehicleType.Truk;
            Debug.Log("[Kemudi.VR] Kendaraan dipilih: Truk");
        }

        private void OnManualClicked()
        {
            _manualTransmission = true;
            Debug.Log("[Kemudi.VR] Transmisi dipilih: Manual");
        }

        private void OnAutomaticClicked()
        {
            _manualTransmission = false;
            Debug.Log("[Kemudi.VR] Transmisi dipilih: Automatic");
        }

        private void OnStartClicked()
        {
            Debug.Log($"[Kemudi.VR] Mulai simulasi: {_selected} ({(_manualTransmission ? "Manual" : "Automatic")})");
            _bootstrap.PrepareRun(_selected, _manualTransmission);

            // Sembunyikan menu VR setelah mulai.
            if (_vrCanvas != null)
                _vrCanvas.gameObject.SetActive(false);
        }

        // ── VR UI Helpers ─────────────────────────────────────────────────

        private static GameObject CreateVrChild(Transform parent, string name, Vector2 pos, Vector2 size)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);

            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;

            return go;
        }

        private static TextMeshProUGUI CreateVrText(Transform parent, string name, string text,
            Vector2 pos, Vector2 size, float fontSize, TextAlignmentOptions alignment)
        {
            var go = CreateVrChild(parent, name, pos, size);
            var tmp = go.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.fontSize = fontSize;
            tmp.alignment = alignment;
            tmp.enableWordWrapping = false;
            return tmp;
        }

        private Button CreateVrButton(Transform parent, string name, string label,
            Vector2 pos, Vector2 size, UnityEngine.Events.UnityAction onClick)
        {
            var go = CreateVrChild(parent, name, pos, size);

            // Background image.
            var img = go.AddComponent<Image>();
            img.color = new Color(0.25f, 0.25f, 0.3f, 0.8f);

            // Button component.
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            btn.onClick.AddListener(onClick);

            // Button colors (normal, highlighted, pressed, disabled).
            var colors = btn.colors;
            colors.normalColor = new Color(0.25f, 0.25f, 0.3f);
            colors.highlightedColor = new Color(0.35f, 0.35f, 0.4f);
            colors.pressedColor = new Color(0.2f, 0.4f, 0.7f);
            colors.disabledColor = new Color(0.15f, 0.15f, 0.18f);
            btn.colors = colors;

            // Label text.
            var textGo = new GameObject("Label");
            textGo.transform.SetParent(go.transform, false);

            var textRt = textGo.AddComponent<RectTransform>();
            textRt.anchorMin = Vector2.zero;
            textRt.anchorMax = Vector2.one;
            textRt.offsetMin = Vector2.zero;
            textRt.offsetMax = Vector2.zero;

            var tmp = textGo.AddComponent<TextMeshProUGUI>();
            tmp.text = label;
            tmp.fontSize = 16f;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.color = Color.white;

            return btn;
        }

        /// <summary>
        /// Cleanup — hapus VR canvas saat phase berubah (dari SceneHud).
        /// </summary>
        public void HideVrMenu()
        {
            if (_vrCanvas != null)
                _vrCanvas.gameObject.SetActive(false);
        }

        /// <summary>
        /// Tampilkan kembali VR menu (untuk restart).
        /// </summary>
        public void ShowVrMenu()
        {
            if (_vrCanvas != null)
                _vrCanvas.gameObject.SetActive(true);
        }
    }
}
