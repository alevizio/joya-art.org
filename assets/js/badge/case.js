// The rest of the finished badge, around the board that stage.js builds: the 3D printed shell and clamp
// (badge-shell.json: shell 7 and clamp A from Joya PCB/Case/make_case.py, heights still assumed), the bar
// pin glued on the back, the battery inside and a lanyard through the clamp. Shapes and colours follow
// Joya PCB/Video/js/case.js. Scene millimetres: x right, y up, z out of the board's front.
import * as THREE from 'three';

const SHELL_COLOR = '#22252b'; // a touch lighter than the video's 15171b: here it stands on a black page, not a grey backdrop
// the lanyard: one woven ribbon round the clamp's bar, both ends up toward the neck, fading out on the way
const RIBBON = { color: '#c29a3e', width: 10, thick: 0.8, fade: [62, 84], lean: 0.42, top: 112 };
const BAR = { y: [42.44, 46], z: [-2.3, 1.3] }; // the clamp's bar over its slot, where the ribbon goes round

const smooth = (v) => {
  const x = Math.min(1, Math.max(0, v));
  return x * x * (3 - 2 * x);
};

// a printed part: flat facets, like the real thing
const printed = (data, material) => {
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  indexed.setIndex(data.indices);
  const geo = indexed.toNonIndexed();
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
};

// the bar pin in its seat on the back: a plate, two posts, the catch and the needle
const buildPin = ({ mm: [length, width, height], seat_z: seatZ, y }) => {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#8f939a', roughness: 0.46, metalness: 0.9 });
  const add = (geo, x, z) => {
    const mesh = new THREE.Mesh(geo, steel);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const end = length / 2 - 2;
  add(new THREE.BoxGeometry(length, width, 0.6), 0, seatZ - 0.3);
  add(new THREE.BoxGeometry(2.2, 3, height - 2.4), -end, seatZ - 0.6 - (height - 2.4) / 2);
  add(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 20), -end, seatZ - height + 1.5);
  add(new THREE.BoxGeometry(1.6, 2.4, height - 3), end, seatZ - 0.6 - (height - 3) / 2);
  add(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 24), end, seatZ - height + 1.5);
  const needle = add(new THREE.CylinderGeometry(0.38, 0.38, length - 2.5, 12), 0.4, seatZ - height + 1.5);
  needle.rotation.z = Math.PI / 2;
  return g;
};

// a box with rounded corners and soft edges, w x h x t, centred
const softBox = (w, h, t, r, edge) => {
  const shape = new THREE.Shape();
  const x = w / 2 - edge - r;
  const y = h / 2 - edge - r;
  shape.absarc(x, y, r, 0, Math.PI / 2);
  shape.absarc(-x, y, r, Math.PI / 2, Math.PI);
  shape.absarc(-x, -y, r, Math.PI, Math.PI * 1.5);
  shape.absarc(x, -y, r, Math.PI * 1.5, Math.PI * 2);
  const depth = t - 2 * edge;
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: edge, bevelSize: edge, bevelSegments: 3, curveSegments: 6 })
    .translate(0, 0, -depth / 2);
};

// the pouch cell on the WiFi module, its amber band at the end that holds the protection board
const buildBattery = ({ mm: [w, h, t], y: [y0, y1], module_height: under }) => {
  const g = new THREE.Group();
  const pouch = new THREE.Mesh(softBox(w, h, t, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: '#b4b8bf', roughness: 0.36, metalness: 0.85 }));
  const band = new THREE.Mesh(softBox(6, h + 0.3, t + 0.3, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: '#c28a26', roughness: 0.42, metalness: 0.1 }));
  band.position.x = w / 2 - 3;
  g.add(pouch, band);
  g.position.set(0, 30 - (y0 + y1) / 2, -0.5 - under - t / 2);
  return g;
};

// a few millimetres of woven ribbon: selvedges and fine weave rows, repeated along its length
const ribbonTexture = (aniso) => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = RIBBON.color;
  c.fillRect(0, 0, 64, 64);
  for (let row = 0; row < 64; row += 2) {
    c.fillStyle = row % 4 ? 'rgba(255, 236, 190, 0.07)' : 'rgba(40, 24, 0, 0.1)';
    c.fillRect(0, row, 64, 1);
  }
  c.fillStyle = 'rgba(40, 24, 0, 0.28)';
  [4, 58].forEach((x) => c.fillRect(x, 0, 2, 64));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = aniso;
  return tex;
};

// The ribbon as a flat strip along its middle line: up the front of the bar, under it through the slot,
// up the back. Above the clamp the two ends lean apart, front end left, back end right, as on a neck.
const buildLanyard = (aniso) => {
  const [low, high] = BAR.y;
  const gap = RIBBON.thick / 2 + 0.15;
  const front = BAR.z[1] + gap;
  const back = BAR.z[0] - gap;
  const under = low - gap;
  const profile = [
    [RIBBON.top, front + 2.6], [80, front + 1.2], [60, front + 0.4], [high + 1, front], [low + 1.4, front],
    [low + 0.2, front - 0.3], [under, (front + back) / 2], [low + 0.2, back + 0.3],
    [low + 1.4, back], [high + 1, back], [60, back - 0.5], [80, back - 1.4], [RIBBON.top, back - 3],
  ];
  const curve = new THREE.CatmullRomCurve3(profile.map(([y, z]) => new THREE.Vector3(0, y, z)), false, 'centripetal');
  const points = curve.getSpacedPoints(240);
  const half = RIBBON.width / 2;
  // each end turns to its lean over `climb` mm above the clamp; drift is how far it has moved sideways
  const start = high + 1;
  const climb = 12;
  const turned = (y) => (y - start) / climb;
  const drift = (y) => {
    const t = turned(y);
    const area = t <= 0 ? 0 : t < 1 ? t ** 3 - t ** 4 / 2 : t - 0.5; // the integral of smoothstep
    return Math.tan(RIBBON.lean) * climb * area;
  };
  const pos = [];
  const uv = [];
  const rgba = [];
  const idx = [];
  let length = 0;
  points.forEach((p, i) => {
    if (i) length += p.distanceTo(points[i - 1]);
    const sign = p.z > (front + back) / 2 ? -1 : 1; // the front end leans left, the back end right
    const lean = RIBBON.lean * smooth(turned(p.y));
    const x = sign * drift(p.y);
    const wx = Math.cos(lean);
    const wy = -sign * Math.sin(lean);
    pos.push(x - wx * half, p.y - wy * half, p.z, x + wx * half, p.y + wy * half, p.z);
    const v = length / RIBBON.width;
    uv.push(0, v, 1, v);
    const alpha = 1 - smooth((p.y - RIBBON.fade[0]) / (RIBBON.fade[1] - RIBBON.fade[0]));
    rgba.push(1, 1, 1, alpha, 1, 1, 1, alpha);
    if (i) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(rgba, 4));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: ribbonTexture(aniso), roughness: 0.85, side: THREE.DoubleSide, vertexColors: true, transparent: true, alphaTest: 0.02,
  }));
};

/* The parts around the board, each in its own group so stage.js can pull them apart:
   shell (with the pin), battery, clamp (with the lanyard, which is also returned on its own). */
export const buildCase = (data, aniso) => {
  // the sheen is tinted cool: the studio's reflections are warm and turn a black shell brown
  const plastic = new THREE.MeshPhysicalMaterial({ color: SHELL_COLOR, roughness: 0.56, metalness: 0, specularColor: '#c4ddff' });
  const shell = new THREE.Group();
  shell.add(printed(data.shell, plastic), buildPin(data.pin));
  const battery = buildBattery(data.battery);
  const ribbon = buildLanyard(aniso);
  const clamp = new THREE.Group();
  clamp.add(printed(data.clamp, plastic), ribbon);
  return { shell, battery, clamp, ribbon };
};
