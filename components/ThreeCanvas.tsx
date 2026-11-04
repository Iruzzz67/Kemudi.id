import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CameraView, DrivingTelemetry, TransmissionType, VehicleType } from '@/types/ui';
import { soundEngine } from '@/utils/audio';

export interface HandlingParams {
  steerSensitivity: number;
  accelerationPower: number;
  brakeStrength: number;
  absAssistance: boolean;
}

interface ThreeCanvasProps {
  phase: 'walking' | 'driving';
  vehicleType: VehicleType;
  transmission: TransmissionType;
  handlingParams: HandlingParams;
  telemetry: DrivingTelemetry;
  setTelemetry: React.Dispatch<React.SetStateAction<DrivingTelemetry>>;
  onEnterVehicleFromWalking: () => void;
  onFinishCourse: (passed: boolean, violations: string[]) => void;
  onCrashPedestrian: () => void;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  phase,
  vehicleType,
  transmission,
  handlingParams,
  telemetry,
  setTelemetry,
  onEnterVehicleFromWalking,
  onFinishCourse,
  onCrashPedestrian,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to keep updated across animation frames without re-instantiating Three scene
  const controlsRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
    clutch: false,
  });

  const stateRef = useRef({
    phase,
    vehicleType,
    transmission,
    handlingParams,
    cameraView: telemetry.cameraView,
    speed: 0, // m/s
    angle: 0, // vehicle yaw
    pos: new THREE.Vector3(0, 0, 10),
    walkPos: new THREE.Vector3(6, 0, 12),
    walkAngle: 0,
    rpm: 800,
    gear: 1,
    engineOn: telemetry.engineOn,
    seatbelt: telemetry.seatbelt,
    mirrorsAdjusted: telemetry.mirrorsAdjusted,
    handbrakeActive: telemetry.handbrakeActive,
    headlights: telemetry.headlights,
    hazard: telemetry.hazard,
    violationsCount: 0,
    offRoadCount: 0,
    obstacleHits: 0,
    violationDetails: [] as string[],
    trafficLightState: 'red' as 'red' | 'yellow' | 'green',
    trafficLightTimer: 0,
    pedestrianPos: new THREE.Vector3(-6, 0, -45),
    pedestrianDirection: 1,
    finished: false,
    elapsedSeconds: 0,
    warning: null as string | null,
    warningTimeout: null as NodeJS.Timeout | null,
  });

  // Sync props to stateRef
  useEffect(() => {
    stateRef.current.phase = phase;
    stateRef.current.vehicleType = vehicleType;
    stateRef.current.transmission = transmission;
    stateRef.current.handlingParams = handlingParams;
    stateRef.current.cameraView = telemetry.cameraView;
    stateRef.current.engineOn = telemetry.engineOn;
    stateRef.current.seatbelt = telemetry.seatbelt;
    stateRef.current.mirrorsAdjusted = telemetry.mirrorsAdjusted;
    stateRef.current.handbrakeActive = telemetry.handbrakeActive;
    stateRef.current.headlights = telemetry.headlights;
    stateRef.current.hazard = telemetry.hazard;
  }, [
    phase,
    vehicleType,
    transmission,
    handlingParams,
    telemetry.cameraView,
    telemetry.engineOn,
    telemetry.seatbelt,
    telemetry.mirrorsAdjusted,
    telemetry.handbrakeActive,
    telemetry.headlights,
    telemetry.hazard,
  ]);

  const triggerWarning = (msg: string) => {
    stateRef.current.warning = msg;
    setTelemetry((prev) => ({ ...prev, activeWarning: msg }));
    if (stateRef.current.warningTimeout) clearTimeout(stateRef.current.warningTimeout);
    stateRef.current.warningTimeout = setTimeout(() => {
      stateRef.current.warning = null;
      setTelemetry((prev) => ({ ...prev, activeWarning: null }));
    }, 2800);
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') controlsRef.current.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') controlsRef.current.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') controlsRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') controlsRef.current.right = true;
      if (code === 'Space') {
        e.preventDefault();
        controlsRef.current.handbrake = !controlsRef.current.handbrake;
        const newHb = controlsRef.current.handbrake;
        stateRef.current.handbrakeActive = newHb;
        setTelemetry((prev) => ({ ...prev, handbrakeActive: newHb }));
        soundEngine.playHandbrake();
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        controlsRef.current.clutch = true;
        setTelemetry((prev) => ({ ...prev, clutchActive: true }));
      }
      if (code === 'KeyE') {
        // Shift gear up
        if (stateRef.current.phase === 'walking') {
          // If walking and near car, enter
          const dist = stateRef.current.walkPos.distanceTo(stateRef.current.pos);
          if (dist < 4.0) onEnterVehicleFromWalking();
        } else {
          if (stateRef.current.transmission === 'manual' && !controlsRef.current.clutch) {
            triggerWarning('Injak kopling [Shift] sebelum menaikkan gigi!');
          } else {
            const nextGear = Math.min(5, stateRef.current.gear + 1);
            stateRef.current.gear = nextGear;
            setTelemetry((prev) => ({ ...prev, gear: nextGear }));
            soundEngine.playGearShift();
          }
        }
      }
      if (code === 'KeyQ') {
        // Shift gear down
        if (stateRef.current.transmission === 'manual' && !controlsRef.current.clutch) {
          triggerWarning('Injak kopling [Shift] sebelum menurunkan gigi!');
        } else {
          const nextGear = Math.max(-1, stateRef.current.gear - 1);
          stateRef.current.gear = nextGear;
          setTelemetry((prev) => ({ ...prev, gear: nextGear }));
          soundEngine.playGearShift();
        }
      }
      if (code === 'KeyB') {
        // Toggle seatbelt
        const nextSb = !stateRef.current.seatbelt;
        stateRef.current.seatbelt = nextSb;
        setTelemetry((prev) => ({ ...prev, seatbelt: nextSb }));
        soundEngine.playSeatbelt();
      }
      if (code === 'KeyM') {
        // Mirrors
        stateRef.current.mirrorsAdjusted = true;
        setTelemetry((prev) => ({ ...prev, mirrorsAdjusted: true }));
        triggerWarning('3 Kaca spion telah diatur ke posisi ergonomis.');
      }
      if (code === 'KeyI') {
        // Engine start/stop
        const nextEng = !stateRef.current.engineOn;
        stateRef.current.engineOn = nextEng;
        setTelemetry((prev) => ({ ...prev, engineOn: nextEng }));
        if (nextEng) soundEngine.startEngine();
        else soundEngine.stopEngine();
      }
      if (code === 'KeyL') {
        // Headlights
        const nextL = !stateRef.current.headlights;
        stateRef.current.headlights = nextL;
        setTelemetry((prev) => ({ ...prev, headlights: nextL }));
      }
      if (code === 'KeyH') {
        // Horn
        soundEngine.playHorn(true);
      }
      if (code === 'KeyC') {
        // Camera toggle
        setTelemetry((prev) => {
          const views: CameraView[] = ['third_person', 'cockpit', 'top_down'];
          const nextView = views[(views.indexOf(prev.cameraView) + 1) % views.length];
          return { ...prev, cameraView: nextView };
        });
      }
      if (code === 'KeyR') {
        // Reset car position
        stateRef.current.pos.set(0, 0, 10);
        stateRef.current.angle = 0;
        stateRef.current.speed = 0;
        triggerWarning('Posisi kendaraan di-reset ke garis awal.');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') controlsRef.current.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') controlsRef.current.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') controlsRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') controlsRef.current.right = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        controlsRef.current.clutch = false;
        setTelemetry((prev) => ({ ...prev, clutchActive: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onEnterVehicleFromWalking]);

  // Main Three.js Scene Setup & Animation Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Deep modern slate sky
    scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      600
    );

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    dirLight.position.set(40, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    scene.add(dirLight);

    // Ground Plane (Grass/Terrain)
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ROAD SYSTEM (Track loop)
    const roadGroup = new THREE.Group();
    scene.add(roadGroup);

    // Straight track segment from z=30 to z=-140 (Width: 10m)
    const roadGeo = new THREE.PlaneGeometry(12, 180);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.7 });
    const roadStraight = new THREE.Mesh(roadGeo, roadMat);
    roadStraight.rotation.x = -Math.PI / 2;
    roadStraight.position.set(0, 0.02, -50);
    roadStraight.receiveShadow = true;
    roadGroup.add(roadStraight);

    // Sidewalks (Curbs)
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const curbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 180), curbMat);
    curbLeft.position.set(-6.4, 0.1, -50);
    curbLeft.receiveShadow = true;
    roadGroup.add(curbLeft);

    const curbRight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 180), curbMat);
    curbRight.position.set(6.4, 0.1, -50);
    curbRight.receiveShadow = true;
    roadGroup.add(curbRight);

    // Center Yellow Dashed Line
    const centerDashesGroup = new THREE.Group();
    const dashGeo = new THREE.PlaneGeometry(0.25, 2.8);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let z = 25; z > -130; z -= 5) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.04, z);
      centerDashesGroup.add(dash);
    }
    roadGroup.add(centerDashesGroup);

    // White Edge Lines
    const edgeLineGeo = new THREE.PlaneGeometry(0.2, 175);
    const edgeLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const edgeLeft = new THREE.Mesh(edgeLineGeo, edgeLineMat);
    edgeLeft.rotation.x = -Math.PI / 2;
    edgeLeft.position.set(-5.4, 0.04, -50);
    roadGroup.add(edgeLeft);

    const edgeRight = new THREE.Mesh(edgeLineGeo, edgeLineMat);
    edgeRight.rotation.x = -Math.PI / 2;
    edgeRight.position.set(5.4, 0.04, -50);
    roadGroup.add(edgeRight);

    // START LINE (Z = 12)
    const startLine = new THREE.Mesh(
      new THREE.PlaneGeometry(10.8, 0.8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(0, 0.045, 15);
    roadGroup.add(startLine);

    // ZEBRA CROSS (Penyeberangan Pejalan Kaki at Z = -45)
    const zebraGroup = new THREE.Group();
    const stripeGeo = new THREE.PlaneGeometry(0.6, 5);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let x = -5; x <= 5; x += 1.0) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.045, -45);
      zebraGroup.add(stripe);
    }
    roadGroup.add(zebraGroup);

    // Stop line before Zebra cross (Z = -38)
    const stopLine = new THREE.Mesh(
      new THREE.PlaneGeometry(10.8, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(0, 0.045, -39);
    roadGroup.add(stopLine);

    // FINISH LINE at Z = -120
    const finishLine = new THREE.Mesh(
      new THREE.PlaneGeometry(10.8, 1.2),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.045, -120);
    roadGroup.add(finishLine);

    // TRAFFIC LIGHT 3D MODEL at Z = -40, X = 7.2
    const trafficLightGroup = new THREE.Group();
    trafficLightGroup.position.set(7.2, 0, -40);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6), poleMat);
    pole.position.y = 3;
    pole.castShadow = true;
    trafficLightGroup.add(pole);

    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const lightBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), boxMat);
    lightBox.position.set(0, 5, 0);
    trafficLightGroup.add(lightBox);

    // Red, Yellow, Green bulbs
    const redBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    redBulb.position.set(0, 5.6, -0.42);
    trafficLightGroup.add(redBulb);

    const yellowBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x443300 })
    );
    yellowBulb.position.set(0, 5.0, -0.42);
    trafficLightGroup.add(yellowBulb);

    const greenBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x004400 })
    );
    greenBulb.position.set(0, 4.4, -0.42);
    trafficLightGroup.add(greenBulb);

    scene.add(trafficLightGroup);

    // 3D TRAFFIC CONES (Slalom section between Z = -65 and Z = -95)
    const coneGroup = new THREE.Group();
    const conePositions = [
      new THREE.Vector3(-1.8, 0, -68),
      new THREE.Vector3(1.8, 0, -78),
      new THREE.Vector3(-1.8, 0, -88),
      new THREE.Vector3(1.8, 0, -98),
    ];

    conePositions.forEach((pos) => {
      const coneBody = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 0.7, 16),
        new THREE.MeshStandardMaterial({ color: 0xf97316 })
      );
      coneBody.position.set(pos.x, 0.35, pos.z);
      coneBody.castShadow = true;

      const coneBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.05, 0.55),
        new THREE.MeshStandardMaterial({ color: 0xea580c })
      );
      coneBase.position.set(pos.x, 0.025, pos.z);
      coneBase.castShadow = true;

      coneGroup.add(coneBody);
      coneGroup.add(coneBase);
    });
    scene.add(coneGroup);

    // PEDESTRIAN (Animated 3D human mesh walking across zebra crossing)
    const pedGroup = new THREE.Group();
    pedGroup.position.set(-5, 0, -45);

    const pedSkin = new THREE.MeshStandardMaterial({ color: 0xfcd34d });
    const pedShirt = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const pedPants = new THREE.MeshStandardMaterial({ color: 0x1e293b });

    const pedHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), pedSkin);
    pedHead.position.y = 1.6;
    pedGroup.add(pedHead);

    const pedTorso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.25), pedShirt);
    pedTorso.position.y = 1.2;
    pedGroup.add(pedTorso);

    const pedLegLeft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), pedPants);
    pedLegLeft.position.set(-0.1, 0.45, 0);
    pedGroup.add(pedLegLeft);

    const pedLegRight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), pedPants);
    pedLegRight.position.set(0.1, 0.45, 0);
    pedGroup.add(pedLegRight);

    scene.add(pedGroup);

    // SCENERY TREES & STREETLIGHTS
    const sceneryGroup = new THREE.Group();
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

    for (let z = 20; z >= -130; z -= 20) {
      // Left trees
      const trunkL = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.5), treeTrunkMat);
      trunkL.position.set(-11, 1.25, z);
      const foliageL = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 8), treeFoliageMat);
      foliageL.position.set(-11, 4.5, z);
      sceneryGroup.add(trunkL, foliageL);

      // Right trees
      const trunkR = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.5), treeTrunkMat);
      trunkR.position.set(11, 1.25, z);
      const foliageR = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 8), treeFoliageMat);
      foliageR.position.set(11, 4.5, z);
      sceneryGroup.add(trunkR, foliageR);
    }
    scene.add(sceneryGroup);

    // VEHICLE 3D MODEL
    const vehicleGroup = new THREE.Group();
    vehicleGroup.position.copy(stateRef.current.pos);
    scene.add(vehicleGroup);

    // Create 3D vehicle geometry based on vehicleType
    const createVehicleMesh = () => {
      // Clear old meshes
      while (vehicleGroup.children.length > 0) {
        vehicleGroup.remove(vehicleGroup.children[0]);
      }

      if (vehicleType === 'motor') {
        // Motorcycle model
        const bikeBodyMat = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.3 });
        const bikeFrame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1.8), bikeBodyMat);
        bikeFrame.position.y = 0.55;
        bikeFrame.castShadow = true;
        vehicleGroup.add(bikeFrame);

        // Wheels
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16);

        const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
        frontWheel.rotation.z = Math.PI / 2;
        frontWheel.position.set(0, 0.35, -0.9);
        vehicleGroup.add(frontWheel);

        const rearWheel = new THREE.Mesh(wheelGeo, wheelMat);
        rearWheel.rotation.z = Math.PI / 2;
        rearWheel.position.set(0, 0.35, 0.8);
        vehicleGroup.add(rearWheel);

        // Handlebars
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), handleMat);
        handle.position.set(0, 0.95, -0.7);
        vehicleGroup.add(handle);
      } else if (vehicleType === 'truk') {
        // Commercial Box Truck model
        const cabMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.8 });

        // Cab
        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.2, 2.0), cabMat);
        cab.position.set(0, 1.4, -2.2);
        cab.castShadow = true;
        vehicleGroup.add(cab);

        // Windshield
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.1,
          metalness: 0.8,
        });
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 0.1), glassMat);
        windshield.position.set(0, 1.8, -3.21);
        vehicleGroup.add(windshield);

        // Cargo Box
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 5.0), boxMat);
        cargo.position.set(0, 1.8, 1.3);
        cargo.castShadow = true;
        vehicleGroup.add(cargo);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16);
        [-1.15, 1.15].forEach((x) => {
          [-2.2, 0.5, 2.5].forEach((z) => {
            const w = new THREE.Mesh(wheelGeo, tireMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.5, z);
            vehicleGroup.add(w);
          });
        });
      } else {
        // Standard Modern Sedan Car
        const carBodyMat = new THREE.MeshStandardMaterial({
          color: 0x2563eb,
          roughness: 0.2,
          metalness: 0.4,
        });
        const carRoofMat = new THREE.MeshStandardMaterial({
          color: 0x1d4ed8,
          roughness: 0.2,
          metalness: 0.4,
        });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          roughness: 0.1,
          metalness: 0.9,
          transparent: true,
          opacity: 0.75,
        });

        // Lower Body
        const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 4.4), carBodyMat);
        lowerBody.position.y = 0.55;
        lowerBody.castShadow = true;
        vehicleGroup.add(lowerBody);

        // Cabin / Roof
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.6, 2.2), carRoofMat);
        cabin.position.set(0, 1.15, 0.1);
        cabin.castShadow = true;
        vehicleGroup.add(cabin);

        // Front Windshield
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.1), glassMat);
        windshield.rotation.x = -Math.PI / 6;
        windshield.position.set(0, 1.05, -1.05);
        vehicleGroup.add(windshield);

        // Rear Windshield
        const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.1), glassMat);
        rearGlass.rotation.x = Math.PI / 6;
        rearGlass.position.set(0, 1.05, 1.25);
        vehicleGroup.add(rearGlass);

        // 4 Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 20);
        [-0.95, 0.95].forEach((x) => {
          [-1.35, 1.35].forEach((z) => {
            const wheel = new THREE.Mesh(wheelGeo, tireMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.38, z);
            wheel.castShadow = true;

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.26, 12), rimMat);
            rim.rotation.z = Math.PI / 2;
            rim.position.set(x, 0.38, z);

            vehicleGroup.add(wheel);
            vehicleGroup.add(rim);
          });
        });

        // Headlight Beams (Visual)
        const lightGeo = new THREE.BoxGeometry(0.35, 0.15, 0.05);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const hLeft = new THREE.Mesh(lightGeo, lightMat);
        hLeft.position.set(-0.7, 0.6, -2.2);
        const hRight = new THREE.Mesh(lightGeo, lightMat);
        hRight.position.set(0.7, 0.6, -2.2);
        vehicleGroup.add(hLeft, hRight);
      }
    };

    createVehicleMesh();

    // WALKING AVATAR (in walking phase)
    const walkerGroup = new THREE.Group();
    walkerGroup.position.copy(stateRef.current.walkPos);
    scene.add(walkerGroup);

    const walkerMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const walkerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.7, 12), walkerMat);
    walkerBody.position.y = 0.85;
    walkerBody.castShadow = true;
    walkerGroup.add(walkerBody);

    const walkerHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfde047 })
    );
    walkerHead.position.y = 1.85;
    walkerGroup.add(walkerHead);

    // Headlight Spotlights on vehicle
    const spotLeft = new THREE.SpotLight(0xfffbeb, 2.5, 35, Math.PI / 6, 0.3);
    spotLeft.position.set(-0.7, 0.6, -2.0);
    const spotTargetLeft = new THREE.Object3D();
    spotTargetLeft.position.set(-0.7, 0, -25);
    vehicleGroup.add(spotLeft);
    vehicleGroup.add(spotTargetLeft);
    spotLeft.target = spotTargetLeft;

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ANIMATION & PHYSICS TICK LOOP
    let animId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const s = stateRef.current;
      const controls = controlsRef.current;
      const hp = s.handlingParams;

      // 1. UPDATE TRAFFIC LIGHT SYSTEM
      s.trafficLightTimer += delta;
      if (s.trafficLightState === 'red' && s.trafficLightTimer > 7.0) {
        s.trafficLightState = 'green';
        s.trafficLightTimer = 0;
        redBulb.material = new THREE.MeshBasicMaterial({ color: 0x440000 });
        greenBulb.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      } else if (s.trafficLightState === 'green' && s.trafficLightTimer > 9.0) {
        s.trafficLightState = 'yellow';
        s.trafficLightTimer = 0;
        greenBulb.material = new THREE.MeshBasicMaterial({ color: 0x004400 });
        yellowBulb.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      } else if (s.trafficLightState === 'yellow' && s.trafficLightTimer > 2.5) {
        s.trafficLightState = 'red';
        s.trafficLightTimer = 0;
        yellowBulb.material = new THREE.MeshBasicMaterial({ color: 0x443300 });
        redBulb.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      }

      // 2. ANIMATE PEDESTRIAN ACROSS ZEBRA CROSS
      s.pedestrianPos.x += s.pedestrianDirection * delta * 1.6;
      if (s.pedestrianPos.x > 5.0) s.pedestrianDirection = -1;
      if (s.pedestrianPos.x < -5.0) s.pedestrianDirection = 1;
      pedGroup.position.copy(s.pedestrianPos);

      // 3. PHASE HANDLING: WALKING vs DRIVING
      if (s.phase === 'walking') {
        walkerGroup.visible = true;

        // Walk Controls
        let walkSpeed = 0;
        if (controls.forward) walkSpeed = 3.5;
        if (controls.backward) walkSpeed = -2.5;

        if (controls.left) s.walkAngle += 2.5 * delta;
        if (controls.right) s.walkAngle -= 2.5 * delta;

        const forwardVec = new THREE.Vector3(
          -Math.sin(s.walkAngle) * walkSpeed * delta,
          0,
          -Math.cos(s.walkAngle) * walkSpeed * delta
        );
        s.walkPos.add(forwardVec);
        walkerGroup.position.copy(s.walkPos);
        walkerGroup.rotation.y = s.walkAngle;

        // Camera follows walker
        camera.position.set(
          s.walkPos.x + Math.sin(s.walkAngle) * 4.5,
          s.walkPos.y + 3.0,
          s.walkPos.z + Math.cos(s.walkAngle) * 4.5
        );
        camera.lookAt(s.walkPos.x, s.walkPos.y + 1.2, s.walkPos.z);
      } else {
        // DRIVING PHASE
        walkerGroup.visible = false;

        if (!s.finished) {
          s.elapsedSeconds += delta;
        }

        // Check if handbrake is active while trying to accelerate
        if (s.handbrakeActive && controls.forward) {
          triggerWarning('⚠ Rem tangan masih aktif! Lepaskan [Spasi] sebelum melaju');
        }

        // Acceleration & Braking Physics
        const maxSpeed = (hp.accelerationPower * 28.0) * (s.vehicleType === 'truk' ? 0.75 : 1.0);
        const accelRate = 9.0 * hp.accelerationPower;
        const brakeRate = 22.0 * hp.brakeStrength;

        if (s.engineOn && !s.handbrakeActive) {
          if (controls.forward) {
            s.speed += accelRate * delta;
            if (s.speed > maxSpeed) s.speed = maxSpeed;
          } else if (controls.backward) {
            // Reverse or Brake
            if (s.speed > 0.5) {
              s.speed -= brakeRate * delta;
            } else {
              s.speed -= (accelRate * 0.5) * delta;
              if (s.speed < -6.0) s.speed = -6.0;
            }
          } else {
            // Natural drag / engine braking
            s.speed *= 0.985;
            if (Math.abs(s.speed) < 0.1) s.speed = 0;
          }
        } else {
          // Engine off or handbrake on
          s.speed *= 0.90;
          if (Math.abs(s.speed) < 0.1) s.speed = 0;
        }

        // Steering Physics (Speed-dependent angle)
        if (Math.abs(s.speed) > 0.2) {
          const steerSpeed = hp.steerSensitivity * (s.vehicleType === 'motor' ? 2.4 : 1.6);
          const dir = s.speed >= 0 ? 1 : -1;
          if (controls.left) s.angle += steerSpeed * delta * dir;
          if (controls.right) s.angle -= steerSpeed * delta * dir;
        }

        // Move vehicle
        const forwardDirection = new THREE.Vector3(
          -Math.sin(s.angle) * s.speed * delta,
          0,
          -Math.cos(s.angle) * s.speed * delta
        );
        s.pos.add(forwardDirection);

        vehicleGroup.position.copy(s.pos);
        vehicleGroup.rotation.y = s.angle;

        // RPM calculation
        const kmh = Math.abs(s.speed) * 3.6;
        if (s.engineOn) {
          const gearRatio = Math.max(1, s.gear);
          s.rpm = Math.min(6800, 800 + (kmh * 75) / gearRatio + (controls.forward ? 1200 : 0));
        } else {
          s.rpm = 0;
        }
        soundEngine.updateRpm(s.rpm);

        // Headlight beam toggle
        spotLeft.intensity = s.headlights ? 2.5 : 0;

        // 4. RULE CHECKS & PENALTIES
        // A. Red Light Violation Check
        if (
          s.trafficLightState === 'red' &&
          s.pos.z < -39.0 &&
          s.pos.z > -44.0 &&
          s.speed > 1.5
        ) {
          if (!s.violationDetails.includes('Menerobos lampu merah pada persimpangan')) {
            s.violationsCount += 1;
            s.violationDetails.push('Menerobos lampu merah pada persimpangan');
            soundEngine.playCollision();
            triggerWarning('⚠ PELANGGARAN: Menerobos Lampu Merah! Wajib berhenti sebelum garis stop.');
          }
        }

        // B. Off-Road Detection (Edge boundary: |x| > 5.6m)
        if (Math.abs(s.pos.x) > 5.6 && Math.abs(s.speed) > 1.0) {
          s.offRoadCount += 1;
          triggerWarning('⚠ Roda keluar garis aspal! Kembalikan kendaraan ke lajur.');
        }

        // C. Traffic Cone Obstacle Collision Check
        conePositions.forEach((cone) => {
          if (s.pos.distanceTo(cone) < 1.4) {
            s.obstacleHits += 1;
            soundEngine.playCollision();
            triggerWarning('⚠ Menyenggol cone rintangan slalom!');
          }
        });

        // D. Pedestrian Collision Check (Fatal failure!)
        if (s.pos.distanceTo(s.pedestrianPos) < 1.8 && Math.abs(s.speed) > 2.0) {
          soundEngine.playCollision();
          onCrashPedestrian();
          return;
        }

        // E. Finish Line Passed Check (Z < -120)
        if (s.pos.z < -120 && !s.finished) {
          s.finished = true;
          soundEngine.playSuccess();
          const passed = s.violationsCount === 0 && s.obstacleHits <= 1;
          onFinishCourse(passed, s.violationDetails);
        }

        // 5. UPDATE CAMERA MODES
        if (s.cameraView === 'cockpit') {
          // Driver POV behind steering wheel
          const eyeHeight = s.vehicleType === 'truk' ? 2.4 : 1.25;
          const eyeForward = s.vehicleType === 'truk' ? -2.2 : -0.2;
          const eyePos = new THREE.Vector3(
            s.pos.x - Math.sin(s.angle) * eyeForward + Math.cos(s.angle) * 0.4,
            s.pos.y + eyeHeight,
            s.pos.z - Math.cos(s.angle) * eyeForward - Math.sin(s.angle) * 0.4
          );
          camera.position.copy(eyePos);
          const lookAtTarget = new THREE.Vector3(
            s.pos.x - Math.sin(s.angle) * 20,
            s.pos.y + eyeHeight * 0.9,
            s.pos.z - Math.cos(s.angle) * 20
          );
          camera.lookAt(lookAtTarget);
        } else if (s.cameraView === 'top_down') {
          // Bird's eye helicopter view
          camera.position.set(s.pos.x, s.pos.y + 28, s.pos.z + 4);
          camera.lookAt(s.pos.x, s.pos.y, s.pos.z);
        } else {
          // Standard Third-person chase cam
          const camDist = s.vehicleType === 'truk' ? 12.0 : 7.5;
          const camHeight = s.vehicleType === 'truk' ? 5.2 : 3.2;
          const camPos = new THREE.Vector3(
            s.pos.x + Math.sin(s.angle) * camDist,
            s.pos.y + camHeight,
            s.pos.z + Math.cos(s.angle) * camDist
          );
          camera.position.lerp(camPos, 0.15);
          camera.lookAt(s.pos.x, s.pos.y + 1.2, s.pos.z);
        }

        // Periodic telemetry push (throttled)
        setTelemetry((prev) => ({
          ...prev,
          speed: kmh,
          rpm: s.rpm,
          elapsedSeconds: s.elapsedSeconds,
          violationsCount: s.violationsCount,
          offRoadCount: s.offRoadCount,
          obstacleHits: s.obstacleHits,
        }));
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [vehicleType, onCrashPedestrian, onFinishCourse]);

  return <div ref={mountRef} className="w-full h-full relative cursor-grab active:cursor-grabbing" />;
};
