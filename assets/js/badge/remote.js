// The phone on /badge: the badge's own remote page (the firmware's remote/page.html, as drawn in the
// "How the remote works" video), working. Pick one of the 12 effects, a palette or the brightness and
// the preview runs it with the firmware's light code (sim.js), the way the badge would.
// The page inside the phone stays in English, as the real remote page is.
// Without JavaScript the phone stays hidden and the text beside it still explains the remote.
import { Sim, PALETTES, EFFECTS, LEDMM, blendTowardPalette, drawBadge, disp } from './sim.js';
import { paintLedLight } from './led-light.js';

const TICK_MS = 17;
const LOGICAL_W = 390; // the remote page is laid out for a 390 px wide phone, then zoomed to fit
const START_FX = EFFECTS.findIndex((e) => e.key === 'inoise8_fire');
const START_PAL = 6; // Party
const START_BRI = 32;

const el = (tag, cls, text, parent) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  if (parent) parent.append(node);
  return node;
};
// The badge as sim.js draws it, then the same light over each LED as on the 3D board (led-light.js).
// The scale and offsets repeat how drawBadge fits the 75 x 59.3 mm board into the canvas.
const drawLit = (cv, L, o) => {
  drawBadge(cv, L, o);
  const s = Math.min(cv.width / 80, cv.height / 64);
  const ox = (cv.width - 75 * s) / 2;
  const oy = (cv.height - 59.3 * s) / 2;
  const leds = L.map((c, i) => ({ x: ox + LEDMM[i][0] * s, y: oy + LEDMM[i][1] * s, color: c.map((v) => disp(v, o.bri)) }));
  paintLedLight(cv.getContext('2d'), leds, s);
};
const swatch = (pal) => `linear-gradient(90deg,${pal.entries.map((c, k) => `rgb(${c[0]},${c[1]},${c[2]}) ${((k / 15) * 100).toFixed(1)}%`).join(',')})`;

const mountRemote = (root) => {
  const screen = root.querySelector('[data-remote-screen]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---- the page ----
  const page = el('div', 'rp', null, screen);
  el('div', 'rp__status', null, page).append(el('i', 'rp__island'));
  el('div', 'rp__url', null, page).append(el('span', null, 'joya.local'));
  const wrap = el('div', 'rp__wrap', null, page);
  const head = el('div', 'rp__head', null, wrap);
  el('p', 'rp__title', 'Joya Badge 8A3F', head);
  el('p', 'rp__sub', 'joya.local', head);
  const stage = el('div', 'rp__stage', null, wrap);
  const main = el('canvas', null, null, stage);
  main.width = 1200;
  main.height = 950;
  main.setAttribute('aria-hidden', 'true');
  const now = el('div', 'rp__now', null, stage);
  const nowFx = el('b', null, null, now);
  const nowPal = el('span', null, null, now);

  const lab = (name) => {
    const row = el('div', 'rp__lab', null, wrap);
    el('span', null, name, row);
    return el('b', null, null, row);
  };
  const fxLabel = lab('Effect');
  const grid = el('div', 'rp__grid', null, wrap);
  const tiles = EFFECTS.map((e, i) => {
    const button = el('button', 'rp__eff', null, grid);
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    const cv = el('canvas', null, null, button);
    cv.width = 300;
    cv.height = 238;
    cv.setAttribute('aria-hidden', 'true');
    el('span', null, e.name, button);
    button.addEventListener('click', () => pickFx(i));
    return { button, cv, sim: new Sim(e.key, 'badge') };
  });
  const palLabel = lab('Palette');
  const pals = el('div', 'rp__pals', null, wrap);
  const swatches = PALETTES.map((p, i) => {
    const button = el('button', 'rp__pal', null, pals);
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', p.name);
    button.style.background = swatch(p);
    button.addEventListener('click', () => pickPal(i));
    return button;
  });
  const briLabel = lab('Brightness');
  const bri = el('input', 'rp__range', null, wrap);
  Object.assign(bri, { type: 'range', min: '4', max: '255', value: String(START_BRI) });
  bri.setAttribute('aria-label', 'Brightness');
  el('p', 'rp__hint', 'The MODE button on the back steps to the next effect; hold it to go back to auto.', wrap);

  // ---- lights ----
  const state = { fx: START_FX, pal: START_PAL, cur: PALETTES[START_PAL].entries.map((c) => c.slice()), tick: 0, start: performance.now() };
  const mainSim = new Sim(EFFECTS[START_FX].key, 'badge');
  const stepTo = (target) => {
    if (target - state.tick > 120) state.tick = target - 120; // back from a hidden tab: skip ahead
    while (state.tick < target) {
      state.tick++;
      const ms = state.tick * TICK_MS;
      blendTowardPalette(state.cur, PALETTES[state.pal].entries, 12);
      mainSim.step(ms, state.cur);
      for (const tile of tiles) tile.sim.step(ms, state.cur);
    }
  };
  let frameNo = 0;
  const draw = (all) => {
    const o = { bri: Number(bri.value) };
    drawLit(main, mainSim.L, o);
    if (all || frameNo % 2 === 0) tiles.forEach((tile) => drawLit(tile.cv, tile.sim.L, { ...o, simple: true }));
    frameNo++;
  };
  const label = () => {
    const fx = EFFECTS[state.fx].name;
    const pal = PALETTES[state.pal].name;
    nowFx.textContent = fx;
    fxLabel.textContent = fx;
    nowPal.textContent = pal;
    palLabel.textContent = pal;
    briLabel.textContent = bri.value;
    tiles.forEach((tile, i) => tile.button.setAttribute('aria-pressed', String(i === state.fx)));
    swatches.forEach((button, i) => button.setAttribute('aria-pressed', String(i === state.pal)));
  };
  // with reduced motion nothing runs on its own: each pick shows a still frame of the result
  const still = () => {
    stepTo(state.tick + 240);
    draw(true);
  };
  const pickFx = (i) => {
    state.fx = i;
    mainSim.set(EFFECTS[i].key, 'badge');
    label();
    if (reduced.matches) still();
  };
  const pickPal = (i) => {
    state.pal = i;
    if (reduced.matches) state.cur = PALETTES[i].entries.map((c) => c.slice());
    label();
    if (reduced.matches) still();
  };
  bri.addEventListener('input', () => {
    label();
    draw(true);
  });

  // ---- size: zoom the 390 px page to the phone's screen ----
  const fit = () => { page.style.zoom = String(screen.clientWidth / LOGICAL_W); };
  new ResizeObserver(fit).observe(screen);

  // ---- loop, only while the phone is on screen ----
  let visible = false;
  let queued = false;
  const frame = (t) => {
    queued = false;
    stepTo(Math.floor((t - state.start) / TICK_MS));
    draw(false);
    schedule();
  };
  const schedule = () => {
    if (queued || !visible || document.hidden || reduced.matches) return;
    queued = true;
    requestAnimationFrame(frame);
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }).observe(root);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);

  label();
  root.hidden = false;
  fit();
  stepTo(300);
  state.start = performance.now() - state.tick * TICK_MS;
  draw(true);
};

const root = document.querySelector('[data-remote]');
if (root) {
  // build it when it comes near the screen, not at load
  const watch = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    watch.disconnect();
    mountRemote(root);
  }, { rootMargin: '400px' });
  watch.observe(root.parentElement);
}
