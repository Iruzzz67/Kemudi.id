/**
 * Main — Orchestrator for the Kemudi.id 3D Driving Simulation.
 *
 * Phases: Select → Walking → Driving → Finished/Failed
 * Camera: TPV → FPV → Top-Down (cycle with C)
 * Scoring: 100 − violations×8 − offRoadCount×5 − penaltyWaktu
 * Based on DOKUMENTASI_SIMULASI.md.
 */
(function () {
  'use strict';

  // === Config ===
  const PHASES = {
    SELECT: 'select',
    WALKING: 'walking',
    DRIVING: 'driving',
    PAUSED: 'paused',
    FINISHED: 'finished',
    FAILED: 'failed',
  };

  const CAMERA_MODES = ['TPV', 'FPV', 'TopDown'];
  const PAR_TIME = 180; // Connected 480 m route, including two signal stops.

  // === State ===
  let phase = PHASES.SELECT;
  let renderer, scene, camera;
  let track, vehicle, input, hud, walkingHud, audio;
  let keyboard, gamepadSettings, gamepadAdapter, gamepadRouter, gamepadUI, gamepadSample, gamepadFrame;
  let phaseBeforePause = PHASES.DRIVING, menuOpenedFrom;
  let disposed = false;
  let pauseScreen, finishedScreen, failedScreen, selectScreen;
  let pedestrians;
  let clock;
  let vehicleType = 'MOBIL';
  let transmission = 'automatic';
  let muted = false;
  let cameraMode = 0; // 0=TPV, 1=FPV, 2=TopDown
  const cameraLook = { yaw: 0, pitch: 0 };
  let cameraLookActive = false;
  let starting = false;
  let lastCollisionTime = -Infinity;
  let mapName = 'unified';
  let ready = false;
  let attemptId;
  const simulation = new SimulationState();
  let collisionWorld, environment, traffic, lights, horns, cockpit, trafficLOD;
  const characters = new Map();
  let instruments, accumulator = 0, bufferedEdges = {};

  // Walking state
  let walkingPosition = new THREE.Vector3(-12, 1.6, 10);
  let walkingRotation = 0;
  let nearVehicleDoor = false;

  // Off-road & violation tracking
  let offRoadWarningTimer = 0;
  let seatbeltWarningTimer = 0;
  let lastViolationTime = 0;

  // Score
  const SCORE_CONFIG = {
    maxScore: 100,
    violationPenalty: 8,
    offRoadPenalty: 5,
  };

  // === Init ===
  async function init() {
    const canvas = document.getElementById('sim-canvas');
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.getElementById('loading-bar-inner');
    const loadingStatus = document.getElementById('loading-status');

    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const urlVehicle = params.get('vehicle');
    if (urlVehicle && VEHICLE_CONFIGS[urlVehicle.toUpperCase()]) vehicleType = urlVehicle.toUpperCase();
    transmission = params.get('transmission') === 'manual' ? 'manual' : 'automatic';
    mapName = 'unified'; // Legacy city/training URLs now open the same connected road.

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87CEEB);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xb9d2df, 85, 300);
    scene.background = new THREE.Color(0xb9d2df);
    // A local procedural sky supplies reflections without an external HDR download.
    const sky = document.createElement('canvas'); sky.width = 256; sky.height = 128;
    const ctx = sky.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, '#a3c8e6'); gradient.addColorStop(.5, '#f2f4f3'); gradient.addColorStop(1, '#617465');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 128);
    const skyTexture = new THREE.CanvasTexture(sky);
    skyTexture.encoding = THREE.sRGBEncoding;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(skyTexture).texture;
    skyTexture.dispose(); pmrem.dispose();

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.name = 'DrivingSun';
    scene.add(dirLight.target);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 300;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.normalBias = .025;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a7d44, 0.3);
    scene.add(hemiLight);

    // Clock
    clock = new THREE.Clock();

    // Input
    keyboard = new InputManager();
    input = keyboard;

    // Audio
    audio = new SimAudio();

    // Track
    track = new CityTrack(scene);
    loadingStatus.textContent = 'Memuat lingkungan perumahan...';
    await track.build(ratio => { loadingBar.style.width = Math.round(ratio * 90) + '%'; });

    collisionWorld = new CollisionWorld();
    for (const [index, collider] of track.colliders.entries()) {
      if (collider.box.max.y > track.roadHeight + .2) {
        // Some decorative signs export planar bounds; preserve them as thin solids.
        const min = collider.box.min.clone(), max = collider.box.max.clone();
        for (const axis of ['x', 'y', 'z']) if (max[axis] - min[axis] < .002) {
          min[axis] -= .001; max[axis] += .001;
        }
        collisionWorld.registerStaticBox('static:' + index + ':' + collider.name, min, max);
      }
    }
    environment = new EnvironmentSystem(scene, renderer, { track });
    simulation.environment = environment;
    environment.setTimeOfDay(params.get('timeOfDay') || 'siang');
    environment.setWeather(params.get('weather') || 'off');
    lights = new VehicleLightSystem(scene);
    horns = new HornSystem(audio);
    pedestrians = new PedestrianSystem(scene, track, collisionWorld);
    traffic = new TrafficSystem(scene, track, collisionWorld, simulation);
    await traffic.init();
    trafficLOD = new TrafficVisualLOD(scene);
    for (const actor of traffic.getVehicles()) attachActorVisuals(actor);

    // HUD
    hud = new HUD(canvas.parentElement || document.body);
    walkingHud = new WalkingHUD(canvas.parentElement || document.body);
    pauseScreen = new PauseScreen(canvas.parentElement || document.body, resumeSimulation);
    pauseScreen.onQuit = returnToSelection;
    finishedScreen = new FinishedScreen(canvas.parentElement || document.body);
    failedScreen = new FailedScreen(canvas.parentElement || document.body);

    // Walking enter button
    walkingHud.onEnterClick(() => {
      if (nearVehicleDoor) enterVehicle();
    });

    // Vehicle select screen
    selectScreen = new VehicleSelectScreen(canvas.parentElement || document.body, startSimulation);

    selectScreen.selectedVehicle = vehicleType;
    selectScreen.selectedTransmission = transmission;
    selectScreen._render();
    installGamepad();
    installEnvironmentControls();
    loadingBar.style.width = '100%';
    const autoStart = params.get('autostart') === '1';
    if (!autoStart) { loadingScreen.style.display = 'none'; selectScreen.show(); }
    camera.position.set(46, 38, 44); camera.lookAt(-5, 0, 0);
    ready = true;
    document.getElementById('map-label').textContent = track.name;
    document.getElementById('sim-reset').addEventListener('click', returnToSelection);
    document.getElementById('sim-fullscreen').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch { hud.showWarning('Layar penuh tidak tersedia di browser ini.'); }
      document.getElementById('sim-canvas').focus();
    });
    window.addEventListener('blur', () => pauseSimulation('Fokus simulator hilang.'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseSimulation('Tab disembunyikan.');
    });

    // Resize
    window.addEventListener('resize', onResize);

    // Automatic entry may precede a user gesture; unlock audio on actual input.
    const unlockAudio = () => { if (audio.ctx?.state === 'suspended') audio.ctx.resume().catch(() => {}); };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // Start render loop
    animate();
    if (autoStart) await startSimulation(vehicleType, transmission, muted);
  }

  function returnToSelection() {
    if (starting || phase === 'entering') return;
    phase = PHASES.SELECT;
    hud.hide(); walkingHud.hide(); pauseScreen.hide();
    finishedScreen.hide(); failedScreen.hide(); audio.silence();
    cockpit?.setMode('TPV');
    accumulator = 0; bufferedEdges = {};
    gamepadRouter?.reset();
    selectScreen.show();
  }

  function attachActorVisuals(actor) {
    lights.registerVehicle(actor);
    const role = actor.type === 'MOTOR' ? 'rider' : actor.type === 'TRUK' ? 'truck_driver' : 'driver';
    const character = CharacterSystem.createCharacter(role, characters.size);
    character.mountToVehicle(actor);
    characters.set(actor.id, character);
    trafficLOD.registerVehicle(actor, character);
  }

  function inputContext() {
    if (gamepadUI?.isOpen) return 'MENU';
    return ({select:'MENU',walking:'ON_FOOT',driving:'DRIVING',paused:'PAUSED',finished:'RESULT',failed:'RESULT'})[phase] || 'MENU';
  }

  function installGamepad() {
    gamepadSettings = new GamepadSettings();
    gamepadAdapter = new GamepadAdapter({settings:gamepadSettings});
    gamepadRouter = new GamepadInputRouter();
    gamepadUI = new GamepadUI({
      onOpen() {
        menuOpenedFrom = phase;
        pauseSimulation('Menu aksi kendaraan terbuka.');
        pauseScreen.hide(); gamepadRouter.reset(); accumulator=0; bufferedEdges={};
      },
      onClose() {
        if(disposed) return;
        gamepadRouter.reset(); accumulator=0; bufferedEdges={};
        if (menuOpenedFrom === PHASES.PAUSED) pauseScreen.show();
        else if (phase === PHASES.PAUSED) resumeSimulation();
        document.getElementById('sim-canvas').focus();
      },
      onAction(name) {
        if (!vehicle || phaseBeforePause !== PHASES.DRIVING) return;
        const command = {[name]:true};
        if (name==='gearUp'||name==='gearDown') {
          const answer=vehicle.requestGearShift(name==='gearUp'?1:-1, !!gamepadSample?.continuous.clutch || gamepadSettings.value.clutchAssist);
          if (!answer.accepted) hud.showWarning(answer.reason);
        } else {
          applyDriverActions(command);
          vehicle.applyActions(command);
        }
        instruments=InstrumentSystem.snapshotFromVehicle(vehicle,environment.getState());
        lights.update(0,environment.getState(),simulation.getVehicles(),vehicle.position);
        cockpit?.update(0,vehicle,instruments,cameraLook); hud.update(vehicle,instruments);
      },
      onSettings(patch) {
        try { if(patch.reset) gamepadSettings.reset(); else gamepadSettings.update(patch); }
        catch(error) { hud.showWarning(error.message); return false; }
        vehicle?.setHandling(gamepadSettings.value);
        gamepadAdapter.reset('settings'); gamepadRouter.reset();
      },
      onDevice(index) { gamepadAdapter.select(index);gamepadRouter.reset(); }
    });
    window.addEventListener('pagehide', event => {
      if(event.persisted) { pauseSimulation('Halaman dijeda.');return; }
      disposed=true; gamepadAdapter.dispose();gamepadUI.dispose();keyboard.destroy();audio.silence();
    });
  }

  function pauseSimulation(reason) {
    gamepadRouter?.reset(); accumulator=0; bufferedEdges={};
    keyboard?._onBlur();
    if (phase===PHASES.DRIVING || phase===PHASES.WALKING || phase===PHASES.SELECT) {
      phaseBeforePause=phase; phase=PHASES.PAUSED; audio.silence(); pauseScreen.show();
      if(reason) hud.showWarning(reason + ' Lepaskan trigger/analog sebelum melanjutkan.');
    }
  }

  function installEnvironmentControls() {
    const panel = document.createElement('fieldset');
    panel.id = 'environment-controls';
    panel.innerHTML = '<legend>Lingkungan</legend><label>Waktu <select id="environment-time"><option value="pagi">Pagi</option><option value="siang">Siang</option><option value="sore">Sore</option><option value="malam">Malam</option></select></label><label>Cuaca <select id="environment-weather"><option value="off">Cerah</option><option value="light">Hujan ringan</option><option value="heavy">Hujan deras</option></select></label>';
    document.body.appendChild(panel);
    const timeSelect = panel.querySelector('#environment-time');
    const weatherSelect = panel.querySelector('#environment-weather');
    const state = environment.getState();
    timeSelect.value = state.timeOfDay; weatherSelect.value = state.weather;
    timeSelect.addEventListener('change', () => environment.setTimeOfDay(timeSelect.value));
    weatherSelect.addEventListener('change', () => environment.setWeather(weatherSelect.value));
  }

  // === Resize ===
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // === Start Simulation ===
  async function startSimulation(type, trans, isMuted) {
    if (starting) return;
    starting = true;
    attemptId = crypto.randomUUID();
    phase = PHASES.SELECT;
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.display = 'flex';
    document.getElementById('loading-status').textContent = 'Memuat ' + VEHICLE_CONFIGS[type].label + '...';
    vehicleType = type;
    transmission = trans;
    muted = isMuted;
    audio.init();
    audio.setMuted(muted);

    // Create vehicle
    if (vehicle) {
      cockpit?.dispose(); cockpit = null;
      characters.get('player')?.dispose(); characters.delete('player');
      lights.unregisterVehicle('player');
      collisionWorld.unregisterBody('player'); simulation.unregister('player');
      vehicle.dispose();
    }
    document.getElementById('loading-bar-inner').style.width = '0%';
    vehicle = new Vehicle(scene, vehicleType, transmission, ratio => {
      document.getElementById('loading-bar-inner').style.width = Math.round(ratio * 100) + '%';
    });
    vehicle.setHandling(gamepadSettings.value);
    try { await vehicle.ready; }
    catch (error) { starting = false; showError(error); return; }

    // Position at road start
    const spawnPos = track.getVehicleStartPosition();
    const demo = new URLSearchParams(location.search).get('demo');
    if (demo === 'intersection') spawnPos.z = -65;
    if (demo === 'long-road') spawnPos.z = -155;
    if (demo === 'training-intersection') spawnPos.z = -385;
    vehicle.position.copy(spawnPos);
    vehicle.rotation = 0;
    vehicle.id = 'player';
    vehicle._updateMeshPosition();
    vehicle.timeStarted = Date.now();
    track.resetTraffic();
    collisionWorld.registerBody(vehicle.id, vehicle, vehicle.config.dimensions);
    simulation.register(vehicle);
    pedestrians.reset();
    traffic.reset(vehicle);
    attachActorVisuals(vehicle);
    cockpit = new CockpitSystem(scene, camera);
    cockpit.attachToVehicle(vehicle, characters.get('player'));
    cockpit.setMode('TPV');
    simulation.resetClock(); accumulator = 0; bufferedEdges = {};
    lastCollisionTime = -Infinity;
    offRoadWarningTimer = 0; seatbeltWarningTimer = 0; lastViolationTime = 0;

    // Start in walking phase
    phase = PHASES.WALKING;
    walkingPosition.set(spawnPos.x - 2.5, 1.6, spawnPos.z + 2.5);
    walkingRotation = 0;

    walkingHud.show();
    walkingHud.setShowEnterButton(false);
    hud.hide();
    cameraMode = 0;
    cameraLook.yaw = 0; cameraLook.pitch = 0; cameraLookActive = false;

    // Camera follows walking character
    camera.position.set(walkingPosition.x, walkingPosition.y + 1.5, walkingPosition.z + 4);
    camera.lookAt(walkingPosition);
    starting = false;
    loadingScreen.style.display = 'none';
    document.getElementById('sim-canvas').focus();
  }

  // === Animation Loop ===
  function animate() {
    if(disposed) return;
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), .25);
    keyboard.update();
    if ((document.hidden || !document.hasFocus()) && (phase===PHASES.DRIVING || phase===PHASES.WALKING))
      pauseSimulation('Fokus simulator hilang.');
    gamepadSample=gamepadAdapter.poll(dt);
    if (gamepadSample.lost && (phase===PHASES.DRIVING || phase===PHASES.WALKING)) pauseSimulation('Controller terputus atau berubah.');
    gamepadFrame=gamepadRouter.update(DomainInput.keyboard(keyboard),gamepadSample,{
      context:inputContext(),dt,now:performance.now(),focused:!document.hidden && document.hasFocus()
    });
    if(gamepadFrame.source==='gamepad') {
      const e=gamepadFrame.edges,c=gamepadFrame.continuous;
      if(transmission==='automatic') {
        e.selectDrive=!!e.gearUp;e.selectReverse=!!e.gearDown;
        delete e.gearUp;delete e.gearDown;
      } else if(gamepadSettings.value.clutchAssist && (e.gearUp||e.gearDown||vehicle?.speed<.5&&!c.throttle)) c.clutch=true;
      if(phase===PHASES.WALKING) {
        c.throttle=Math.max(c.throttle,Math.max(0,c.walk||0));
        c.brakeAmount=Math.max(c.brakeAmount,Math.max(0,-(c.walk||0)));
      }
    }
    gamepadUI.update({status:gamepadSample.status,message:gamepadSample.message,
      source:gamepadFrame.source,device:gamepadSample.device,devices:gamepadSample.devices,
      neutralGate:gamepadFrame.neutralGate,phase,vehicleType,transmission,settings:gamepadSettings.value});
    const toggledMenu=!!gamepadFrame.edges.menu;
    if(toggledMenu) gamepadUI.isOpen?gamepadUI.close():gamepadUI.open();
    if(gamepadFrame.edges.pause && gamepadUI.isOpen) {
      menuOpenedFrom=PHASES.PAUSED; gamepadUI.close(); pauseScreen.show();
      delete gamepadFrame.edges.pause; // Consume here; never resume again in the same frame.
    }
    if(gamepadUI.isOpen && !toggledMenu) gamepadUI.handle(gamepadFrame.navigation);
    else if(gamepadFrame.source==='gamepad' && ['MENU','RESULT'].includes(inputContext())) {
      const container=phase===PHASES.SELECT?selectScreen.element:phase===PHASES.FINISHED?finishedScreen.element:failedScreen.element;
      if(container) gamepadUI.handlePage(gamepadFrame.navigation,container);
    }
    input=new DomainInput(gamepadFrame);
    DomainInput.accumulateEdges(bufferedEdges, input.justPressed);
    if (keyboard.wasJustPressed('F2')) track.toggleDebug(vehicle?.position || walkingPosition);
    if (phase === PHASES.PAUSED) {
      if (input.pause && !gamepadUI.isOpen) { pauseScreen.hide(); resumeSimulation(); }
      bufferedEdges = {}; accumulator = 0;
    } else if ((phase === PHASES.DRIVING || phase===PHASES.WALKING) && input.pause) {
      pauseSimulation();
      bufferedEdges = {}; accumulator = 0;
    } else {
      accumulator = Math.min(accumulator + dt, simulation.clock.fixedDt * 5);
    }
    let stepped = 0;
    while (accumulator + 1e-10 >= simulation.clock.fixedDt && phase !== PHASES.PAUSED && !gamepadUI.isOpen) {
      input.justPressed = bufferedEdges; bufferedEdges = {};
      const fixedDt = simulation.clock.fixedDt;
      simulation.step();
      for (const junction of track.intersections) {
        junction.controller.update(fixedDt); junction.publish();
        if (junction.debugElement && !junction.debugElement.hidden) junction.debugElement.textContent = JSON.stringify(junction.snapshot(), null, 2);
      }
      if (phase === PHASES.DRIVING || phase === PHASES.WALKING) {
        pedestrians.update(fixedDt, simulation.getVehicles());
      }
      if (phase === PHASES.WALKING) { updateWalking(fixedDt); resolveMotion(fixedDt); }
      else if (phase === PHASES.DRIVING) {
        if(gamepadRouter.gated) {
          // Neutral re-arm halts only the player. AI, signals and environment
          // still tick after an explicit resume; no implicit manual clutch drop.
          vehicle.speed=0;vehicle.braking=true;
          vehicle._updateRPM({forward:false});audio.updateEngine(vehicle.rpm,vehicle.engineOn);
          resolveMotion(fixedDt);
        } else updateDriving(fixedDt);
      }
      else if (phase === PHASES.SELECT) resolveMotion(fixedDt);
      updateActorVisuals(fixedDt);
      accumulator -= fixedDt; stepped += fixedDt;
    }
    environment.update(stepped, camera, { cockpit: phase === PHASES.DRIVING && CAMERA_MODES[cameraMode] === 'FPV', vehicleType });
    document.getElementById('environment-controls').hidden = ![PHASES.SELECT, PHASES.PAUSED].includes(phase);
    // Render-only visibility: bodies remain registered and planning even when culled.
    trafficLOD.update(camera.position);
    renderer.render(scene, camera);
  }

  function resolveMotion(dt, playerProposal) {
    const proposals = traffic.plan(dt, environment.getState(), pedestrians);
    proposals.push(...pedestrians.getMotionProposals());
    if (playerProposal) proposals.push(playerProposal);
    const resolved = collisionWorld.resolve(proposals, dt);
    traffic.commit(resolved, dt);
    pedestrians.commit(resolved, dt);
    if (playerProposal) vehicle.commitMotion(resolved.get('player'), dt);
    return resolved.get('player');
  }

  function updateActorVisuals(dt) {
    const actors = simulation.getVehicles();
    lights.update(dt, environment.getState(), actors, vehicle?.position || walkingPosition);
    for (const actor of actors) {
      if (actor.hornRequested) { horns.trigger(actor, simulation.clock.elapsed); actor.hornRequested = false; }
      const character = characters.get(actor.id);
      character?.update(dt, { state: actor.type === 'MOTOR' ? 'riding' : 'driving', speed: actor.speed, steering: actor.steerAngle });
      character?.setLOD(actor.position.distanceTo(camera.position));
    }
    if (vehicle && phase === PHASES.DRIVING) {
      instruments = InstrumentSystem.snapshotFromVehicle(vehicle, environment.getState());
      vehicle.instrumentSnapshot = instruments;
      updateCamera(dt);
      cockpit.setMode(CAMERA_MODES[cameraMode]);
      cockpit.update(dt, vehicle, instruments, cameraLook);
      hud.update(vehicle, instruments);
    }
  }

  // === Walking Phase ===
  function updateWalking(dt) {
    const moveSpeed = 5;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0), walkingRotation
    );

    if (input.forward) walkingPosition.addScaledVector(forward, moveSpeed * dt);
    if (input.backward) walkingPosition.addScaledVector(forward, -moveSpeed * dt);
    if (input.left) walkingRotation += 2 * dt;
    if (input.right) walkingRotation -= 2 * dt;

    // Clamp to area
    walkingPosition.x = THREE.MathUtils.clamp(walkingPosition.x, -64, 64);
    walkingPosition.z = THREE.MathUtils.clamp(walkingPosition.z, -464, 30);

    // Camera follow
    const camOffset = new THREE.Vector3(0, 1.5, 4).applyAxisAngle(
      new THREE.Vector3(0, 1, 0), walkingRotation
    );
    camera.position.lerp(walkingPosition.clone().add(camOffset), 5 * dt);
    camera.lookAt(walkingPosition.x, walkingPosition.y, walkingPosition.z);

    // Check proximity to vehicle
    const vehiclePos = vehicle.position.clone();
    vehiclePos.y = 1.6;
    const dist = walkingPosition.distanceTo(vehiclePos);
    nearVehicleDoor = dist < 5;
    walkingHud.setShowEnterButton(nearVehicleDoor);

    if (nearVehicleDoor && input.enterVehicle) {
      enterVehicle();
    }
  }

  // === Enter Vehicle ===
  async function enterVehicle() {
    if (phase !== PHASES.WALKING) return;
    phase = 'entering';
    walkingHud.hide();
    await walkingHud.playDoorAnimation();

    phase = PHASES.DRIVING;
    document.getElementById('sim-canvas').focus();
    hud.show();
    hud.setCameraMode(CAMERA_MODES[cameraMode]);

    // Show engine reminder
    setTimeout(() => {
      if (!vehicle.engineOn && phase === PHASES.DRIVING) {
        hud.showWarning('Tekan [I] untuk menyalakan mesin', 5000);
      }
    }, 1500);
  }

  function applyDriverActions(actions) {
    // Camera toggle
    if (actions.camera) {
      cameraMode = (cameraMode + 1) % CAMERA_MODES.length;
      cameraLook.yaw = 0; cameraLook.pitch = 0;
      // An explicit mode change wins over a stick already held this tick.
      cameraLookActive = !!(input?.lookX || input?.lookY);
      hud.setCameraMode(CAMERA_MODES[cameraMode]);
    }

    // Ignition
    if (actions.ignition) {
      if (!vehicle.engineOn && vehicle.enginePhase !== 'STARTING') {
        vehicle.startEngine();
        audio.resume();
        hud.showWarning('Mesin dinyalakan!', 2000, 'rgba(5,150,105,0.9)');
        setTimeout(() => {
          if (phase === PHASES.DRIVING) {
            hud.showWarning('Lepas rem tangan [Space] dan injak gas [W]!', 3000);
          }
        }, 2500);
      } else if (vehicle.engineOn) {
        vehicle.startEngine(); // toggles off
        audio.silence();
      }
    }

    // Handbrake toggle
    if (actions.handbrake && vehicle.engineOn) {
      vehicle.handbrakeOn = !vehicle.handbrakeOn;
    }

    // Horn
    if (actions.horn) {
      horns.trigger(vehicle, simulation.clock.elapsed);
    }

    if (actions.selectDrive || actions.selectReverse) {
      const answer = vehicle.requestDriveDirection(actions.selectReverse ? -1 : 1,
        gamepadSample?.continuous.brakeAmount || 0);
      if (!answer.accepted) hud.showWarning(answer.reason);
    }
  }

  // === Driving Phase ===
  function updateDriving(dt) {
    // Pause
    if (input.pause) {
      pauseSimulation();
      return;
    }

    applyDriverActions(input);

    // Update vehicle physics
    const before = vehicle.position.clone();
    const onRoad = isOnRoad(vehicle.position);
    vehicle.roadGripFactor = environment.getState().roadGripFactor;
    const proposal = vehicle.planMotion(input, dt, onRoad);
    const result = proposal.result;
    // Keep the legacy road envelope as a boundary guard; solid geometry is swept by the shared world.
    const boundary = track.collisionAt?.({ config: vehicle.config, position: proposal.position, rotation: proposal.rotation });
    if (boundary === 'Batas area') { proposal.position = before.clone(); proposal.rotation = vehicle.rotation; }
    const motion = resolveMotion(dt, proposal);
    const obstacle = boundary === 'Batas area' ? boundary : motion?.blocked && motion.contactKind !== 'pedestrian' ? motion.contactId : null;
    if (obstacle) {
      if (vehicle.timeElapsed - lastCollisionTime > 2) {
        vehicle.obstaclesHit++; vehicle.violations++; lastCollisionTime = vehicle.timeElapsed;
        hud.showWarning('Terhalang objek. Mundur [R], lalu cari ruang untuk berbelok.', 2500);
      }
    }

    // Audio feedback
    if (result === 'gear_grind') {
      audio.playGearGrind();
      hud.showWarning('⚠ Oper gigi tanpa kopling!', 1500, 'rgba(239,68,68,0.9)');
    } else if (result === 'stall') {
      audio.playStallThud();
      hud.showWarning('❌ Mesin mati (stall)!', 3000, 'rgba(239,68,68,0.9)');
    }

    // Update engine audio
    audio.updateEngine(vehicle.rpm, vehicle.engineOn);

    // Tire skid on hard braking
    if (input.brake && Math.abs(vehicle.speed) > 5) {
      audio.playTireSkid(Math.abs(vehicle.speed) / vehicle.config.topSpeed);
    }

    // Off-road detection
    const isOffRoad = !isOnRoad(vehicle.position);
    if (isOffRoad && Math.abs(vehicle.speed) > 2) {
      offRoadWarningTimer += dt;
      if (offRoadWarningTimer > 0.5) {
        vehicle.offRoadCount++;
        offRoadWarningTimer = 0;
      }
      hud.showOffRoadWarning(true);
    } else {
      hud.showOffRoadWarning(false);
      offRoadWarningTimer = 0;
    }

    // Seatbelt check
    if (vehicle.engineOn && !(vehicle.type === 'MOTOR' ? vehicle.helmetOn : vehicle.seatbeltOn) && vehicle.getSpeedKmh() > 20) {
      seatbeltWarningTimer += dt;
      if (seatbeltWarningTimer > 2) {
        vehicle.violations++;
        seatbeltWarningTimer = 0;
        hud.showWarning(vehicle.type === 'MOTOR' ? 'Helm belum dipakai! Tekan [H].' : 'Sabuk pengaman belum dipasang! Tekan [B].', 2000, 'rgba(239,68,68,0.9)');
      }
      hud.showSeatbeltWarning(true);
    } else {
      hud.showSeatbeltWarning(false);
      seatbeltWarningTimer = 0;
    }

    // Traffic light violation (running red light)
    const tlState = track.getTrafficLightState();
    const crossedRed = track.crossedRed ? track.crossedRed(before, vehicle)
      : tlState === 'red' && vehicle.getSpeedKmh() > 5 && before.z > -75 && vehicle.position.z <= -75;
    if (crossedRed) {
      const now = Date.now();
      if (now - lastViolationTime > 5000) { // throttle violations
        vehicle.violations++;
        lastViolationTime = now;
        hud.showWarning('⚠ Menerobos lampu merah!', 2000, 'rgba(239,68,68,0.9)');
      }
    }

    // Pedestrian collision → instant fail
    if (pedestrians.checkCollision?.(vehicle.position, 2)) {
      vehicle.pedestrianHits++;
      failSimulation('Kecelakaan dengan pejalan kaki!');
      return;
    }

    updateChecklist();

    // Check finish line
    if (track.hasFinished ? track.hasFinished(vehicle) : vehicle.position.z <= TRACK_CONFIG.FINISH_Z && vehicle.speed > 0) {
      finishSimulation();
    }
  }

  function isOnRoad(position) {
    if (track.isOnRoad) return track.isOnRoad(position);
    const center = track.getIdealLinePoint(position.z);
    return Math.abs(position.x - center.x) <= TRACK_CONSTANTS.ROAD_HALF_WIDTH;
  }

  function showError(error) {
    console.error(error);
    document.getElementById('loading-screen').style.display = 'flex';
    const status = document.getElementById('loading-status');
    status.setAttribute('role', 'alert');
    status.textContent = error.message || 'Simulasi tidak dapat dimuat. Pastikan WebGL tersedia.';
    document.getElementById('loading-retry').hidden = false;
  }

  // Read-only diagnostics used to verify the actual renderer and driving state.
  window.kemudiSimulation = Object.freeze({ snapshot: () => ({
    ready, phase, map: mapName, vehicle: vehicle?.type, loaded: vehicle?.modelLoaded,
    equipment: vehicle && {seatbelt:vehicle.seatbeltOn,helmet:vehicle.helmetOn,
      jacket:vehicle.jacketOn,gloves:vehicle.glovesOn,shoes:vehicle.shoesOn},
    gamepad: gamepadFrame && {source:gamepadFrame.source,status:gamepadSample?.status,
      neutralGate:gamepadFrame.neutralGate,continuous:{...gamepadFrame.continuous},
      selectedIndex:gamepadSample?.device?.index,menuOpen:gamepadUI?.isOpen},
    intersection: track?.intersection?.snapshot(),
    intersections: track?.intersections?.map(j=>j.snapshot()),
    position: vehicle?.position.toArray(), speed: vehicle?.speed, gear: vehicle?.gear,
    rotation: vehicle?.rotation, steerAngle: vehicle?.steerAngle,
    handling: vehicle && { ...vehicle.handling },
    navigationTarget: vehicle && traffic?.routes.spineNorth.sample(traffic.routes.spineNorth.project(vehicle.position) + 6).position.toArray(),
    engine: vehicle?.engineOn, handbrake: vehicle?.handbrakeOn,
    seatAdjusted: vehicle?.seatAdjusted, mirrorChecked: vehicle?.mirrorChecked,
    lights: vehicle && {
      headlights: vehicle.headlights.map(l => l.material.emissiveIntensity),
      brakes: vehicle.taillights.map(l => l.material.emissiveIntensity),
      indicators: vehicle.indicators.map(l => ({ name: l.name, intensity: l.material.emissiveIntensity })),
      hazard: vehicle.hazardOn, left: vehicle.signalLeft, right: vehicle.signalRight,
    },
    camera: CAMERA_MODES[cameraMode], cameraLook: { ...cameraLook },
    cameraPose: camera && {position:camera.position.toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray()},
    wheels: vehicle?.wheels.map(w => ({ name: w.mesh.name, spin: w.mesh.rotation.x, steer: w.pivot.rotation.y })),
    clock: { ...simulation.clock }, environment: environment?.getState(),
    instruments, cockpit: cockpit?.snapshot?.(),
    traffic: traffic?.getVehicles().map(v => ({ id: v.id, type: v.type, active: v.active, loaded: v.modelLoaded, groupVisible: v.group.visible, position: v.position.toArray(), rotation: v.rotation, speed: v.speed, braking: v.braking, reason: v.stopReason, lights: v.lightState })),
    pedestrians: pedestrians?.getActiveAgents().map(p => ({ id: p.id, position: (p.position || p.group.position).toArray(), crossing: p.crossing })),
    resources: { geometries: renderer?.info.memory.geometries, textures: renderer?.info.memory.textures },
    trafficLOD: trafficLOD?.snapshot(),
    characters: { count: characters.size, mountedIds: [...characters.keys()], playerRole: characters.get('player')?.group.name, headVisible: characters.get('player')?.head.visible },
    exteriorVisible: vehicle?.model?.visible,
    audio: { state: audio?.ctx?.state, activeHornVoices: audio?.activeHornVoices, lastPlayerHorn: horns?.lastPlayed.get('player') },
    drawCalls: renderer?.info.render.calls, triangles: renderer?.info.render.triangles,
    elapsed: vehicle?.timeElapsed,
  }) });

  // === Camera ===
  function updateCamera(dt) {
    if (!vehicle) return;

    const lookActive = input.analog && !gamepadRouter.gated && !!(input.lookX || input.lookY);
    if (lookActive && !cameraLookActive && cameraMode !== 1) {
      cameraMode = 1;
      cameraLook.yaw = 0; cameraLook.pitch = 0;
      hud.setCameraMode('FPV');
    }
    cameraLookActive = lookActive;
    if (lookActive && cameraMode === 1) {
      // Fixed-tick angular velocity: right/down stick means right/down view.
      cameraLook.yaw = THREE.MathUtils.clamp(cameraLook.yaw - input.lookX * 1.8 * dt, -Math.PI * 5/9, Math.PI * 5/9);
      cameraLook.pitch = THREE.MathUtils.clamp(cameraLook.pitch - input.lookY * 1.3 * dt, -Math.PI * 11/36, Math.PI * 11/36);
    }
    const vehPos = vehicle.position;
    const forward = vehicle.getForwardDirection();

    switch (CAMERA_MODES[cameraMode]) {
      case 'TPV': {
        // Chase camera behind vehicle
        const dist = vehicle.type === 'TRUK' ? 13 : vehicle.type === 'MOBIL' ? 8 : 5;
        const height = vehicle.type === 'TRUK' ? 5 : vehicle.type === 'MOBIL' ? 3 : 2.5;
        const behind = forward.clone().multiplyScalar(dist);
        behind.y = 0;
        const targetPos = vehPos.clone().sub(behind);
        targetPos.y = vehPos.y + height;
        camera.position.lerp(targetPos, 4 * dt);

        const lookTarget = vehPos.clone();
        lookTarget.y += 1;
        camera.lookAt(lookTarget);
        break;
      }
      case 'FPV': {
        // CockpitSystem applies driver-eye position, look and mirror together.
        break;
      }
      case 'TopDown': {
        // Top-down view
        const junction = track.nearestIntersection(vehPos)?.definition.center;
        const focus = junction && vehPos.distanceTo(junction) < 35 ? junction : vehPos;
        camera.position.set(focus.x, focus.y + (focus === junction ? 48 : 30), focus.z);
        camera.lookAt(focus);
        break;
      }
    }
  }

  // === Pause ===
  function resumeSimulation() {
    if (phase === PHASES.PAUSED) {
      phase = phaseBeforePause;
      gamepadRouter?.reset();
      accumulator = 0; bufferedEdges = {};
      clock.getDelta();
      audio.resume();
      document.getElementById('sim-canvas').focus();
    }
  }

  // === Finish ===
  function finishSimulation() {
    phase = PHASES.FINISHED;
    hud.hide();
    audio.silence();

    const score = calculateScore();
    const stats = {
      score,
      time: vehicle.timeElapsed.toFixed(1),
      violations: vehicle.violations,
      offRoad: vehicle.offRoadCount,
      timePenalty: Math.max(0, Math.round(vehicle.timeElapsed - PAR_TIME)),
    };

    finishedScreen.show(stats).then(action => {
      finishedScreen.hide();
      if (action === 'retry') {
        startSimulation(vehicleType, transmission, muted);
      } else if (action === 'change') {
        phase = PHASES.SELECT;
        selectScreen.show();
      }
    });
    attachResultSaving(finishedScreen.element, buildResult(true));
  }

  // === Fail ===
  function failSimulation(reason) {
    phase = PHASES.FAILED;
    hud.hide();
    audio.silence();

    failedScreen.show(reason).then(action => {
      failedScreen.hide();
      if (action === 'retry') {
        startSimulation(vehicleType, transmission, muted);
      } else if (action === 'change') {
        phase = PHASES.SELECT;
        selectScreen.show();
      }
    });
    attachResultSaving(failedScreen.element, buildResult(false));
  }

  function buildResult(completed) {
    return {
      attemptId, vehicleType: vehicle.type, score: completed ? calculateScore() : 0,
      timeTakenMs: Math.round(vehicle.timeElapsed * 1000),
      violations: vehicle.violations, offRoadCount: vehicle.offRoadCount,
      collisionCount: vehicle.obstaclesHit + vehicle.pedestrianHits, completed
    };
  }

  // === Score ===
  function calculateScore() {
    let score = SCORE_CONFIG.maxScore;
    score -= vehicle.violations * SCORE_CONFIG.violationPenalty;
    score -= vehicle.offRoadCount * SCORE_CONFIG.offRoadPenalty;
    score -= Math.max(0, Math.round(vehicle.timeElapsed - PAR_TIME)) * 1;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // === Checklist ===
  function updateChecklist() {
    if (!vehicle || phase !== PHASES.DRIVING) return;

    const items = [];

    // Engine
    items.push({ label: 'Nyalakan mesin [I]', done: vehicle.engineOn });

    // Seatbelt
    if (vehicle.type !== 'MOTOR') items.push({ label: 'Sabuk pengaman [B]', done: vehicle.seatbeltOn });

    // Handbrake
    items.push({ label: 'Lepas rem tangan [Space]', done: !vehicle.handbrakeOn });

    // Vehicle-specific
    if (vehicle.type === 'MOTOR') {
      items.push({ label: 'Helm [H]', done: vehicle.helmetOn });
      items.push({ label: 'Jaket [J]', done: vehicle.jacketOn });
      items.push({ label: 'Sarung tangan [G]', done: vehicle.glovesOn });
      items.push({ label: 'Sepatu [F]', done: vehicle.shoesOn });
    } else {
      items.push({ label: 'Atur kursi [ / ]', done: vehicle.seatAdjusted });
      items.push({ label: 'Tengok belakang [M] di kamera kabin [C]', done: vehicle.mirrorChecked });
    }

    // Manual transmission
    if (transmission === 'manual') {
      items.push({ label: 'Gigi 1 [E]', done: vehicle.gear >= 1 });
    }

    // Only show checklist if not all done
    const allDone = items.every(i => i.done);
    hud.updateChecklist(allDone ? [] : items);
  }

  // === Boot ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(showError));
  } else {
    init().catch(showError);
  }
})();
