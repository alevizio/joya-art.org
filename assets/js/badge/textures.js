// Paints the two faces of the board (copper pours, tracks, vias, pads, silk) from board.json
// into canvas textures: colour, and roughness + metalness.
// Web copy of Joya PCB/Video/js/textures.js for the /badge viewer: textures 1600 px wide instead
// of 4096 and no bump map, so a phone holds four 8 MB canvases instead of six 54 MB ones.
import * as THREE from 'three';

export const MM_W = 76;
export const MM_H = 60.8;
const OX = 0.5;
const OY = 0.75;
const TEX_W = 1600;
const S = TEX_W / MM_W;
const TEX_H = Math.round(MM_H * S);

const rad = (d) => (d * Math.PI) / 180;

// KiCad rotates counter-clockwise on a y-down sheet.
export const padAbs = (f, p) => {
  const a = rad(f.rot || 0);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [f.x + p.x * c + p.y * s, f.y - p.x * s + p.y * c];
};

const PALETTES = {
  color: { bare: '#0a0b0f', pour: '#14161c', trace: '#1c202a', via: '#212633', pad: '#e6c070', hole: '#020202', silk: '#ecebe4' },
  // green = roughness, blue = metalness
  orm: { bare: 'rgb(0,178,0)', pour: 'rgb(0,160,0)', trace: 'rgb(0,152,0)', via: 'rgb(0,152,0)', pad: 'rgb(0,72,255)', hole: 'rgb(0,235,0)', silk: 'rgb(0,215,0)' },
};

const padPath = (ctx, cx, cy, p, grow) => {
  const turned = Math.abs(Math.sin(rad(p.r || 0))) > 0.5;
  const w = ((turned ? p.h : p.w) + 2 * grow) * S;
  const h = ((turned ? p.w : p.h) + 2 * grow) * S;
  ctx.beginPath();
  if (p.shape === 'circle') ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
  else if (p.shape === 'rect') ctx.rect(cx - w / 2, cy - h / 2, w, h);
  else ctx.roundRect(cx - w / 2, cy - h / 2, w, h, (p.shape === 'oval' ? 0.5 : 0.25) * Math.min(w, h));
  ctx.fill();
};

const paint = (ctx, board, front, pal) => {
  const cu = front ? 'F.Cu' : 'B.Cu';
  const silkLayer = front ? 'F.SilkS' : 'B.SilkS';
  const X = (x) => ((front ? x : 75 - x) + OX) * S;
  const Y = (y) => (y + OY) * S;
  const segs = board.segs.filter((s) => s.layer === cu);
  const pads = [];
  for (const f of board.fps) {
    for (const p of f.pads) {
      const through = p.type !== 'smd';
      if (!through && f.layer !== cu) continue;
      const [ax, ay] = padAbs(f, p);
      pads.push({ p, x: X(ax), y: Y(ay), hole: p.type === 'np_thru_hole' });
    }
  }
  const outline = [[37.5, 0], [75, 37.5], [54.5, 59.3], [20.5, 59.3], [0, 37.5]];
  const tracePath = () => {
    ctx.beginPath();
    outline.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.closePath();
  };

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = pal.bare;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  // ground pour, pulled back from the edge
  tracePath();
  ctx.fillStyle = pal.pour;
  ctx.fill();
  ctx.strokeStyle = pal.bare;
  ctx.lineWidth = 0.9 * S;
  ctx.stroke();
  // clearance moats
  ctx.strokeStyle = pal.bare;
  ctx.fillStyle = pal.bare;
  for (const s of segs) {
    ctx.lineWidth = (s.w + 0.44) * S;
    ctx.beginPath();
    ctx.moveTo(X(s.s[0]), Y(s.s[1]));
    ctx.lineTo(X(s.e[0]), Y(s.e[1]));
    ctx.stroke();
  }
  for (const v of board.vias) {
    ctx.beginPath();
    ctx.arc(X(v[0]), Y(v[1]), (v[2] / 2 + 0.2) * S, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const q of pads) padPath(ctx, q.x, q.y, q.p, 0.22);
  // copper under the mask
  ctx.strokeStyle = pal.trace;
  for (const s of segs) {
    ctx.lineWidth = s.w * S;
    ctx.beginPath();
    ctx.moveTo(X(s.s[0]), Y(s.s[1]));
    ctx.lineTo(X(s.e[0]), Y(s.e[1]));
    ctx.stroke();
  }
  for (const v of board.vias) {
    ctx.fillStyle = pal.via;
    ctx.beginPath();
    ctx.arc(X(v[0]), Y(v[1]), (v[2] / 2) * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.bare;
    ctx.beginPath();
    ctx.arc(X(v[0]), Y(v[1]), 0.13 * S, 0, Math.PI * 2);
    ctx.fill();
  }
  // exposed gold
  for (const q of pads) {
    ctx.fillStyle = q.hole ? pal.hole : pal.pad;
    padPath(ctx, q.x, q.y, q.p, 0);
  }
  // silk
  ctx.fillStyle = pal.silk;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${1.2 * S}px "SF Mono", Menlo, monospace`;
  for (const t of board.texts) {
    if (t.layer !== silkLayer) continue;
    ctx.fillText(t.text, X(t.x), Y(t.y) + 0.04 * S);
  }
};

const makeTexture = (board, front, pal, srgb, maxAniso) => {
  const cv = document.createElement('canvas');
  cv.width = TEX_W;
  cv.height = TEX_H;
  paint(cv.getContext('2d'), board, front, pal);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
};

export const boardFaceMaterial = (board, front, maxAniso) => {
  const orm = makeTexture(board, front, PALETTES.orm, false, maxAniso);
  return new THREE.MeshPhysicalMaterial({
    map: makeTexture(board, front, PALETTES.color, true, maxAniso),
    roughnessMap: orm,
    metalnessMap: orm,
    roughness: 1,
    metalness: 1,
    clearcoat: 0.1,
    clearcoatRoughness: 0.6,
  });
};

// Face UVs: local x right, local y up, both in millimetres around the board centre (37.5, 30).
export const setFaceUvs = (geometry) => {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + 37.5 + OX) / MM_W, 1 - (30 - pos.getY(i) + OY) / MM_H);
  }
  uv.needsUpdate = true;
};
