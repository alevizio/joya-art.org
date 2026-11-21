// The /badge 3D viewer: the finished badge. The real board, built from its KiCad file (badge-board.json)
// and lit by the firmware's own light effects (sim.js), inside its 3D printed shell with the clamp, the
// battery and a lanyard (case.js, badge-shell.json). Drag it to turn it, flip it, or take it apart down to
// the board's layers. Loaded by viewer.js only when it is needed; `three` comes from the import map in
// badge.html. The scene follows Joya PCB/Video/js/scene.js, without the bloom passes and shadows of the
// video render, so it runs on a phone.
import * as THREE from 'three';
import { MM_W, MM_H, padAbs, boardFaceMaterial, setFaceUvs } from './textures.js';
import { buildPart } from './parts.js';
import { buildCase } from './case.js';
import { buildCover, COVERS } from './cover.js';
import { Sim, PALETTES } from './sim.js';
import { createLedGlow } from './glow.js';

const OUTLINE = [[37.5, 0], [75, 37.5], [54.5, 59.3], [20.5, 59.3], [0, 37.5]];
const FOV = 28;
const GAP = 9; // mm between two layers of the board when it is taken apart (the real board is 1 mm thick)
// spin turns the badge about its upright axis, tilt leans it back, dist is the camera distance in mm and
// look the height the camera aims at: whole, the middle of the badge from its bottom to the clamp's top, so it
// sits centred in the stage; the lanyard runs on up the page above it
const FACE = { spin: 0.42, tilt: -0.12, dist: 252, look: 8 };
const APART = { spin: -0.4, tilt: -1.02, dist: 390, look: -22 };
// a narrow viewer (a phone) stands further back when apart, as the names take more of its width
const NARROW_PX = 480;
const NARROW_DIST = 335;
const SHIFT = { wide: 30, narrow: 40 }; // mm the view moves right when apart, so the names fit beside the layers
// front to back; k is how many gaps the layer moves out when taken apart
const LAYERS = [['leds', 3], ['fmask', 2], ['fcu', 1], ['core', 0], ['bcu', -1], ['bmask', -2], ['parts', -3]];
// and the rest of the badge, in mm: the battery and the shell move back, the clamp up and forward
const OUT = { battery: -44, shell: -64, clamp: [0, 12, 38] };
// the effects shown in turn, with a palette each (6 Party, 17 Rainbow, 31 Heat): the ones that keep
// nearly all 13 LEDs lit and in full colour, so the board never looks half off or washed out
const PROGRAMME = [['inoise8_fire', 6], ['serendipitous', 6], ['confetti_pal', 6], ['noise16_1', 17], ['inoise8_fire', 31]];
const EFFECT_MS = 8000;
const TICK_MS = 17;
const FADE_MS = 380;
const LED_GAIN = 0.9; // lens emissive: lower than the video's 1.4, which had bloom to carry the colour
const LED_LIGHT = 5; // candela of the point light over each LED: the glow (glow.js) carries the rest
const MM_PER_DIST = 1 / (2 * Math.tan((FOV / 2) * (Math.PI / 180))); // screen heights per mm, times the camera distance
const STUDIO = 0.85;
const TILT_RANGE = [-1.45, 0.5];
const MAX_REACH = 1.5; // the canvas reaches at most this many stage heights above the stage
// the front cover its button puts on (cover.js): frost, dots or glow are covers 1, 2 and 3 of print plate 7.
// It sits on the shell's rim (board front 0.5 + rim 0.8), its frame's outside on the shell's outside
// (clearance 0.25 + wall 1.6) and its window over the board's pocket (clearance 0.25): make_case.py's numbers
const COVER = { kind: 'dots', rimTop: 1.3, outset: 1.85, inset: 0.25, drop: 24 };
const GOLD = '#e8c06a';

const smooth = (v) => {
  const x = Math.min(1, Math.max(0, v));
  return x * x * (3 - 2 * x);
};
// the turn nearest `spin` with the LEDs to the camera: the parts come apart, and go back, front first
const nearestFront = (spin) => Math.round(spin / (2 * Math.PI)) * 2 * Math.PI;

const radialTexture = (stops, size = 256) => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// Same dim studio as the video: a dark shell, lighter overhead, and three soft panels.
const studioEnvironment = () => {
  const soft = radialTexture([[0, '#ffffff'], [0.35, '#bdbdbd'], [0.7, '#3f3f3f'], [1, '#000000']]);
  const env = new THREE.Scene();
  const cv = document.createElement('canvas');
  cv.width = 8;
  cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 256);
  [[0, '#8d9097'], [0.5, '#4b4d53'], [1, '#17181b']].forEach(([at, color]) => g.addColorStop(at, color));
  c.fillStyle = g;
  c.fillRect(0, 0, 8, 256);
  const shellMap = new THREE.CanvasTexture(cv);
  shellMap.colorSpace = THREE.SRGBColorSpace;
  env.add(new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.MeshBasicMaterial({ map: shellMap, side: THREE.BackSide })));
  const panel = (dir, w, h, rgb) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: soft, color: new THREE.Color().setRGB(...rgb), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.position.set(...dir).normalize().multiplyScalar(100);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel([0, 0.6, 0.8], 210, 150, [1.5, 1.45, 1.36]);
  panel([0.62, -0.42, 0.66], 120, 80, [0.55, 0.5, 0.45]);
  panel([0.86, 0.26, -0.44], 34, 130, [4.6, 5.2, 6.4]);
  return env;
};

// One copper layer on its own: tracks, vias and pads in gold on a faint pour, on a clear sheet.
// Painted the way textures.js paints a face, so the same UVs line it up with the outline.
const copperTexture = (board, front, aniso) => {
  const w = 1600;
  const s = w / MM_W;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = Math.round(MM_H * s);
  const ctx = cv.getContext('2d');
  const X = (x) => ((front ? x : 75 - x) + 0.5) * s;
  const Y = (y) => (y + 0.75) * s;
  const cu = front ? 'F.Cu' : 'B.Cu';
  ctx.beginPath();
  OUTLINE.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
  ctx.closePath();
  ctx.fillStyle = 'rgba(232, 192, 106, 0.16)';
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle = GOLD;
  ctx.lineCap = 'round';
  for (const seg of board.segs) {
    if (seg.layer !== cu) continue;
    ctx.lineWidth = Math.max(seg.w, 0.22) * s;
    ctx.beginPath();
    ctx.moveTo(X(seg.s[0]), Y(seg.s[1]));
    ctx.lineTo(X(seg.e[0]), Y(seg.e[1]));
    ctx.stroke();
  }
  for (const v of board.vias) {
    ctx.beginPath();
    ctx.arc(X(v[0]), Y(v[1]), (v[2] / 2) * s, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of board.fps) {
    for (const p of f.pads) {
      if (p.type === 'np_thru_hole' || (p.type === 'smd' && f.layer !== cu)) continue;
      const [ax, ay] = padAbs(f, p);
      const turned = Math.abs(Math.sin(((p.r || 0) * Math.PI) / 180)) > 0.5;
      const pw = (turned ? p.h : p.w) * s;
      const ph = (turned ? p.w : p.h) * s;
      ctx.beginPath();
      if (p.shape === 'circle') ctx.arc(X(ax), Y(ay), pw / 2, 0, Math.PI * 2);
      else ctx.rect(X(ax) - pw / 2, Y(ay) - ph / 2, pw, ph);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  return tex;
};

/* Builds the viewer inside `root` (the figure with [data-viewer]). Resolves once the first frame is
   on screen. */
export const mountViewer = async (root) => {
  const stageBox = root.querySelector('[data-viewer-stage]');
  const json = async (attr) => (await fetch(root.getAttribute(attr))).json();
  const [board, caseData] = await Promise.all([json('data-board'), json('data-case')]);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const canvas = document.createElement('canvas');
  canvas.className = 'bdg-3d__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stageBox.append(canvas);
  // a clear canvas: the stage's own spotlight shows through, and the LED halos add light over it
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studioEnvironment(), 0.04).texture;
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 3000);

  // ---- the board, one group per layer so each can move out on its own ----
  const badge = new THREE.Group();
  scene.add(badge);
  const layer = Object.fromEntries(LAYERS.map(([key, k]) => {
    const g = new THREE.Group();
    g.userData.k = k;
    badge.add(g);
    return [key, g];
  }));
  const shape = new THREE.Shape();
  OUTLINE.forEach(([x, y], i) => (i ? shape.lineTo(x - 37.5, 30 - y) : shape.moveTo(x - 37.5, 30 - y)));
  shape.closePath();
  layer.core.add(new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.99, bevelEnabled: false }).translate(0, 0, -0.495),
    new THREE.MeshStandardMaterial({ color: '#6f6440', roughness: 0.75 }),
  ));
  const faceGeo = new THREE.ShapeGeometry(shape);
  setFaceUvs(faceGeo);
  const copper = [];
  for (const front of [true, false]) {
    const face = new THREE.Mesh(faceGeo, boardFaceMaterial(board, front, aniso));
    face.position.z = front ? 0.5 : -0.5;
    if (!front) face.rotation.y = Math.PI;
    layer[front ? 'fmask' : 'bmask'].add(face);
    const sheet = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({
      map: copperTexture(board, front, aniso), transparent: true, opacity: 0, metalness: 0.85, roughness: 0.35,
      side: THREE.DoubleSide, depthWrite: false,
    }));
    sheet.position.z = front ? 0.5 : -0.5;
    if (!front) sheet.rotation.y = Math.PI;
    layer[front ? 'fcu' : 'bcu'].add(sheet);
    copper.push(sheet);
  }
  const out = { leds: [], chargeLed: null };
  for (const f of board.fps) {
    const part = buildPart(f, out);
    if (part) layer[f.layer === 'B.Cu' ? 'parts' : 'leds'].add(part.group);
  }
  out.leds.sort((a, b) => Number(a.ref.slice(1)) - Number(b.ref.slice(1)));
  for (const led of out.leds) {
    led.light = new THREE.PointLight(0xffffff, LED_LIGHT, 30, 2);
    led.light.position.set(0, 0, 3.2);
    led.group.add(led.light);
  }
  // ---- the rest of the badge: shell, battery, clamp and lanyard ----
  const kit = buildCase(caseData);
  const batteryZ = kit.battery.position.z;
  badge.add(kit.shell, kit.battery, kit.clamp);
  // ---- the front cover, put on and taken off with its button ----
  const cover = buildCover({
    outline: OUTLINE,
    spec: COVERS[COVER.kind],
    rimTop: COVER.rimTop,
    outset: COVER.outset,
    inset: COVER.inset,
    frameMaterial: kit.shell.children[0].material,
    spots: out.leds.map((led) => new THREE.Vector2(led.group.position.x, led.group.position.y)),
  });
  badge.add(cover.group);
  // the light the LEDs give off, over the whole stage (glow.js)
  const glow = createLedGlow(out.leds.length);
  scene.add(glow.mesh);

  const key = new THREE.DirectionalLight('#fff4e6', 2.2);
  key.position.set(-160, 110, 80);
  const rim = new THREE.DirectionalLight('#9db8ff', 1.8); // also draws the black shell's edges against the black page
  rim.position.set(120, 60, -40);
  const fill = new THREE.DirectionalLight('#ffe9d2', 0.5);
  fill.position.set(90, -60, 120);
  scene.add(key, rim, fill);

  // ---- lights on the LEDs: the firmware's effects, one after another ----
  const palette = (i) => PALETTES[PROGRAMME[i][1]].entries.map((c) => c.slice());
  const lights = { sim: new Sim(PROGRAMME[0][0], 'badge'), pal: palette(0), idx: 0, tick: 0, prev: null, switchMs: -1e9, start: 0 };
  const advanceLights = (target) => {
    if (target - lights.tick > 120) lights.tick = target - 120; // back from a hidden tab: skip ahead, do not replay it
    while (lights.tick < target) {
      lights.tick++;
      const ms = lights.tick * TICK_MS;
      const idx = Math.floor(ms / EFFECT_MS) % PROGRAMME.length;
      if (idx !== lights.idx) {
        lights.prev = lights.sim.L.map((c) => c.slice());
        lights.switchMs = ms;
        lights.idx = idx;
        lights.pal = palette(idx);
        lights.sim.set(PROGRAMME[idx][0], 'badge');
      }
      lights.sim.step(ms, lights.pal);
    }
  };
  advanceLights(420); // start on a lit frame
  lights.start = performance.now() - lights.tick * TICK_MS;
  const showLights = () => {
    const k = lights.prev ? smooth((lights.tick * TICK_MS - lights.switchMs) / FADE_MS) : 1;
    out.leds.forEach((led, i) => {
      const [r, g, b] = lights.sim.L[i].map((v, ch) => Math.pow(((lights.prev ? lights.prev[i][ch] : 0) * (1 - k) + v * k) / 255, 0.9));
      led.lens.emissive.setRGB(r, g, b);
      led.lens.emissiveIntensity = LED_GAIN;
      led.light.color.setRGB(r, g, b);
      led.color = [r, g, b];
    });
  };

  // ---- state: what is on screen eases toward the target ----
  const state = { ...FACE, explode: 0, cover: 0 };
  const target = { ...FACE, explode: 0, cover: 0 };
  let dragging = null;
  let lastTouch = -1e9;
  const view = { size: 0, reach: 0 }; // the stage's width and how far the canvas reaches above it, in px
  let sway = 0;

  // each part's name, beside its right-hand corner: the board's layers, the battery, the shell, the clamp
  const marks = Array.from(root.querySelectorAll('[data-layer-mark]'));
  const legend = root.querySelector('[data-viewer-legend]');
  const corner = new THREE.Vector3();
  const markAt = (name) => {
    if (layer[name]) return corner.set(39.5, -7.5, layer[name].position.z);
    if (name === 'battery') return corner.set(39.5, -7.5, kit.battery.position.z);
    if (name === 'shell') return corner.set(42, -7.5, kit.shell.position.z - 5);
    return corner.set(11, 44, 0).add(kit.clamp.position);
  };
  const placeMarks = () => {
    for (const mark of marks) {
      markAt(mark.getAttribute('data-layer-mark')).applyMatrix4(badge.matrixWorld).project(camera);
      const left = (corner.x * 0.5 + 0.5) * 100;
      // the canvas runs `reach` px above the stage: from its top down, less that, over the stage's height
      const top = ((-corner.y * 0.5 + 0.5) * (view.size + view.reach) - view.reach) / view.size;
      mark.style.left = left.toFixed(2) + '%';
      mark.style.maxWidth = `calc(${(100 - left).toFixed(2)}% - .6rem)`; // a name near the right edge wraps
      mark.style.top = (top * 100).toFixed(2) + '%';
      mark.style.opacity = smooth((state.explode - 0.6) / 0.4).toFixed(3);
    }
  };

  const draw = (now) => {
    const apart = state.explode;
    for (const g of Object.values(layer)) g.position.z = g.userData.k * GAP * apart;
    for (const sheet of copper) {
      sheet.visible = apart > 0.02;
      sheet.material.opacity = smooth(apart * 1.6);
    }
    kit.battery.visible = apart > 0.01; // inside the shell when the badge is whole
    kit.battery.position.z = batteryZ + OUT.battery * apart;
    kit.shell.position.z = OUT.shell * apart;
    kit.clamp.position.set(...OUT.clamp.map((v) => v * apart));
    kit.lanyard.material.opacity = 1 - smooth(apart * 2.5); // the lanyard goes before the parts come apart
    kit.lanyard.visible = kit.lanyard.material.opacity > 0.01;
    const spin = state.spin + sway * 0.2 * Math.sin((now / 9000) * Math.PI * 2);
    badge.rotation.set(state.tilt, spin, 0);
    const shift = SHIFT[stageBox.clientWidth < NARROW_PX ? 'narrow' : 'wide'] * apart;
    camera.position.set(shift, state.look, state.dist);
    camera.lookAt(shift, state.look, 0);
    // the back of the badge gets the full studio, the front a dimmer one so the LEDs carry it
    const back = smooth(0.5 - Math.cos(spin) * 0.5);
    key.intensity = (2.0 + 1.9 * back) * STUDIO;
    fill.intensity = (0.35 + 0.65 * back) * STUDIO;
    scene.environmentIntensity = (0.8 + 0.45 * back) * STUDIO;
    showLights();
    // the cover comes down onto the front, and goes with the lanyard when the parts come apart
    const covered = smooth(state.cover) * (1 - smooth(apart * 2.5));
    cover.fade(covered);
    cover.group.position.z = (1 - smooth(state.cover)) * COVER.drop;
    cover.light(out.leds.map((led) => led.color));
    badge.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    glow.update(out.leds, layer.leds, camera, MM_PER_DIST / state.dist, (view.size + view.reach) / view.size, covered); // under the cover, its window carries the light
    placeMarks();
    renderer.render(scene, camera);
  };

  // eases the state; true while anything is still moving
  const step = (dt, now) => {
    const k = reduced.matches ? 1 : 1 - Math.exp(-dt * 6);
    let moving = false;
    for (const name of ['spin', 'tilt', 'dist', 'look', 'explode', 'cover']) {
      const held = dragging && (name === 'spin' || name === 'tilt');
      state[name] += (target[name] - state[name]) * (held ? 1 : k);
      if (Math.abs(target[name] - state[name]) > 1e-4) moving = true;
    }
    const idle = !reduced.matches && !dragging && now - lastTouch > 2500;
    sway += ((idle ? 1 : 0) - sway) * (1 - Math.exp(-dt * 1.5));
    return moving;
  };

  // ---- loop: only while the viewer is on screen and the tab is visible ----
  let visible = true;
  let queued = false;
  let last = performance.now();
  const frame = (now) => {
    queued = false;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const moving = step(dt, now);
    if (!reduced.matches) advanceLights(Math.floor((now - lights.start) / TICK_MS));
    draw(now);
    if (!reduced.matches || moving || dragging) schedule();
  };
  const schedule = () => {
    if (queued || !visible || document.hidden) return;
    queued = true;
    requestAnimationFrame(frame);
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }).observe(root);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);

  // The canvas reaches from the stage's foot up to the top of the page, so the lanyard runs on up behind the
  // menu. The square at its foot is the stage and shows just what a square canvas would: the camera's view is
  // that square's, made `reach` taller above and below, and drawn from its top down to the stage's foot.
  const resize = () => {
    const size = Math.max(1, Math.round(stageBox.clientWidth));
    const reach = Math.round(Math.min(size * MAX_REACH, Math.max(0, stageBox.getBoundingClientRect().top + window.scrollY)));
    if (size === view.size && reach === view.reach) return;
    Object.assign(view, { size, reach });
    stageBox.style.setProperty('--bdg-3d-reach', reach + 'px');
    renderer.setSize(size, size + reach, false);
    const full = size + 2 * reach;
    camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * full / size));
    camera.aspect = size / full;
    camera.setViewOffset(size, full, 0, 0, size, size + reach);
    draw(performance.now());
    schedule();
  };
  const resizes = new ResizeObserver(resize);
  resizes.observe(stageBox);
  resizes.observe(document.body); // what sits above the stage can change height without the stage changing

  // ---- drag to turn: on the stage only, not on the canvas above it ----

  stageBox.addEventListener('pointerdown', (event) => {
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stageBox.setPointerCapture(event.pointerId);
    lastTouch = performance.now();
    schedule();
  });
  stageBox.addEventListener('pointermove', (event) => {
    if (!dragging || event.pointerId !== dragging.id) return;
    const scale = 3.2 / Math.max(200, stageBox.clientWidth);
    target.spin += (event.clientX - dragging.x) * scale;
    target.tilt = Math.min(TILT_RANGE[1], Math.max(TILT_RANGE[0], target.tilt + (event.clientY - dragging.y) * scale));
    dragging.x = event.clientX;
    dragging.y = event.clientY;
    lastTouch = performance.now();
  });
  const release = () => {
    dragging = null;
    lastTouch = performance.now();
  };
  stageBox.addEventListener('pointerup', release);
  stageBox.addEventListener('pointercancel', release);

  // ---- buttons ----
  const flipButton = root.querySelector('[data-viewer-flip]');
  const layersButton = root.querySelector('[data-viewer-layers]');
  const coverButton = root.querySelector('[data-viewer-cover]');
  flipButton.addEventListener('click', () => {
    target.spin += Math.PI;
    lastTouch = performance.now();
    schedule();
  });
  layersButton.addEventListener('click', () => {
    const apart = layersButton.getAttribute('aria-pressed') !== 'true';
    layersButton.setAttribute('aria-pressed', String(apart));
    legend.hidden = !apart;
    const front = nearestFront(target.spin);
    const dist = stageBox.clientWidth < NARROW_PX ? NARROW_DIST : APART.dist;
    Object.assign(target, apart ? { ...APART, dist, spin: front + APART.spin, explode: 1 } : { ...FACE, spin: front + FACE.spin, explode: 0 });
    lastTouch = performance.now();
    schedule();
  });

  coverButton.addEventListener('click', () => {
    const on = coverButton.getAttribute('aria-pressed') !== 'true';
    coverButton.setAttribute('aria-pressed', String(on));
    target.cover = on ? 1 : 0;
    lastTouch = performance.now();
    schedule();
  });

  resize();
  root.classList.add('is-live');
  root.querySelectorAll('[data-viewer-live]').forEach((node) => { node.hidden = false; });
};
