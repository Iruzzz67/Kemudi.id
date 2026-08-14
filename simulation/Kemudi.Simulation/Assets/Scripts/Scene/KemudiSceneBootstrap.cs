using Kemudi.Simulation.Camera;
using Kemudi.Simulation.Core;
using Kemudi.Simulation.Environment;
using Kemudi.Simulation.Input;
using Kemudi.Simulation.Rules;
using Kemudi.Simulation.Traffic;
using Kemudi.Simulation.Transmission;
using Kemudi.Simulation.Vehicles;
using UnityEngine;

namespace Kemudi.Simulation.Scene
{
    /// <summary>
    /// Bootstrap scene #1 — PHASE 4-5.
    ///
    /// Membangun seluruh hierarki simulasi SAAT RUNTIME dari kode, sehingga
    /// scene pertama cukup berisi 1 GameObject dengan komponen ini (atau
    /// dibuat otomatis lewat menu: Kemudi → Create Main Scene).
    ///
    /// Yang dibangun:
    ///   - Kamera utama + directional light + ground sederhana
    ///   - SimulationManager + ViolationSystem + ScoringSystem + ChecklistManager
    ///   - UniversalInputSystem + KeyboardInputProvider
    ///   - TrackBuilder (1 mesh jalan + collider + zona off-road & finish)
    ///   - Kendaraan (VehicleController + VehiclePhysics + Engine + Transmisi)
    ///
    /// Alur: Selecting → PreDrive → Driving → Finished/Failed (§10, §35).
    /// Gunakan Editor/KemudiSceneGenerator untuk membuat Assets/Scenes/Main.unity.
    /// </summary>
    public sealed class KemudiSceneBootstrap : MonoBehaviour
    {
        [Header("Material (opsional — dibuat otomatis bila kosong)")]
        [SerializeField] private Material? roadMaterial;
        [SerializeField] private Material? groundMaterial;

        // ── Referensi hasil build (dibaca MainMenuUI & SceneHud) ───────────
        public SimulationManager Simulation { get; private set; } = null!;
        public UniversalInputSystem Input { get; private set; } = null!;
        public ViolationSystem Violations { get; private set; } = null!;
        public ScoringSystem Scoring { get; private set; } = null!;
        public ChecklistManager Checklist { get; private set; } = null!;
        public TrackBuilder Track { get; private set; } = null!;
        public CameraManager CameraRig { get; private set; } = null!;
        public VehicleController Vehicle { get; private set; } = null!;
        public VehicleConfig SelectedConfig { get; private set; } = null!;

        private Transform[] _waypoints = System.Array.Empty<Transform>();

        /// <summary>Percobaan sedang berjalan (menu pilih kendaraan disembunyikan).</summary>
        public bool RunStarted { get; private set; }

        private void Awake()
        {
            EnsureCamera();
            EnsureLighting();
            BuildGround();
            BuildManagers();
            BuildTrack();
            BuildObstacles();
            BuildTrafficSystem();
            BuildCameraRig();

            // UI sederhana (IMGUI, tanpa aset Canvas).
            var menu = gameObject.AddComponent<MainMenuUI>();
            menu.Bind(this);
            var hud = gameObject.AddComponent<SceneHud>();
            hud.Bind(this);
        }

        /// <summary>Mulai percobaan baru dari layar pilih kendaraan.</summary>
        public void PrepareRun(VehicleConfig.VehicleType type, bool manualTransmission)
        {
            Simulation.CurrentVehicleType = type;
            Simulation.IsManualTransmission = manualTransmission;

            if (Vehicle != null) Destroy(Vehicle.gameObject);

            Vehicle = BuildVehicle(type, manualTransmission);
            CameraRig.Configure(UnityEngine.Camera.main, Vehicle.transform);
            Simulation.StartSimulation();
            RunStarted = true;
        }

        /// <summary>Hancurkan kendaraan & kembali ke layar pilih (restart).</summary>
        public void Restart()
        {
            if (Vehicle != null) Destroy(Vehicle.gameObject);
            Vehicle = null!;
            SelectedConfig = null!;
            Simulation.ReturnToSelecting();
            RunStarted = false;
        }

        // ── Lingkungan ──────────────────────────────────────────────────────

        private void EnsureCamera()
        {
            if (UnityEngine.Camera.main != null) return;

            var go = new GameObject("Main Camera") { tag = "MainCamera" };
            go.transform.position = new Vector3(0f, 6f, -12f);
            var cam = go.AddComponent<UnityEngine.Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.55f, 0.72f, 0.88f);
            cam.fieldOfView = 60f;
            go.AddComponent<AudioListener>();
        }

        private void EnsureLighting()
        {
            if (FindFirstObjectByType<Light>() != null) return;

            var lightGo = new GameObject("Directional Light");
            lightGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            var light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.1f;
            light.shadows = LightShadows.Soft; // §27: satu directional utama

            RenderSettings.ambientLight = new Color(0.42f, 0.45f, 0.5f);
            RenderSettings.fog = false;
        }

        private void BuildGround()
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Plane);
            go.name = "Ground";
            go.transform.localScale = new Vector3(60f, 1f, 200f); // bidang luas di sepanjang jalan
            AssignMaterial(go.GetComponent<MeshRenderer>(), groundMaterial != null
                ? groundMaterial
                : CreateMaterial(new Color(0.16f, 0.2f, 0.13f), "Grass"));
        }

        // ── Manager & input ─────────────────────────────────────────────────

        private void BuildManagers()
        {
            var gm = new GameObject("Simulation");
            Simulation = gm.AddComponent<SimulationManager>();
            Violations = gm.AddComponent<ViolationSystem>();
            Scoring = gm.AddComponent<ScoringSystem>();
            Checklist = gm.AddComponent<ChecklistManager>();
            Simulation.Configure(Violations, Scoring, Checklist);

            var inputGo = new GameObject("Input");
            Input = inputGo.AddComponent<UniversalInputSystem>();
            Input.Register(inputGo.AddComponent<KeyboardInputProvider>());
            // Gamepad & XR bisa didaftarkan di sini — lihat docs/VR_INPUT_MAP.md.
        }

        private void BuildTrack()
        {
            var trackGo = new GameObject("Track");
            Track = trackGo.AddComponent<TrackBuilder>();

            var route = BuildRoute();
            var waypoints = new Transform[route.Length];
            for (var i = 0; i < route.Length; i++)
            {
                var wp = new GameObject("wp" + i);
                wp.transform.position = route[i];
                waypoints[i] = wp.transform;
            }

            Track.SetWaypoints(waypoints);
            Track.SetRoadMaterial(roadMaterial != null
                ? roadMaterial
                : CreateMaterial(new Color(0.13f, 0.13f, 0.16f), "Road"));
            Track.Configure(Violations, Simulation);
            Track.Build();

            _waypoints = waypoints;
        }

        /// <summary>
        /// Rintangan lintasan (cone slalom, water barrier, kendaraan parkir) —
        /// layout celah lebar agar konsisten dengan versi web yang sudah
        /// diperlonggar (lihat TrackObstacleBuilder).
        /// </summary>
        private void BuildObstacles()
        {
            var go = new GameObject("TrackObstacles");
            var builder = go.AddComponent<TrackObstacleBuilder>();
            var centerline = new Vector3[_waypoints.Length];
            for (var i = 0; i < _waypoints.Length; i++) centerline[i] = _waypoints[i].position;
            builder.SetCenterline(centerline);
            builder.Build();
        }

        /// <summary>Rute lurus dengan beberapa tikungan lembut (y = 0.5 di atas ground).</summary>
        private static Vector3[] BuildRoute()
        {
            return new[]
            {
                new Vector3(0f, 0.5f, 0f),
                new Vector3(40f, 0.5f, 0f),
                new Vector3(70f, 0.5f, 25f),
                new Vector3(110f, 0.5f, 25f),
                new Vector3(140f, 0.5f, 0f),
                new Vector3(200f, 0.5f, 0f)   // finish
            };
        }

        private void BuildCameraRig()
        {
            var go = new GameObject("CameraRig");
            CameraRig = go.AddComponent<CameraManager>();
            CameraRig.Configure(UnityEngine.Camera.main, null); // target di-set saat kendaraan dibuat
        }

        // ── Kendaraan ───────────────────────────────────────────────────────

        private VehicleController BuildVehicle(VehicleConfig.VehicleType type, bool manual)
        {
            SelectedConfig = ScriptableObject.CreateInstance<VehicleConfig>();
            ApplyTypeDefaults(SelectedConfig, type);

            var go = new GameObject("Vehicle_" + type);
            go.transform.position = SpawnPosition();
            go.transform.rotation = SpawnRotation();

            var rb = go.AddComponent<Rigidbody>();
            rb.mass = SelectedConfig.Mass;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.linearDamping = 0f;

            var box = go.AddComponent<BoxCollider>();
            box.center = new Vector3(0f, SelectedConfig.Height * 0.5f, 0f);
            box.size = new Vector3(SelectedConfig.Width, SelectedConfig.Height, SelectedConfig.Length);

            var controller = go.AddComponent<VehicleController>();

            var engine = go.AddComponent<EngineController>();
            engine.Configure(SelectedConfig);

            TransmissionController transmission;
            if (manual)
            {
                var manualCtrl = go.AddComponent<ManualTransmissionController>();
                manualCtrl.Bind(Input);
                transmission = manualCtrl;
            }
            else
            {
                transmission = go.AddComponent<AutomaticTransmissionController>();
            }

            go.AddComponent<VehiclePhysics>();
            controller.Configure(Input, SelectedConfig, engine, transmission, Checklist);

            // Tabrak pejalan kaki = langsung gagal (aturan inti).
            var pedestrianWatcher = go.AddComponent<PedestrianCollisionWatcher>();
            pedestrianWatcher.Configure(Simulation);

            // Tabrak rintangan (cone/barrier/kendaraan parkir) = obstacleHits.
            var obstacleWatcher = go.AddComponent<ObstacleCollisionWatcher>();
            obstacleWatcher.Configure(Violations);

            BuildVehicleVisual(go, SelectedConfig, type);
            return controller;
        }

        private void ApplyTypeDefaults(VehicleConfig config, VehicleConfig.VehicleType type)
        {
            config.Type = type;
            switch (type)
            {
                case VehicleConfig.VehicleType.Motor:
                    config.Label = "Motor";
                    config.Length = 2.0f; config.Width = 0.75f; config.Height = 1.15f;
                    config.WheelBase = 1.3f; config.TrackWidth = 0.6f;
                    config.Mass = 180f;
                    config.MaxSpeed = 19.44f; config.ReverseMaxSpeed = 3f;  // 70 km/j maksimum
                    config.Acceleration = 5.5f; config.BrakeForce = 7f;
                    config.MaxSteerAngle = 25f; config.SteerRate = 6f; config.ReturnRate = 8f;
                    config.TireGrip = 8f; config.CenterOfMassY = -0.05f;
                    config.EngineIdleRpm = 1100f; config.EngineRedlineRpm = 9000f;
                    config.GearRatios = new[] { 3.0f, 2.0f, 1.5f };
                    break;
                case VehicleConfig.VehicleType.Truk:
                    config.Label = "Truk";
                    config.Length = 6.0f; config.Width = 2.5f; config.Height = 3.0f;
                    config.WheelBase = 4.0f; config.TrackWidth = 2.1f;
                    config.Mass = 5500f;
                    config.MaxSpeed = 19.44f; config.ReverseMaxSpeed = 4f;  // 70 km/j maksimum
                    config.Acceleration = 3f; config.BrakeForce = 12f; config.HandbrakeForce = 6f;
                    config.MaxSteerAngle = 24f; config.SteerRate = 2.5f; config.ReturnRate = 4f;
                    config.TireGrip = 7f; config.CenterOfMassY = -0.35f;
                    config.EngineIdleRpm = 700f; config.EngineRedlineRpm = 2600f;
                    config.GearRatios = new[] { 4.5f, 3.0f, 2.2f, 1.6f, 1.2f };
                    break;
                default: // Mobil — nilai default VehicleConfig sudah sesuai
                    config.Label = "Mobil";
                    config.Length = 4.2f; config.Width = 1.8f; config.Height = 1.4f;
                    config.WheelBase = 2.6f; config.TrackWidth = 1.5f;
                    config.Mass = 1300f;
                    config.MaxSpeed = 19.44f; config.ReverseMaxSpeed = 6f;  // 70 km/j maksimum
                    config.Acceleration = 6f; config.BrakeForce = 9f;
                    config.MaxSteerAngle = 32f; config.SteerRate = 4.5f; config.ReturnRate = 6f;
                    config.TireGrip = 9f; config.CenterOfMassY = -0.2f;
                    config.EngineIdleRpm = 800f; config.EngineRedlineRpm = 7000f;
                    config.GearRatios = new[] { 3.4f, 2.2f, 1.6f, 1.25f, 1.0f };
                    break;
            }
        }

        private Vector3 SpawnPosition()
        {
            var route = BuildRoute();
            return route[0] + Vector3.up * 0.7f;
        }

        private Quaternion SpawnRotation()
        {
            var route = BuildRoute();
            var heading = route[1] - route[0];
            heading.y = 0f;
            return heading.sqrMagnitude > 0.001f
                ? Quaternion.LookRotation(heading)
                : Quaternion.identity;
        }

        /// <summary>Visual sederhana (kotak) — cukup sebagai placeholder sampai model GLB diimpor.</summary>
        private static void BuildVehicleVisual(GameObject root, VehicleConfig config, VehicleConfig.VehicleType type)
        {
            var bodyColor = type switch
            {
                VehicleConfig.VehicleType.Motor => new Color(0.85f, 0.2f, 0.2f),
                VehicleConfig.VehicleType.Truk => new Color(0.2f, 0.6f, 0.25f),
                _ => new Color(0.2f, 0.45f, 0.9f)
            };
            var bodyMat = CreateMaterial(bodyColor, "Body");
            var darkMat = CreateMaterial(new Color(0.08f, 0.08f, 0.1f), "Rubber");

            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.name = "Body";
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0f, config.Height * 0.55f, 0f);
            body.transform.localScale = new Vector3(config.Width, config.Height * 0.6f, config.Length);
            AssignMaterial(body.GetComponent<MeshRenderer>(), bodyMat);
            Object.Destroy(body.GetComponent<Collider>());

            // Kabin / kokpit (placeholder).
            var cabin = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cabin.name = "Cabin";
            cabin.transform.SetParent(root.transform, false);
            cabin.transform.localPosition = new Vector3(0f, config.Height * 0.95f, config.Length * 0.12f);
            cabin.transform.localScale = new Vector3(config.Width * 0.85f, config.Height * 0.45f, config.Length * 0.45f);
            AssignMaterial(cabin.GetComponent<MeshRenderer>(), CreateMaterial(new Color(0.7f, 0.85f, 0.95f), "Glass"));
            Object.Destroy(cabin.GetComponent<Collider>());

            // 4 roda (Mobil/Truk); 2 roda untuk Motor.
            var wheels = type == VehicleConfig.VehicleType.Motor ? 2 : 4;
            var wheelRadius = type == VehicleConfig.VehicleType.Motor ? 0.35f : 0.4f;
            var axleOffsets = type == VehicleConfig.VehicleType.Motor
                ? new[] { -0.5f, 0.5f }
                : new[] { -0.6f, -0.6f, 0.6f, 0.6f };
            var sideOffsets = type == VehicleConfig.VehicleType.Motor
                ? new[] { 0f, 0f }
                : new[] { -1f, 1f, -1f, 1f };

            for (var i = 0; i < wheels; i++)
            {
                var wheel = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                wheel.name = "Wheel" + i;
                wheel.transform.SetParent(root.transform, false);
                wheel.transform.localPosition = new Vector3(
                    sideOffsets[i] * config.Width * 0.38f,
                    wheelRadius,
                    axleOffsets[i] * config.WheelBase * 0.5f);
                wheel.transform.localScale = new Vector3(wheelRadius * 1.1f, wheelRadius * 0.6f, wheelRadius * 1.1f);
                AssignMaterial(wheel.GetComponent<MeshRenderer>(), darkMat);
                Object.Destroy(wheel.GetComponent<Collider>());
            }
        }

        // ── Lalu lintas & pejalan kaki (§36-39) ──────────────────────────────

        private void BuildTrafficSystem()
        {
            // 1) Traffic light di jalan lurus pertama (stop line z = 36).
            var trafficLight = BuildTrafficLight(new Vector3(5.5f, 0.5f, 36f));
            BuildTrafficLightZone(trafficLight);

            // 2) Zebra cross di jalan lurus terakhir (x = 160) + pejalan kaki.
            BuildCrosswalk(new Vector3(160f, 0.5f, 0f));

            // 3) Kendaraan AI — rute penuh (melewati lampu, spawn di waypoint ≥ 1).
            BuildTrafficVehicles(trafficLight);
        }

        private TrafficLightController BuildTrafficLight(Vector3 stopPosition)
        {
            var go = new GameObject("TrafficLight");
            go.transform.position = stopPosition;

            var poleMat = CreateMaterial(new Color(0.15f, 0.15f, 0.15f), "Pole");
            var headMat = CreateMaterial(new Color(0.1f, 0.1f, 0.12f), "LampHead");

            var pole = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pole.name = "Pole";
            pole.transform.SetParent(go.transform, false);
            pole.transform.localPosition = new Vector3(0f, 1.2f, 0f);
            pole.transform.localScale = new Vector3(0.08f, 1.2f, 0.08f);
            AssignMaterial(pole.GetComponent<MeshRenderer>(), poleMat);
            Object.Destroy(pole.GetComponent<Collider>());

            var head = GameObject.CreatePrimitive(PrimitiveType.Cube);
            head.name = "Head";
            head.transform.SetParent(go.transform, false);
            head.transform.localPosition = new Vector3(0f, 2.3f, 0f);
            head.transform.localScale = new Vector3(0.55f, 1.5f, 0.35f);
            AssignMaterial(head.GetComponent<MeshRenderer>(), headMat);
            Object.Destroy(head.GetComponent<Collider>());

            // 3 bola lampu (merah → kuning → hijau) — material emissif (§28).
            var colors = new[] { Color.red, Color.yellow, new Color(0.1f, 0.9f, 0.2f) };
            var renderers = new Renderer[3];
            for (var i = 0; i < 3; i++)
            {
                var lamp = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                lamp.name = "Lamp" + i;
                lamp.transform.SetParent(go.transform, false);
                lamp.transform.localPosition = new Vector3(0f, 2.75f - i * 0.45f, -0.3f);
                lamp.transform.localScale = new Vector3(0.32f, 0.32f, 0.15f);
                AssignMaterial(lamp.GetComponent<MeshRenderer>(), CreateMaterial(colors[i], "Lamp" + i));
                Object.Destroy(lamp.GetComponent<Collider>());
                renderers[i] = lamp.GetComponent<MeshRenderer>();
            }

            var controller = go.AddComponent<TrafficLightController>();
            controller.Configure(renderers,
                CreateEmissiveMaterial(colors[0], "Red"),
                CreateEmissiveMaterial(colors[1], "Yellow"),
                CreateEmissiveMaterial(colors[2], "Green"));
            return controller;
        }

        private void BuildTrafficLightZone(TrafficLightController light)
        {
            var zone = new GameObject("TrafficLightZone");
            zone.transform.SetParent(transform, false);
            zone.transform.position = new Vector3(0f, 1f, 31f); // tepat sebelum stop line z=36
            zone.layer = LayerMask.NameToLayer("Trigger") >= 0 ? LayerMask.NameToLayer("Trigger") : 0;

            var box = zone.AddComponent<BoxCollider>();
            box.isTrigger = true;
            box.size = new Vector3(10f, 2f, 7f); // z ∈ [27.5, 34.5]

            var trafficLightZone = zone.AddComponent<TrafficLightZone>();
            trafficLightZone.Configure(Violations);
            trafficLightZone.Configure(light);
        }

        private void BuildCrosswalk(Vector3 center)
        {
            const float roadWidth = 10f;

            // Penanda sisi menyeberang (tegak lurus arah jalan).
            var sideA = new GameObject("CrosswalkSideA");
            sideA.transform.position = center + new Vector3(0f, 0f, -roadWidth * 0.5f);
            var sideB = new GameObject("CrosswalkSideB");
            sideB.transform.position = center + new Vector3(0f, 0f, roadWidth * 0.5f);

            // Visual zebra (garis putih di aspal).
            var whiteMat = CreateMaterial(new Color(0.92f, 0.92f, 0.92f), "Zebra");
            for (var i = -1; i <= 1; i++)
            {
                var stripe = GameObject.CreatePrimitive(PrimitiveType.Cube);
                stripe.name = "Stripe" + i;
                stripe.transform.position = center + new Vector3(i * 0.8f, 0.52f, 0f); // tepat di atas aspal (y=0.5)
                stripe.transform.localScale = new Vector3(0.5f, 0.02f, roadWidth * 0.8f);
                AssignMaterial(stripe.GetComponent<MeshRenderer>(), whiteMat);
                Object.Destroy(stripe.GetComponent<Collider>());
            }

            // PedestrianManager + prefab pool + 1 zebra aktif.
            var managerGo = new GameObject("Pedestrians");
            managerGo.transform.SetParent(transform, false);
            var manager = managerGo.AddComponent<PedestrianManager>();

            var pedestrianPrefab = BuildPedestrianPrefab(managerGo.transform);
            var crossings = new[]
            {
                new PedestrianManager.Crossing { sideA = sideA.transform, sideB = sideB.transform }
            };
            manager.Configure(pedestrianPrefab, crossings);
            manager.SetBudget(1);

            // Zona aturan: memasuki zebra saat pejalan kaki menyeberang = pelanggaran.
            var zone = new GameObject("CrosswalkZone");
            zone.transform.SetParent(transform, false);
            zone.transform.position = center + new Vector3(0f, 1f, 0f);
            zone.layer = LayerMask.NameToLayer("Trigger") >= 0 ? LayerMask.NameToLayer("Trigger") : 0;

            var box = zone.AddComponent<BoxCollider>();
            box.isTrigger = true;
            box.size = new Vector3(4f, 2f, roadWidth);

            var crosswalkZone = zone.AddComponent<CrosswalkZone>();
            crosswalkZone.Configure(Violations);
            crosswalkZone.Configure(manager, 0);
        }

        private static Pedestrian BuildPedestrianPrefab(Transform parent)
        {
            var go = new GameObject("PedestrianPrefab");
            go.transform.SetParent(parent, false);

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Body";
            body.transform.SetParent(go.transform, false);
            body.transform.localPosition = new Vector3(0f, 0.8f, 0f);
            body.transform.localScale = new Vector3(0.5f, 0.8f, 0.5f);
            AssignMaterial(body.GetComponent<MeshRenderer>(), CreateMaterial(new Color(0.95f, 0.6f, 0.1f), "Pedestrian"));
            Object.Destroy(body.GetComponent<Collider>());

            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.name = "Head";
            head.transform.SetParent(go.transform, false);
            head.transform.localPosition = new Vector3(0f, 1.55f, 0f);
            head.transform.localScale = new Vector3(0.35f, 0.35f, 0.35f);
            AssignMaterial(head.GetComponent<MeshRenderer>(), CreateMaterial(new Color(0.9f, 0.75f, 0.6f), "Skin"));
            Object.Destroy(head.GetComponent<Collider>());

            // Collider root untuk deteksi tabrakan pemain (§38, PedestrianCollisionWatcher).
            var collider = go.AddComponent<CapsuleCollider>();
            collider.center = new Vector3(0f, 0.8f, 0f);
            collider.height = 1.6f;
            collider.radius = 0.3f;

            go.AddComponent<Pedestrian>();
            go.SetActive(false); // template pool — tidak muncul di scene
            return go.GetComponent<Pedestrian>();
        }

        private void BuildTrafficVehicles(TrafficLightController trafficLight)
        {
            var managerGo = new GameObject("Traffic");
            managerGo.transform.SetParent(transform, false);
            var manager = managerGo.AddComponent<TrafficManager>();

            var prefab = BuildTrafficVehiclePrefab(managerGo.transform);

            // Rute PENUH (termasuk jalan lurus pertama) agar kendaraan AI
            // melewati traffic light di z=36 dan berhenti saat merah.
            // Spawn dipindah ke waypoint ≥ 1 supaya tidak menimpa spawn pemain.
            manager.Configure(prefab, _waypoints, new[] { trafficLight });
            manager.SetBudget(3); // §37: budget ringan untuk scene #1
        }

        private static TrafficVehicle BuildTrafficVehiclePrefab(Transform parent)
        {
            var go = new GameObject("TrafficVehiclePrefab");
            go.transform.SetParent(parent, false);

            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.name = "Body";
            body.transform.SetParent(go.transform, false);
            body.transform.localPosition = new Vector3(0f, 0.8f, 0f);
            body.transform.localScale = new Vector3(1.8f, 0.7f, 4.2f);
            AssignMaterial(body.GetComponent<MeshRenderer>(), CreateMaterial(new Color(0.8f, 0.7f, 0.2f), "TrafficBody"));
            Object.Destroy(body.GetComponent<Collider>());

            var roof = GameObject.CreatePrimitive(PrimitiveType.Cube);
            roof.name = "Roof";
            roof.transform.SetParent(go.transform, false);
            roof.transform.localPosition = new Vector3(0f, 1.35f, -0.3f);
            roof.transform.localScale = new Vector3(1.6f, 0.5f, 2f);
            AssignMaterial(roof.GetComponent<MeshRenderer>(), CreateMaterial(new Color(0.7f, 0.6f, 0.15f), "TrafficRoof"));
            Object.Destroy(roof.GetComponent<Collider>());

            go.AddComponent<Rigidbody>();  // kinematic di-set oleh TrafficVehicle.Awake
            go.AddComponent<BoxCollider>(); // rintangan fisik bagi pemain (§16)
            go.AddComponent<SceneryObstacle>(); // tabrak kendaraan AI = obstacleHits (konsisten web)

            go.AddComponent<TrafficVehicle>();
            go.SetActive(false); // template pool
            return go.GetComponent<TrafficVehicle>();
        }

        /// <summary>Material emissif untuk lampu lalu lintas (tanpa realtime light — §28).</summary>
        private static Material? CreateEmissiveMaterial(Color color, string name)
        {
            var mat = CreateMaterial(color, name);
            if (mat != null)
            {
                mat.EnableKeyword("_EMISSION");
                if (mat.HasProperty("_EmissionColor")) mat.SetColor("_EmissionColor", color * 1.6f);
            }
            return mat;
        }

        /// <summary>Set material ke renderer hanya bila keduanya ada (null-safe).</summary>
        private static void AssignMaterial(Renderer renderer, Material? material)
        {
            if (renderer != null && material != null) renderer.sharedMaterial = material;
        }

        /// <summary>Material runtime sederhana (URP Lit → Standard → Diffuse → Unlit/Color).</summary>
        private static Material? CreateMaterial(Color color, string name)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            if (shader == null) shader = Shader.Find("Diffuse");
            if (shader == null) shader = Shader.Find("Unlit/Color");
            if (shader == null) return null; // tanpa shader → biarkan tanpa material

            var mat = new Material(shader) { name = name };
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
            else if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
            return mat;
        }
    }
}
