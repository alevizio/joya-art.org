// The light of the board's LEDs, drawn over the 3D scene in one pass (stage.js). Written for this page
// after the look of glow shaders like Xor's "LED" on fragcoord.xyz (no code taken from it).
// Each LED is a white hot point the size of its lens, inside a soft halo in a deeper shade of its own
// colour, with a thin 1/d tail that dies out within a few millimetres, so every LED keeps its own
// light and the board between them stays dark. The light is added on top of the scene and rolled off
// with 1 - e^-x, so a bright LED goes white at its centre and keeps its colour toward the edge.
import * as THREE from 'three';

// in millimetres at the board, so the light keeps its size when the camera moves back
const CORE = 3.2;    // strength of the hot centre
const CORE_MM = 1;   // its radius: about the lens
const WHITE = 0.45;  // how far the centre's colour moves toward white: the LEDs show pure hues, with
                     // empty channels that would never roll off to white on their own
const HALO = 0.55;   // the halo around the package: HALO * e^-(mm / HALO_MM)^2
const HALO_MM = 3.5;
const RAY = 0.18;    // the thin tail: RAY / (mm + RAY_MM) * e^-(mm / RAY_REACH)
const RAY_MM = 0.8;
const RAY_REACH = 3.5;
const VIVID = 2.2;   // the deeper shade: each channel over the brightest one, to this power

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = (count) => /* glsl */ `
#define COUNT ${count}
uniform vec3 uLed[COUNT];   // xy: the LED's centre on screen (0 to 1), z: how much it faces the camera (0 to 1)
uniform vec3 uColor[COUNT]; // its colour, 0 to 1
uniform float uMm;          // one millimetre at the board, in screen units
varying vec2 vUv;
void main() {
  vec3 light = vec3(0.0);
  for (int i = 0; i < COUNT; i++) {
    float mm = distance(vUv, uLed[i].xy) / uMm;
    vec3 c = uColor[i];
    float top = max(c.r, max(c.g, c.b));
    vec3 deep = top > 0.0 ? pow(c / top, vec3(${VIVID.toFixed(3)})) * top : c;
    float core = ${CORE.toFixed(3)} * exp(-mm * mm / ${(CORE_MM * CORE_MM).toFixed(3)});
    float h = mm / ${HALO_MM.toFixed(3)};
    float halo = ${HALO.toFixed(3)} * exp(-h * h) + ${RAY.toFixed(3)} / (mm + ${RAY_MM.toFixed(3)}) * exp(-mm / ${RAY_REACH.toFixed(3)});
    light += (mix(c, vec3(top), ${WHITE.toFixed(3)}) * core + deep * halo) * uLed[i].z;
  }
  light = 1.0 - exp(-light);
  // premultiplied: added to the board, and over the page's own spotlight where the canvas is clear
  gl_FragColor = vec4(light, max(light.r, max(light.g, light.b)));
}`;

/* One screen-filling quad for `count` LEDs. Call update() before each render. */
export const createLedGlow = (count) => {
  const uniforms = {
    uLed: { value: Array.from({ length: count }, () => new THREE.Vector3()) },
    uColor: { value: Array.from({ length: count }, () => new THREE.Color(0, 0, 0)) },
    uMm: { value: 0.01 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader: fragmentShader(count),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;

  const at = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  /* leds: [{ group, color: [r, g, b] }] in LED order; front: the board's front face, an Object3D whose
     +z points out of the LEDs; mm: screen units per millimetre at the board */
  const update = (leds, front, camera, mm) => {
    normal.set(0, 0, 1).transformDirection(front.matrixWorld);
    leds.forEach((led, i) => {
      at.set(0, 0, 1.6).applyMatrix4(led.group.matrixWorld); // the top of the lens
      toCamera.copy(camera.position).sub(at).normalize();
      const facing = THREE.MathUtils.smoothstep(normal.dot(toCamera), 0, 0.35);
      at.project(camera);
      uniforms.uLed.value[i].set(at.x * 0.5 + 0.5, at.y * 0.5 + 0.5, facing);
      uniforms.uColor.value[i].setRGB(...led.color);
    });
    uniforms.uMm.value = mm;
  };
  return { mesh, update };
};
