// Procedural 3D parts, one builder per footprint. Copy of Joya PCB/Video/js/parts.js, unchanged.
// Each builder draws in footprint coordinates
// (x right, y DOWN as in KiCad, z up from the board surface); `at` flips y for the scene.
import * as THREE from 'three';

const std = (o) => new THREE.MeshStandardMaterial(o);
export const MAT = {
  tin: std({ color: '#c9cbcd', metalness: 1, roughness: 0.36 }),
  steel: std({ color: '#d3d6d9', metalness: 1, roughness: 0.24 }),
  shield: std({ color: '#c4c7cb', metalness: 1, roughness: 0.3 }),
  gold: std({ color: '#e8c06a', metalness: 1, roughness: 0.3 }),
  black: std({ color: '#131416', roughness: 0.62 }),
  ic: std({ color: '#17181b', roughness: 0.48 }),
  choke: std({ color: '#2a2b2e', roughness: 0.92 }),
  module: std({ color: '#0b0c10', roughness: 0.5 }),
  mlcc: std({ color: '#a58759', roughness: 0.55 }),
  resistor: std({ color: '#101011', roughness: 0.5 }),
  white: std({ color: '#edebe5', roughness: 0.55 }),
  cream: std({ color: '#e6dfca', roughness: 0.6 }),
  band: std({ color: '#b9bbbd', roughness: 0.7 }),
  cavity: std({ color: '#0a0a0b', roughness: 0.8 }),
};

const boxCache = new Map();
const boxGeo = (w, h, d) => {
  const k = `${w},${h},${d}`;
  if (!boxCache.has(k)) boxCache.set(k, new THREE.BoxGeometry(w, h, d));
  return boxCache.get(k);
};
const lit = (m) => {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
// box of size w (x) by h (y) by d (z) with its base at z, centred on footprint point (x, y)
const box = (g, w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = lit(new THREE.Mesh(boxGeo(w, h, d), mat));
  m.position.set(x, -y, z + d / 2);
  g.add(m);
  return m;
};
const cyl = (g, r, d, mat, x = 0, y = 0, z = 0, seg = 40) => {
  const m = lit(new THREE.Mesh(new THREE.CylinderGeometry(r, r, d, seg), mat));
  m.rotation.x = Math.PI / 2;
  m.position.set(x, -y, z + d / 2);
  g.add(m);
  return m;
};

// laser marking or printed text lying on top of a part
const mark = (g, lines, w, h, x, y, z, back, color = '#8f9296', weight = 600) => {
  const cv = document.createElement('canvas');
  const k = 96;
  cv.width = Math.round(w * k);
  cv.height = Math.round(h * k);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = cv.height / lines.length;
  lines.forEach((line, i) => {
    let size = lh * 0.74;
    ctx.font = `${weight} ${size}px "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
    const tw = ctx.measureText(line).width;
    if (tw > cv.width * 0.94) {
      size *= (cv.width * 0.94) / tw;
      ctx.font = `${weight} ${size}px "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
    }
    ctx.fillText(line, cv.width / 2, lh * (i + 0.5));
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, depthWrite: false }),
  );
  m.position.set(x, -y, z + 0.012);
  if (back) m.scale.x = -1; // back parts are mirrored in z, so text is mirrored back
  m.userData.mark = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
};

const roundedRect = (w, h, r, target = new THREE.Shape()) => {
  const x = -w / 2;
  const y = -h / 2;
  target.moveTo(x + r, y);
  target.lineTo(x + w - r, y);
  target.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  target.lineTo(x + w, y + h - r);
  target.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  target.lineTo(x + r, y + h);
  target.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  target.lineTo(x, y + r);
  target.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return target;
};

const chip = (g, len, wid, hgt, body, cap) => {
  box(g, len - 2 * cap + 0.02, wid, hgt, body);
  box(g, cap, wid + 0.03, hgt + 0.03, MAT.tin, -(len - cap) / 2);
  box(g, cap, wid + 0.03, hgt + 0.03, MAT.tin, (len - cap) / 2);
  return hgt;
};

// ---- WS2812B, the only parts on the front ----
let ledTopGeo;
let ledLensTex;
const ledLensTexture = () => {
  if (ledLensTex) return ledLensTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#d9d6cb';
  c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#b9b6ab'; // lead frame islands
  c.fillRect(20, 30, 96, 90);
  c.fillRect(140, 30, 96, 90);
  c.fillRect(20, 138, 96, 90);
  c.fillRect(140, 138, 96, 90);
  c.fillStyle = '#d9d6cb';
  c.fillRect(0, 122, 256, 12);
  c.fillRect(120, 0, 16, 256);
  c.fillStyle = '#2b2c33'; // controller die and the three emitters
  c.fillRect(150, 150, 46, 34);
  c.fillStyle = '#6f7a8a';
  c.fillRect(56, 58, 16, 16);
  c.fillRect(84, 84, 16, 16);
  c.fillRect(56, 160, 16, 16);
  ledLensTex = new THREE.CanvasTexture(cv);
  ledLensTex.colorSpace = THREE.SRGBColorSpace;
  return ledLensTex;
};

const ws2812b = (g, f, back, out) => {
  if (!ledTopGeo) {
    const s = new THREE.Shape();
    s.moveTo(-2.5, -2.5);
    s.lineTo(2.5, -2.5);
    s.lineTo(2.5, 1.9);
    s.lineTo(1.9, 2.5); // chamfered corner
    s.lineTo(-2.5, 2.5);
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, 2.0, 0, Math.PI * 2, true);
    s.holes.push(hole);
    ledTopGeo = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: false, curveSegments: 48 });
  }
  box(g, 5, 5, 1.0, MAT.white);
  const top = lit(new THREE.Mesh(ledTopGeo, MAT.white));
  top.position.z = 1.0;
  g.add(top);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) box(g, 0.5, 1.0, 0.85, MAT.tin, sx * 2.7, sy * 1.65);
  const lensMat = new THREE.MeshStandardMaterial({
    map: ledLensTexture(),
    roughness: 0.25,
    emissive: new THREE.Color(0, 0, 0),
    emissiveIntensity: 1,
  });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(2.0, 48), lensMat);
  lens.position.z = 1.18;
  lens.receiveShadow = true;
  g.add(lens);
  out.leds.push({ ref: f.ref, lens: lensMat, lensMesh: lens, group: g });
  return 1.55;
};

// ---- back side ----
const esp07s = (g, f, back) => {
  box(g, 16, 17, 0.8, MAT.module);
  for (const p of f.pads) {
    if (!p.n) continue;
    box(g, 1.0, 1.0, 0.86, MAT.gold, Math.sign(p.x) * 7.52, p.y);
  }
  // antenna end is at +y
  box(g, 12.4, 12.4, 2.4, MAT.shield, 0, -1.9, 0.8);
  mark(g, ['ESP-07S', 'ISM 2.4 GHz', '802.11 b/g/n'], 9.6, 6.2, 0, -1.9, 3.2, back, '#4b4f55', 600);
  // U.FL socket
  box(g, 2.6, 2.6, 0.35, MAT.white, 3.1, 6.45, 0.8);
  cyl(g, 1.0, 0.75, MAT.gold, 3.1, 6.45, 1.15);
  cyl(g, 0.62, 0.8, MAT.cavity, 3.1, 6.45, 1.15);
  cyl(g, 0.25, 0.9, MAT.gold, 3.1, 6.45, 1.15);
  // a few loose parts by the antenna
  box(g, 1.0, 0.5, 0.35, std({ color: '#3b5ea8', roughness: 0.4 }), -5.4, 6.7, 0.8);
  box(g, 1.0, 0.5, 0.45, MAT.mlcc, -3.2, 6.7, 0.8);
  box(g, 1.0, 0.5, 0.45, MAT.mlcc, -1.2, 6.7, 0.8);
  box(g, 0.5, 1.0, 0.45, MAT.mlcc, 0.3, 5.6, 0.8);
  return 3.2;
};

const usbC = (g) => {
  const outer = roundedRect(8.94, 3.2, 1.3);
  outer.holes.push(roundedRect(8.3, 2.56, 1.0, new THREE.Path()));
  const geo = new THREE.ExtrudeGeometry(outer, { depth: 7.3, bevelEnabled: false, curveSegments: 20 });
  geo.rotateX(Math.PI / 2); // section height becomes z, depth runs along -y (scene)
  geo.translate(0, 3.9, 1.62);
  g.add(lit(new THREE.Mesh(geo, MAT.steel)));
  // scene y: mouth at +3.9 (footprint y -3.9), back wall at -3.4
  box(g, 8.6, 0.3, 2.9, MAT.steel, 0, 3.25, 0.17);
  box(g, 6.7, 5.4, 0.7, MAT.black, 0, -0.9, 1.27); // tongue
  box(g, 5.6, 1.2, 0.74, MAT.gold, 0, -3.0, 1.25);
  box(g, 8.4, 2.4, 2.6, MAT.cavity, 0, 2.2, 0.32);
  // shell legs
  for (const sx of [-1, 1]) {
    box(g, 0.5, 1.6, 1.0, MAT.steel, sx * 4.4, 3.0, 0);
    box(g, 0.5, 1.6, 1.0, MAT.steel, sx * 4.4, -1.1, 0);
  }
  return 3.25;
};

const jstPh3 = (g) => {
  // header body between footprint y -0.9 and 3.6, leads towards -y
  const wall = roundedRect(7.9, 4.5, 0.25);
  wall.holes.push(roundedRect(6.7, 3.2, 0.2, new THREE.Path()));
  const geo = new THREE.ExtrudeGeometry(wall, { depth: 4.6, bevelEnabled: false });
  geo.translate(0, -1.35, 0.9);
  g.add(lit(new THREE.Mesh(geo, MAT.cream)));
  box(g, 7.9, 4.5, 0.9, MAT.cream, 0, 1.35, 0);
  for (const x of [-2, 0, 2]) {
    box(g, 0.5, 0.5, 3.6, MAT.tin, x, 1.35, 0.9);
    box(g, 0.6, 2.5, 0.22, MAT.tin, x, -2.1, 0);
  }
  for (const sx of [-1, 1]) box(g, 1.4, 2.8, 0.28, MAT.tin, sx * 4.4, 1.75, 0);
  // keying slots on the wall facing the leads
  box(g, 1.2, 0.72, 2.2, MAT.cavity, -2, -0.6, 3.31);
  box(g, 1.2, 0.72, 2.2, MAT.cavity, 2, -0.6, 3.31);
  return 5.5;
};

const tactB3U = (g) => {
  box(g, 3.0, 2.6, 0.75, MAT.black);
  box(g, 3.0, 2.6, 0.35, MAT.steel, 0, 0, 0.75);
  cyl(g, 0.78, 0.5, MAT.black, 0, 0, 1.1);
  for (const sx of [-1, 1]) box(g, 0.6, 1.3, 0.3, MAT.tin, sx * 1.75, 0);
  return 1.6;
};

const slideJS102 = (g) => {
  box(g, 9.0, 3.6, 3.5, MAT.steel, 0, 0.1, 0);
  box(g, 5.0, 0.3, 1.9, MAT.cavity, 0, -1.6, 0.8); // slot the lever rides in
  box(g, 2.0, 2.2, 1.5, MAT.black, -1.0, -2.7, 1.0); // lever, ON position
  for (const x of [-2.5, 0, 2.5]) box(g, 0.7, 1.6, 0.3, MAT.tin, x, 2.6, 0);
  return 3.5;
};

const sod123f = (g) => {
  box(g, 2.7, 1.6, 1.0, MAT.black);
  box(g, 0.45, 1.62, 1.01, MAT.band, -0.85, 0, 0);
  for (const sx of [-1, 1]) box(g, 0.8, 1.0, 0.22, MAT.tin, sx * 1.55, 0);
  return 1.0;
};

const led0805 = (g, f, back, out) => {
  const mat = new THREE.MeshStandardMaterial({
    color: '#f0ddd6',
    roughness: 0.35,
    transparent: true,
    opacity: 0.92,
    emissive: new THREE.Color('#ff2a1a'),
    emissiveIntensity: 0,
  });
  const mesh = box(g, 1.3, 1.25, 0.75, mat);
  box(g, 0.4, 1.28, 0.5, MAT.tin, -0.8);
  box(g, 0.4, 1.28, 0.5, MAT.tin, 0.8);
  out.chargeLed = { mat, mesh };
  return 0.75;
};

const BUILDERS = [
  ['WS2812B', ws2812b],
  ['ESP07S', esp07s],
  ['USB_C', usbC],
  ['JST_PH', jstPh3],
  ['B3U', tactB3U],
  ['JS102011', slideJS102],
  ['SOD-123F', sod123f],
  ['LED_0805', led0805],
  ['R_0603', (g) => chip(g, 1.6, 0.8, 0.45, MAT.resistor, 0.3)],
  ['C_0603', (g) => chip(g, 1.6, 0.8, 0.8, MAT.mlcc, 0.35)],
  ['C_0805', (g) => chip(g, 2.0, 1.25, 1.0, MAT.mlcc, 0.45)],
  ['XFL4020', (g, f, back) => {
    box(g, 4.0, 4.0, 2.1, MAT.choke);
    mark(g, ['1R5'], 2.6, 1.3, 0, 0, 2.1, back, '#77797d');
    return 2.1;
  }],
  ['VQFN-16', (g, f, back) => {
    box(g, 3.0, 3.0, 0.9, MAT.ic);
    mark(g, ['BQ', '24074'], 2.4, 1.9, 0.1, 0, 0.9, back, '#74777b');
    cyl(g, 0.16, 0.02, MAT.band, -1.15, 1.15, 0.9, 16);
    return 0.9;
  }],
  ['TPS63020', (g, f, back) => {
    box(g, 3.0, 4.0, 0.9, MAT.ic);
    mark(g, ['TPS', '63020'], 2.4, 1.9, 0, 0, 0.9, back, '#74777b');
    cyl(g, 0.16, 0.02, MAT.band, -1.1, -1.6, 0.9, 16);
    return 0.9;
  }],
];

// Returns the part group (already placed on the board) and its height, or null for bare pads.
export const buildPart = (f, out) => {
  const entry = BUILDERS.find(([key]) => f.fp.includes(key));
  if (!entry) return null;
  const back = f.layer === 'B.Cu';
  const g = new THREE.Group();
  const height = entry[1](g, f, back, out);
  g.position.set(f.x - 37.5, 30 - f.y, back ? -0.5 : 0.5);
  g.rotation.z = ((f.rot || 0) * Math.PI) / 180;
  if (back) g.scale.z = -1;
  // markings stay upright on the board whatever way the part is turned
  for (const child of g.children) if (child.userData.mark) child.rotation.z = -g.rotation.z;
  return { group: g, height };
};
