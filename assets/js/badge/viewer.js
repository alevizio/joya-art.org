// Starts the /badge 3D viewer (stage.js) once the page has loaded, is idle and the viewer is near
// the screen, so three.js (176 KB gzipped) never slows the first paint. Until then, and for good
// when the browser has no WebGL or anything fails, the still picture stays and the buttons stay hidden.
const root = document.querySelector('[data-viewer]');

const hasWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (error) {
    return false;
  }
};

const whenIdle = () => new Promise((resolve) => {
  const go = () => ('requestIdleCallback' in window ? window.requestIdleCallback(resolve, { timeout: 1500 }) : setTimeout(resolve, 200));
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
});

const whenNear = (node) => new Promise((resolve) => {
  const watch = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    watch.disconnect();
    resolve();
  }, { rootMargin: '300px' });
  watch.observe(node);
});

if (root && hasWebGL()) {
  Promise.all([whenIdle(), whenNear(root)])
    .then(() => import('./stage.js'))
    .then(({ mountViewer }) => mountViewer(root))
    .catch((error) => console.warn('Badge 3D viewer not started:', error));
}
