/**
 * Kemudi.id — Three.js Vehicle Showcase
 * Renders a rotating 3D vehicle preview for the Simulasi page.
 * Usage: <canvas id="vehicle-showcase"></canvas> + load this script.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('vehicle-showcase');
  if (!canvas || typeof THREE === 'undefined') return;

  // ── Config ──
  const VEHICLES = {
    MOTOR: { color: 0xf97316, speed: 1.2, scale: 1 },
    MOBIL: { color: 0x3b82f6, speed: 0.8, scale: 1.1 },
    TRUK:  { color: 0x16a34a, speed: 0.6, scale: 1.3 },
  };

  let currentVehicle = 'MOBIL';

  // ── Scene ──
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 2, 6);
  camera.lookAt(0, 0.5, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;

  // ── Lights ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const mainLight = new THREE.DirectionalLight(0xffffff, 1);
  mainLight.position.set(5, 8, 5);
  mainLight.castShadow = true;
  scene.add(mainLight);

  const rimLight = new THREE.PointLight(0x2563eb, 0.8, 20);
  rimLight.position.set(-3, 3, -3);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0x60a5fa, 0.4, 15);
  fillLight.position.set(3, 1, 4);
  scene.add(fillLight);

  // ── Ground ──
  const groundGeo = new THREE.CircleGeometry(5, 64);
  const groundMat = new THREE.MeshPhongMaterial({
    color: 0x111827,
    transparent: true,
    opacity: 0.3,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Ground Ring ──
  const ringGeo = new THREE.RingGeometry(4.5, 5, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  // ── Vehicle Group ──
  let vehicleGroup = new THREE.Group();
  scene.add(vehicleGroup);

  function createMotor(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 100 });
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x1f2937, shininess: 80 });
    const chromeMat = new THREE.MeshPhongMaterial({ color: 0xc0c0c0, shininess: 200, specular: 0xffffff });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.8), mat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.7), darkMat);
    seat.position.set(0, 0.95, -0.1);
    seat.castShadow = true;
    group.add(seat);

    // Tank
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 16), mat);
    tank.position.set(0, 0.85, 0.3);
    tank.castShadow = true;
    group.add(tank);

    // Handlebar
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.1, 0.9);
    group.add(bar);

    // Front wheel
    const wheelGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 24);
    const wheel1 = new THREE.Mesh(wheelGeo, darkMat);
    wheel1.rotation.y = Math.PI / 2;
    wheel1.position.set(0, 0.25, 0.8);
    group.add(wheel1);

    // Rear wheel
    const wheel2 = new THREE.Mesh(wheelGeo, darkMat);
    wheel2.rotation.y = Math.PI / 2;
    wheel2.position.set(0, 0.25, -0.8);
    group.add(wheel2);

    // Headlight
    const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7 }));
    headlight.position.set(0, 0.8, 1);
    group.add(headlight);

    // Exhaust
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8), chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.3, 0.35, -0.5);
    group.add(exhaust);

    return group;
  }

  function createMobil(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 120 });
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x1f2937, shininess: 80 });
    const glassMat = new THREE.MeshPhongMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.4, shininess: 200 });
    const chromeMat = new THREE.MeshPhongMaterial({ color: 0xc0c0c0, shininess: 200, specular: 0xffffff });

    // Body lower
    const bodyLower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 3), mat);
    bodyLower.position.y = 0.5;
    bodyLower.castShadow = true;
    group.add(bodyLower);

    // Body upper (cabin)
    const bodyUpper = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.6), mat);
    bodyUpper.position.set(0, 0.95, -0.2);
    bodyUpper.castShadow = true;
    group.add(bodyUpper);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 0.05), glassMat);
    windshield.position.set(0, 0.95, 0.55);
    windshield.rotation.x = -0.3;
    group.add(windshield);

    // Rear window
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.05), glassMat);
    rearWindow.position.set(0, 0.95, -0.95);
    rearWindow.rotation.x = 0.2;
    group.add(rearWindow);

    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.2, 0.12, 0.05);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(-0.6, 0.55, 1.52);
    group.add(hl1);
    const hl2 = hl1.clone();
    hl2.position.x = 0.6;
    group.add(hl2);

    // Taillights
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(hlGeo, tlMat);
    tl1.position.set(-0.6, 0.55, -1.52);
    group.add(tl1);
    const tl2 = tl1.clone();
    tl2.position.x = 0.6;
    group.add(tl2);

    // Wheels
    const wheelGeo = new THREE.TorusGeometry(0.25, 0.1, 8, 24);
    const positions = [[-0.85, 0.25, 1], [0.85, 0.25, 1], [-0.85, 0.25, -1], [0.85, 0.25, -1]];
    positions.forEach(p => {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.y = Math.PI / 2;
      w.position.set(...p);
      group.add(w);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), chromeMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(...p);
      group.add(hub);
    });

    // Side mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.12, 0.08, 0.08);
    const m1 = new THREE.Mesh(mirrorGeo, darkMat);
    m1.position.set(-0.9, 0.85, 0.4);
    group.add(m1);
    const m2 = m1.clone();
    m2.position.x = 0.9;
    group.add(m2);

    return group;
  }

  function createTruk(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 100 });
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x1f2937, shininess: 80 });
    const metalMat = new THREE.MeshPhongMaterial({ color: 0x9ca3af, shininess: 80 });
    const glassMat = new THREE.MeshPhongMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.4, shininess: 200 });

    // Cargo box
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 2.5), metalMat);
    cargo.position.set(0, 1.1, -0.3);
    cargo.castShadow = true;
    group.add(cargo);

    // Cargo top edge
    const edge = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 2.55), darkMat);
    edge.position.set(0, 1.72, -0.3);
    group.add(edge);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.2), mat);
    cabin.position.set(0, 0.9, 1.1);
    cabin.castShadow = true;
    group.add(cabin);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.05), glassMat);
    windshield.position.set(0, 1.0, 1.72);
    windshield.rotation.x = -0.15;
    group.add(windshield);

    // Bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.1), darkMat);
    bumper.position.set(0, 0.35, 1.8);
    group.add(bumper);

    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.25, 0.15, 0.05);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(-0.65, 0.55, 1.72);
    group.add(hl1);
    const hl2 = hl1.clone();
    hl2.position.x = 0.65;
    group.add(hl2);

    // Wheels (6 wheels for truck)
    const wheelGeo = new THREE.TorusGeometry(0.3, 0.12, 8, 24);
    const wheelPositions = [
      [-1, 0.3, 1.2], [1, 0.3, 1.2],
      [-1, 0.3, -0.5], [1, 0.3, -0.5],
      [-1, 0.3, -1.2], [1, 0.3, -1.2],
    ];
    wheelPositions.forEach(p => {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.y = Math.PI / 2;
      w.position.set(...p);
      group.add(w);
    });

    // Exhaust stack
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), metalMat);
    exhaust.position.set(0.9, 1.5, -1.4);
    group.add(exhaust);

    return group;
  }

  function buildVehicle(type) {
    // Remove old
    while (vehicleGroup.children.length) {
      const child = vehicleGroup.children[0];
      vehicleGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    const config = VEHICLES[type] || VEHICLES.MOBIL;
    let model;
    switch (type) {
      case 'MOTOR': model = createMotor(config.color); break;
      case 'TRUK':  model = createTruk(config.color); break;
      default:      model = createMobil(config.color); break;
    }

    vehicleGroup = model;
    vehicleGroup.scale.setScalar(config.scale);
    scene.add(vehicleGroup);
  }

  buildVehicle(currentVehicle);

  // ── Expose to Blazor ──
  window.vehicleShowcase = {
    setVehicle(type) {
      if (type && type !== currentVehicle) {
        currentVehicle = type;
        buildVehicle(type);
      }
    }
  };

  // ── Mouse interaction ──
  let isDragging = false;
  let prevMouseX = 0;
  let rotationY = 0;

  canvas.addEventListener('mousedown', (e) => { isDragging = true; prevMouseX = e.clientX; });
  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouseX;
    rotationY += dx * 0.01;
    prevMouseX = e.clientX;
  });
  canvas.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mouseleave', () => { isDragging = false; });

  // ── Animation ──
  let frameId;
  const clock = new THREE.Clock();

  function animate() {
    frameId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const config = VEHICLES[currentVehicle] || VEHICLES.MOBIL;

    // Auto rotate + drag
    vehicleGroup.rotation.y = rotationY + t * config.speed * 0.3;

    // Subtle float
    vehicleGroup.position.y = Math.sin(t * 1.5) * 0.05;

    // Ring pulse
    ring.material.opacity = 0.1 + Math.sin(t * 2) * 0.05;

    // Rim light color pulse
    const hue = (t * 0.05) % 1;
    rimLight.color.setHSL(hue, 0.7, 0.5);

    renderer.render(scene, camera);
  }

  animate();

  // ── Resize ──
  function onResize() {
    if (!canvas.parentElement) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frameId);
    else animate();
  });
})();
