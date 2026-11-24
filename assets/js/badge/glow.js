// The light of the board's LEDs, drawn over the 3D scene in one pass (stage.js). Written for this page
// after the look of glow shaders like Xor's "LED" on fragcoord.xyz (no code taken from it).
// How each LED's light falls off is in led-light.js, which the phone remote uses too.
import * as THREE from 'three';
import { LIGHT } from './led-light.js';

const f = (v) => v.toFixed(3); // a number written into the shader

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
uniform float uMm;          // one millimetre at the board, in screen widths
uniform float uTall;        // the canvas's height over its width
varying vec2 vUv;
void main() {
  vec3 light = vec3(0.0);
  for (int i = 0; i < COUNT; i++) {
    float mm = distance(vUv * vec2(1.0, uTall), uLed[i].xy * vec2(1.0, uTall)) / uMm;
    vec3 c = uColor[i];
    float top = max(c.r, max(c.g, c.b));
    vec3 deep = top > 0.0 ? pow(c / top, vec3(${f(LIGHT.vivid)})) * top : c;
    float core = ${f(LIGHT.core)} * exp(-mm * mm / ${f(LIGHT.coreMm * LIGHT.coreMm)});
    float h = mm / ${f(LIGHT.haloMm)};
    float halo = ${f(LIGHT.halo)} * exp(-h * h) + ${f(LIGHT.ray)} / (mm + ${f(LIGHT.rayMm)}) * exp(-mm / ${f(LIGHT.rayReach)});
    light += (mix(c, vec3(top), ${f(LIGHT.white)}) * core + deep * halo) * uLed[i].z;
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
    uTall: { value: 1 },
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
     +z points out of the LEDs; mm: screen widths per millimetre at the board; tall: the canvas's height
     over its width; covered: 0 to 1, how far a front cover hides the LEDs */
  const update = (leds, front, camera, mm, tall, covered = 0) => {
    normal.set(0, 0, 1).transformDirection(front.matrixWorld);
    leds.forEach((led, i) => {
      at.set(0, 0, 1.6).applyMatrix4(led.group.matrixWorld); // the top of the lens
      toCamera.copy(camera.position).sub(at).normalize();
      const facing = THREE.MathUtils.smoothstep(normal.dot(toCamera), 0, 0.35);
      at.project(camera);
      uniforms.uLed.value[i].set(at.x * 0.5 + 0.5, at.y * 0.5 + 0.5, facing * (1 - covered));
      uniforms.uColor.value[i].setRGB(...led.color);
    });
    uniforms.uMm.value = mm;
    uniforms.uTall.value = tall;
  };
  return { mesh, update };
};
