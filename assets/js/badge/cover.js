// A front cover over the LEDs, after Joya PCB/Video/js/diffuser.js (concept 3; covers 1 to 3 are on print
// plate 7): a black frame that rises from the shell's rim past a white window. The video paints the window's
// light into a picture; here it is worked out per pixel on the graphics card from the LEDs' places and colours,
// every frame, so it follows the lights. A picture of the idea, not a measurement of a printed part.
import * as THREE from 'three';

const LED_TOP = 0.5 + 1.55; // scene z of the top of a WS2812B
const LIP = 0.3; // the frame stands this far proud of the window

// gap: LED top to the window's underside. skin: the window's thickness. reach: how far one LED spreads on it
export const COVERS = {
  frost: { gap: 0.5, skin: 0.6, reach: 1.5, halo: 0.07 },
  dots: { gap: 4, skin: 0.8, reach: 4.6, halo: 0 },
  glow: { gap: 9, skin: 1.0, reach: 10, halo: 0 },
};

// the convex outline (board millimetres, y down) pushed out by d, in scene millimetres (y up)
const offsetOutline = (outline, d) => {
  const n = outline.length;
  const next = (i) => outline[(i + 1) % n];
  const area = outline.reduce((sum, [x, y], i) => sum + x * next(i)[1] - next(i)[0] * y, 0);
  const sign = area > 0 ? 1 : -1;
  const lines = outline.map(([x, y], i) => {
    const [dx, dy] = [next(i)[0] - x, next(i)[1] - y];
    const len = Math.hypot(dx, dy);
    return { px: x + (sign * dy * d) / len, py: y - (sign * dx * d) / len, dx, dy };
  });
  return lines.map((b, i) => {
    const a = lines[(i + n - 1) % n];
    const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / (a.dx * b.dy - a.dy * b.dx);
    return new THREE.Vector2(a.px + a.dx * t - 37.5, 30 - (a.py + a.dy * t));
  });
};

/* spots: each LED's centre, in the badge's scene millimetres. Returns the cover's group (seated, at z 0),
   light(colours) to give the window the LEDs' colours of this frame, and fade(k) to show it from 0 to 1. */
export const buildCover = ({ outline, spec, rimTop, outset, inset, frameMaterial, spots }) => {
  const top = LED_TOP + spec.gap + spec.skin;
  const inner = offsetOutline(outline, inset);
  const ring = new THREE.Shape(offsetOutline(outline, outset));
  ring.holes.push(new THREE.Path(inner));
  const frameMat = frameMaterial.clone();
  frameMat.transparent = true;
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: top + LIP - rimTop, bevelEnabled: false }), frameMat);
  frame.position.z = rimTop;

  const uniforms = {
    uSpot: { value: spots.map((s) => s.clone()) },
    uColor: { value: spots.map(() => new THREE.Color(0, 0, 0)) },
    uReach2: { value: spec.reach * spec.reach },
    uHalo: { value: spec.halo },
  };
  const face = new THREE.MeshStandardMaterial({ color: '#dde2ea', roughness: 0.66, transparent: true });
  face.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSpot;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSpot = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
#define SPOTS ${spots.length}
varying vec2 vSpot;
uniform vec2 uSpot[SPOTS];
uniform vec3 uColor[SPOTS];
uniform float uReach2;
uniform float uHalo;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
for (int i = 0; i < SPOTS; i++) {
  vec2 d = vSpot - uSpot[i];
  float r2 = dot(d, d);
  float near = 1.0 + r2 / uReach2;
  float far = 1.0 + r2 / 36.0;
  totalEmissiveRadiance += uColor[i] * (1.0 / (near * near) + uHalo / (far * far)); // a flat emitter on a parallel sheet
}`);
  };
  const pane = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(inner)), face);
  pane.position.z = top;

  const group = new THREE.Group();
  group.add(frame, pane);
  const light = (colours) => colours.forEach((c, i) => uniforms.uColor.value[i].setRGB(...c));
  const fade = (k) => {
    group.visible = k > 0.01;
    frameMat.opacity = face.opacity = k;
  };
  fade(0);
  return { group, light, fade };
};
