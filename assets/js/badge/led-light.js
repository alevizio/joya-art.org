// How the light of one LED falls off around it, shared by the 3D board (glow.js, in a shader) and the
// phone remote (remote.js, on a 2D canvas), so both show the same light. Distances in millimetres.
// A white hot centre about the size of the lens, a soft halo in a deeper shade of the LED's colour,
// and a thin 1/d tail that dies out within a few millimetres, so every LED keeps its own light.
// The sum is rolled off with 1 - e^-x, so a bright LED goes white at its centre and keeps its colour
// toward the edge.
export const LIGHT = {
  core: 3.2,      // strength of the hot centre
  coreMm: 1,      // its radius: about the lens
  white: 0.45,    // how far the centre's colour moves toward white: the LEDs show pure hues, with
                  // empty channels that would never roll off to white on their own
  halo: 0.55,     // the halo around the package: halo * e^-(mm / haloMm)^2
  haloMm: 3.5,
  ray: 0.18,      // the thin tail: ray / (mm + rayMm) * e^-(mm / rayReach)
  rayMm: 0.8,
  rayReach: 3.5,
  vivid: 2.2,     // the deeper shade: each channel over the brightest one, to this power
};

const REACH_MM = 12; // past this the light of one LED is under 1/255
const STOPS = 24;

// The strength of the centre and of the halo at each gradient stop, the same for every LED, so worked
// out once. The stops sit closer together near the centre, where the light changes fastest.
const PROFILE = Array.from({ length: STOPS + 1 }, (_, i) => {
  const t = (i / STOPS) ** 2;
  const mm = t * REACH_MM;
  const h = mm / LIGHT.haloMm;
  return {
    t,
    core: LIGHT.core * Math.exp(-(mm * mm) / (LIGHT.coreMm * LIGHT.coreMm)),
    halo: LIGHT.halo * Math.exp(-h * h) + (LIGHT.ray / (mm + LIGHT.rayMm)) * Math.exp(-mm / LIGHT.rayReach),
  };
});

/* Adds the light of each LED ({ x, y, color }, r, g, b from 0 to 1) to a 2D canvas, pxPerMm pixels to
   the millimetre, as the shader in glow.js works it out: one radial gradient per LED. The LEDs'
   lights barely overlap, so adding them comes out as the shader does. */
export const paintLedLight = (ctx, leds, pxPerMm) => {
  const r = REACH_MM * pxPerMm;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const { x, y, color } of leds) {
    const top = Math.max(...color);
    if (top < 0.004) continue;
    const hot = color.map((v) => v + (top - v) * LIGHT.white); // the centre, toward white
    const deep = color.map((v) => Math.pow(v / top, LIGHT.vivid) * top); // the halo, a deeper shade
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    for (const { t, core, halo } of PROFILE) {
      const light = hot.map((v, k) => 1 - Math.exp(-(v * core + deep[k] * halo)));
      // the brightest channel goes in alpha, so where the canvas is clear the light lands on the page
      // behind it and nothing else does (an opaque black stop would cover the page)
      const a = Math.max(...light);
      const [cr, cg, cb] = light.map((v) => (a > 0 ? Math.round((v / a) * 255) : 0));
      g.addColorStop(t, `rgba(${cr},${cg},${cb},${a.toFixed(4)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.restore();
};
