/**
 * Kemudi.id — Three.js Animated Background
 * Creates floating geometric particles for hero/landing sections.
 * Usage: <canvas id="three-bg"></canvas> + load this script.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('three-bg');
  if (!canvas || typeof THREE === 'undefined') return;

  // ── Scene Setup ──
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 30;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // ── Lights ──
  const ambientLight = new THREE.AmbientLight(0x4488ff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x6699ff, 0.8);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0x2563eb, 1.2, 50);
  pointLight.position.set(-5, 5, 10);
  scene.add(pointLight);

  // ── Particles ──
  const PARTICLE_COUNT = 120;
  const particles = [];
  const geometries = [
    new THREE.IcosahedronGeometry(0.4, 0),
    new THREE.OctahedronGeometry(0.35, 0),
    new THREE.TetrahedronGeometry(0.35, 0),
    new THREE.SphereGeometry(0.25, 8, 8),
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
  ];

  const colors = [
    0x2563eb, // blue
    0x3b82f6, // blue-light
    0x60a5fa, // blue-400
    0x818cf8, // indigo
    0x38bdf8, // sky
  ];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const geo = geometries[Math.floor(Math.random() * geometries.length)];
    const mat = new THREE.MeshPhongMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.15 + Math.random() * 0.35,
      wireframe: Math.random() > 0.5,
      shininess: 80,
    });

    const mesh = new THREE.Mesh(geo, mat);
    const spread = 40;
    mesh.position.set(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread * 0.6,
      (Math.random() - 0.5) * 15 - 5
    );

    const scale = 0.5 + Math.random() * 1.5;
    mesh.scale.setScalar(scale);

    mesh.userData = {
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.01,
      },
      floatSpeed: 0.0005 + Math.random() * 0.001,
      floatOffset: Math.random() * Math.PI * 2,
      baseY: mesh.position.y,
    };

    scene.add(mesh);
    particles.push(mesh);
  }

  // ── Connecting Lines ──
  const lineGeometry = new THREE.BufferGeometry();
  const linePositions = new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6);
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.04,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lines);

  // ── Mouse Parallax ──
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;

  document.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ── Animation Loop ──
  let frameId;
  const clock = new THREE.Clock();

  function animate() {
    frameId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse
    mouseX += (targetMouseX - mouseX) * 0.03;
    mouseY += (targetMouseY - mouseY) * 0.03;

    // Camera subtle movement
    camera.position.x = mouseX * 2;
    camera.position.y = -mouseY * 1.5;
    camera.lookAt(0, 0, 0);

    // Animate particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const d = p.userData;

      p.rotation.x += d.rotSpeed.x;
      p.rotation.y += d.rotSpeed.y;
      p.rotation.z += d.rotSpeed.z;

      p.position.y = d.baseY + Math.sin(t * d.floatSpeed * 100 + d.floatOffset) * 0.8;
    }

    // Update connecting lines (connect nearby particles)
    let lineIdx = 0;
    const maxDist = 6;
    for (let i = 0; i < particles.length && lineIdx < linePositions.length; i++) {
      for (let j = i + 1; j < particles.length && lineIdx < linePositions.length; j++) {
        const dx = particles[i].position.x - particles[j].position.x;
        const dy = particles[i].position.y - particles[j].position.y;
        const dz = particles[i].position.z - particles[j].position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < maxDist) {
          linePositions[lineIdx++] = particles[i].position.x;
          linePositions[lineIdx++] = particles[i].position.y;
          linePositions[lineIdx++] = particles[i].position.z;
          linePositions[lineIdx++] = particles[j].position.x;
          linePositions[lineIdx++] = particles[j].position.y;
          linePositions[lineIdx++] = particles[j].position.z;
        }
      }
    }
    // Zero out remaining
    for (let i = lineIdx; i < linePositions.length; i++) linePositions[i] = 0;
    lineGeometry.attributes.position.needsUpdate = true;

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

  // ── Visibility API: pause when hidden ──
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
    } else {
      animate();
    }
  });
})();
