using Kemudi.Simulation.Vehicles;
using Kemudi.Simulation.XR;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.EventSystems;
using UnityEngine.XR;
using UnityEngine.XR.Interaction.Toolkit.UI;

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
        private bool _axisHeld, _triggerHeld, _primaryHeld;

        private void Update()
        {
            if (_bootstrap == null) return;
            var vr = _bootstrap.XrManager != null && _bootstrap.XrManager.IsVrActive;
            if (vr && !_vrInitialized) CreateVrMenu();
            _isVrMode = vr;
            if (_vrCanvas != null) _vrCanvas.gameObject.SetActive(vr && !_bootstrap.RunStarted);
            if (!vr || _bootstrap.RunStarted) return;
            var left = InputDevices.GetDeviceAtXRNode(XRNode.LeftHand);
            var right = InputDevices.GetDeviceAtXRNode(XRNode.RightHand);
            left.TryGetFeatureValue(CommonUsages.primary2DAxis, out var axis);
            right.TryGetFeatureValue(CommonUsages.triggerButton, out var trigger);
            right.TryGetFeatureValue(CommonUsages.primaryButton, out var primary);
            var axisHeld = Mathf.Abs(axis.x) > .65f;
            if (axisHeld && !_axisHeld)
            {
                var types = new[] { VehicleConfig.VehicleType.Motor, VehicleConfig.VehicleType.Mobil, VehicleConfig.VehicleType.Truk };
                var index = System.Array.IndexOf(types, _selected);
                _selected = types[(index + (axis.x > 0 ? 1 : 2)) % 3];
            }
            if (primary && !_primaryHeld) _manualTransmission = !_manualTransmission;
            if (trigger && !_triggerHeld) OnStartClicked();
            _axisHeld = axisHeld; _primaryHeld = primary; _triggerHeld = trigger;
            UpdateVrMenu();
        }

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
                return;
            }

            // Desktop IMGUI — tetap seperti sebelumnya.
            DrawDesktopMenu();
        }

        private GUIStyle _heading, _copy, _muted, _button;
        private void DrawDesktopMenu()
        {
            if (_heading == null)
            {
                _heading = new GUIStyle(GUI.skin.label) { fontSize = 30, fontStyle = FontStyle.Bold };
                _heading.normal.textColor = new Color(.9f, .96f, .97f);
                _copy = new GUIStyle(GUI.skin.label) { fontSize = 15, wordWrap = true };
                _copy.normal.textColor = new Color(.9f, .96f, .97f);
                _muted = new GUIStyle(_copy) { fontSize = 13 };
                _muted.normal.textColor = new Color(.68f, .77f, .80f);
                _button = new GUIStyle(GUI.skin.button) { fontSize = 15, fontStyle = FontStyle.Bold, wordWrap = true };
            }
            const float width = 680f, height = 548f;
            var scale = Mathf.Min(1f, Mathf.Min((Screen.width - 32f) / width, (Screen.height - 32f) / height));
            var previous = GUI.matrix;
            GUI.matrix = Matrix4x4.TRS(new Vector3((Screen.width - width * scale) / 2f, (Screen.height - height * scale) / 2f, 0f), Quaternion.identity, Vector3.one * scale);
            Fill(new Rect(0, 0, width, height), new Color(.055f, .10f, .13f, .98f));
            Fill(new Rect(0, 0, width, 4), new Color(.20f, .65f, .55f));
            GUI.Label(new Rect(28, 22, 620, 24), "KEMUDI  /  DRIVING LAB", _muted);
            GUI.Label(new Rect(28, 53, 620, 45), "Siap untuk perjalanan berikutnya?", _heading);
            GUI.Label(new Rect(28, 103, 620, 25), "01 Pilih kendaraan    /    02 Persiapan    /    03 Berkendara", _muted);
            GUI.Label(new Rect(28, 145, 620, 24), "PILIH KENDARAAN", _copy);
            var types = new[] { VehicleConfig.VehicleType.Motor, VehicleConfig.VehicleType.Mobil, VehicleConfig.VehicleType.Truk };
            var labels = new[] { "Motor  |  SIM C\nUrban 125", "Mobil  |  SIM A\nCity Hatchback", "Truk  |  SIM B1\nCargo 6x2" };
            for (var i = 0; i < types.Length; i++)
            {
                GUI.backgroundColor = _selected == types[i] ? new Color(.24f, .68f, .57f) : new Color(.35f, .45f, .50f);
                if (GUI.Button(new Rect(28 + i * 210, 178, 202, 78), labels[i] + (_selected == types[i] ? "\nTerpilih" : ""), _button)) _selected = types[i];
            }
            GUI.backgroundColor = Color.white;
            GUI.Label(new Rect(28, 272, 620, 25), "TRANSMISI", _copy);
            GUI.backgroundColor = !_manualTransmission ? new Color(.24f, .68f, .57f) : new Color(.35f, .45f, .50f);
            if (GUI.Button(new Rect(28, 305, 307, 52), "Otomatis  /  Gas & rem", _button)) _manualTransmission = false;
            GUI.backgroundColor = _manualTransmission ? new Color(.24f, .68f, .57f) : new Color(.35f, .45f, .50f);
            if (GUI.Button(new Rect(345, 305, 307, 52), "Manual  /  Kopling & gigi", _button)) _manualTransmission = true;
            GUI.backgroundColor = Color.white;
            GUI.Label(new Rect(28, 368, 620, 40), _manualTransmission ? "Tahan Shift untuk kopling. Q / E untuk turun / naik gigi." : "Gigi berpindah otomatis. Fokus pada kemudi dan jarak pengereman.", _muted);
            GUI.backgroundColor = new Color(.24f, .76f, .62f);
            if (GUI.Button(new Rect(28, 420, 624, 57), "Mulai latihan " + _selected.ToString().ToLowerInvariant() + "  >", _button)) _bootstrap.PrepareRun(_selected, _manualTransmission);
            GUI.backgroundColor = Color.white;
            GUI.Label(new Rect(28, 493, 620, 42), "Berjalan ke kendaraan, tekan E untuk masuk, lalu ikuti checklist.\nWASD bergerak   /   I kontak   /   C kamera   /   P jeda", _muted);
            GUI.matrix = previous;
        }

        private static void Fill(Rect rect, Color color)
        {
            var previous = GUI.color; GUI.color = color;
            GUI.DrawTexture(rect, Texture2D.whiteTexture); GUI.color = previous;
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
            canvasGo.AddComponent<TrackedDeviceGraphicRaycaster>();
            if (EventSystem.current == null)
            {
                var events = new GameObject("Kemudi UI Events");
                events.transform.SetParent(transform, false);
                events.AddComponent<EventSystem>();
                events.AddComponent<XRUIInputModule>();
            }
            var camera = UnityEngine.Camera.main;
            if (camera != null)
            {
                var direction = Vector3.ProjectOnPlane(camera.transform.forward, Vector3.up).normalized;
                if (direction.sqrMagnitude < .01f) direction = Vector3.forward;
                canvasGo.transform.position = camera.transform.position + direction * 1.8f;
                canvasGo.transform.rotation = Quaternion.LookRotation(direction, Vector3.up);
                _vrCanvas.worldCamera = camera;
            }

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
            var startX = -(btnWidth + spacing);

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
            _vrStartHint.text = "Stik kiri: kendaraan   |   A: transmisi   |   Trigger kanan: mulai";
            _vrStartHint.fontSize = 15f;
            _vrStartHint.color = new Color(.75f, .84f, .87f);
            _vrMotorLabel.text = "Motor / SIM C";
            _vrMobilLabel.text = "Mobil / SIM A";
            _vrTrukLabel.text = "Truk / SIM B1";
            _vrManualLabel.text = "Manual";
            _vrAutomaticLabel.text = "Otomatis";

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
                label.color = selected ? Color.white : new Color(.82f, .88f, .91f);
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
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(.82f, 1f, .94f);
            colors.pressedColor = new Color(.6f, .8f, .75f);
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
            tmp.fontSize = 20f;
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
