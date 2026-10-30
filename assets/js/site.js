/* joya-art.org: the one script.
   Header that hides on scroll, mobile menu, highlight shapes, fitted titles, masonry
   galleries, fade-up pictures, YouTube posters, the video player, the marquee.
   Everything here is progressive: without it the pages still read and link correctly. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var raf = window.requestAnimationFrame.bind(window);

  function onResize(fn) {
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(fn, 100);
    });
  }

  /* ---------- header: shrinks and hides when scrolling down, comes back after scrolling
     up 300px, returns to full size at the top. The first section's top padding follows the
     header's height (--header-h), as on the original. ---------- */
  var header = document.getElementById('header');
  var bar = header && header.querySelector('.header__bar');
  if (header && bar) {
    var setHeight = function () {
      root.style.setProperty('--header-h', bar.getBoundingClientRect().height + 'px');
    };
    // border-box: the bar's height changes through its padding when it shrinks
    if ('ResizeObserver' in window) new ResizeObserver(setHeight).observe(bar, { box: 'border-box' });
    setHeight();

    var lastY = window.scrollY;
    var upTravel = 0;
    var TOP = 10;          // px: within this distance of the top the header is full size
    var REVEAL = 300;      // px of upward scrolling that bring a hidden header back
    var update = function () {
      var y = window.scrollY;
      if (root.classList.contains('menu-open')) return;
      if (y <= TOP) {
        header.classList.remove('is-shrunk', 'is-hidden');
        upTravel = 0;
      } else if (y > lastY) {
        header.classList.add('is-shrunk', 'is-hidden');
        upTravel = 0;
      } else if (y < lastY) {
        upTravel += lastY - y;
        if (upTravel >= REVEAL) header.classList.remove('is-hidden');
      }
      lastY = y;
    };
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      raf(function () { ticking = false; update(); });
    }, { passive: true });
  }

  /* ---------- mobile menu ---------- */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');
  if (burger && menu) {
    var setOpen = function (open) {
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close Menu' : 'Open Menu');
      if (open) {
        header.classList.remove('is-hidden');
        var first = menu.querySelector('a');
        // once the menu has become visible
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 50);
      }
    };
    burger.addEventListener('click', function () {
      setOpen(!root.classList.contains('menu-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) {
        setOpen(false);
        burger.focus();
      }
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
  }

  /* ---------- highlight shapes behind words: one shape per line the words occupy.
     Path formulas: W x H is the box of the words on that line. ---------- */
  var SHAPES = {
    marker: function (W, H) {
      return 'M 0,' + H * 0.55 + ' c ' + W / 8 + ',0 ' + W / 4 + ',0 ' + W / 2 + ',0 c ' + W / 4 + ',0 ' + W * 3 / 8 + ',0 ' + W / 2 + ',0';
    },
    underlineCurve: function (W, H) {
      return 'M 0,' + H * 0.99 +
        ' c ' + W / 8 + ',' + -H * 0.0275 + ' ' + W / 4 + ',' + -H * 0.085 + ' ' + W / 2 + ',' + -H * 0.11 +
        ' c ' + W / 4 + ',' + -H * 0.025 + ' ' + W * 0.38 + ',0 ' + W / 2 + ',' + H * 0.01 +
        ' c ' + W * 0.024 + ',' + H * 0.002 + ' ' + -W * 0.019 + ',' + H * 0.0285 + ' ' + -W * 0.02 + ',' + H * 0.03;
    },
    circle: function (W, H) {
      // the ellipse overshoots the words by 10px left and right, 5px above and below
      var X = function (p) { return p * (W + 20) - 10; };
      var Y = function (q) { return q * (H + 10) - 5; };
      return 'M' + X(0.35) + ',' + Y(0.95) +
        ' C ' + X(0.554) + ',' + Y(0.994) + ' ' + X(1) + ',' + Y(0.94) + ' ' + X(1) + ',' + Y(0.52) +
        ' C ' + X(1) + ',' + Y(0.165) + ' ' + X(0.706) + ',0 ' + X(0.496) + ',0' +
        ' S ' + X(0.01) + ',' + Y(0.165) + ' ' + X(0.01) + ',' + Y(0.508) +
        ' S ' + X(0.241) + ',' + Y(1.039) + ' ' + X(0.74) + ',' + Y(0.994);
    },
    scribble: function (W, H) {
      var c = function (a) {
        return ' c ' + a.map(function (v, i) { return i % 2 ? v * H : v * W; }).reduce(function (s, v, i) {
          return s + (i ? (i % 2 ? ',' : ' ') : '') + v;
        }, '');
      };
      return 'M 0,' + H * 0.88 +
        c([0.075, -0.0045, 0.35, -0.033, 0.5, -0.03]) +
        c([0.15, 0.003, 0.485, 0.05, 0.5, 0.05]) +
        c([0.015, 0, -0.265, -0.0575, -0.4, -0.05]) +
        c([-0.135, 0.0075, -0.485, 0.088, -0.5, 0.1]) +
        c([-0.015, 0.012, 0.295, -0.02, 0.4, -0.02]) +
        c([0.105, 0, 0.3, 0.0095, 0.3, 0.02]) +
        c([0, 0.0105, -0.225, 0.0425, -0.3, 0.05]) +
        c([-0.075, 0.0075, -0.17, 0, -0.2, 0]);
    }
  };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var drawObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      drawObserver.unobserve(en.target);
      en.target.classList.add('is-drawn');
      var path = en.target.querySelector('path');
      var len = parseFloat(path.getAttribute('stroke-dasharray'));
      if (reduceMotion.matches) { path.setAttribute('stroke-dashoffset', 2 * len); return; }
      var t0 = null;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 500);
        path.setAttribute('stroke-dashoffset', len + len * k);
        if (k < 1) raf(step);
      };
      raf(step);
    });
  }, { threshold: 0.5 }) : null;

  function drawHighlights() {
    document.querySelectorAll('.text').forEach(function (box) {
      var spans = box.querySelectorAll('.hl[data-shape]');
      if (!spans.length) return;
      box.querySelectorAll('.hl-shape').forEach(function (n) { n.remove(); });
      var base = box.getBoundingClientRect();
      spans.forEach(function (span) {
        var shape = SHAPES[span.dataset.shape];
        if (!shape) return;
        var cs = getComputedStyle(span);
        var fontSize = Math.round(parseFloat(cs.fontSize));
        var color = cs.getPropertyValue('--hl-color').trim() || 'var(--highlight)';
        var width = cs.getPropertyValue('--hl-width').trim() || '0.1em';
        var animate = span.hasAttribute('data-draw') && drawObserver;
        Array.prototype.forEach.call(span.getClientRects(), function (r) {
          if (r.width < 1) return;
          var W = Math.round(r.width);
          var H = Math.round(r.height);
          var node = document.createElement('div');
          node.className = 'hl-shape' + (span.classList.contains('hl--front') ? ' is-front' : '');
          node.setAttribute('aria-hidden', 'true');
          node.style.cssText = 'font-size:' + fontSize + 'px;--stroke:' + color + ';--stroke-width:' + width +
            ';width:' + W + 'px;height:' + H + 'px;left:' + Math.round(r.left - base.left) + 'px;top:' + Math.round(r.top - base.top) + 'px';
          var svg = document.createElementNS(SVGNS, 'svg');
          var path = document.createElementNS(SVGNS, 'path');
          path.setAttribute('d', shape(W, H));
          svg.appendChild(path);
          node.appendChild(svg);
          box.appendChild(node);
          var len = Math.ceil(path.getTotalLength());
          path.setAttribute('stroke-dasharray', len);
          if (animate && !span.dataset.drawn) {
            path.setAttribute('stroke-dashoffset', len);
            drawObserver.observe(node);
          } else {
            path.setAttribute('stroke-dashoffset', 2 * len);
          }
        });
        span.dataset.drawn = '1';
      });
    });
  }

  /* ---------- titles fitted to their block's width (font size rounded to 0.1px) ---------- */
  function fitTitles() {
    document.querySelectorAll('[data-fit]').forEach(function (box) {
      var inner = box.firstElementChild;
      box.classList.add('is-fitted');
      inner.style.fontSize = '100px';
      var natural = inner.getBoundingClientRect().width;
      var avail = box.clientWidth;   // whole pixels, as the original measured it
      if (natural > 0) inner.style.fontSize = Math.round(avail / natural * 1000) / 10 + 'px';
    });
  }

  /* ---------- masonry: equal columns; each picture goes under the shortest column (the
     leftmost on a tie). Heights are rounded up to whole pixels, as on the original. ---------- */
  function layoutMasonry() {
    document.querySelectorAll('[data-masonry]').forEach(function (g) {
      var cols = parseInt(getComputedStyle(g).getPropertyValue('--cols'), 10) || 2;
      var gutter = parseFloat(getComputedStyle(g).getPropertyValue('--col-gap')) || 0;
      var wrap = g.querySelector('.masonry__wrap');
      var inner = wrap.clientWidth;   // whole pixels, as the original measured it
      var colW = (inner - (cols - 1) * gutter) / cols;
      var w = Math.round(colW);
      var heights = [];
      for (var i = 0; i < cols; i++) heights.push(0);
      g.classList.add('is-laid-out');
      g.querySelectorAll('.masonry__item').forEach(function (item) {
        var ar = item.style.getPropertyValue('--ar').split('/');
        var dw = parseFloat(ar[0]);
        var dh = parseFloat(ar[1]);
        var aspect = dw / dh;
        var h = Math.ceil(colW / aspect);
        var c = heights.indexOf(Math.min.apply(null, heights));
        var x = Math.round(c * (colW + gutter));
        item.style.width = w + 'px';
        item.style.height = h + 'px';
        item.style.transform = 'translate3d(' + x + 'px,' + heights[c] + 'px,0)';
        // as the original's image loader did (measured on 2,112 live pictures: 85% get the same
        // width, all but three within a pixel): when the picture at the column's width, rounded
        // to whole pixels, is shorter than the box, it is widened to fill the box's height,
        // rounded up to a whole pixel
        var img = item.querySelector('img');
        // (scale = box height / upload height, width = upload width x scale, computed in that
        // order: the floating-point remainder is what tips some widths up a pixel)
        img.style.width = Math.round(w * dh / dw) < h ? Math.ceil(dw * (h / dh)) + 'px' : '';
        heights[c] += h + gutter;
      });
      wrap.style.height = Math.max.apply(null, heights) - gutter + 'px';
    });
  }

  /* ---------- fade-up pictures ---------- */
  function initFadeUp() {
    var items = document.querySelectorAll('[data-animate="fade-up"] .masonry__item, [data-animate="fade-up"] .grid__item');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (i) { i.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach(function (i) { io.observe(i); });
  }

  /* ---------- YouTube posters, laid out as the original's image loader did: the picture is
     treated as 100:67, as wide as the box rounded up to a whole pixel, centred on the box's
     height rounded up (and stretched to that shape, not cropped) ---------- */
  function layoutPosters() {
    document.querySelectorAll('.video__thumb').forEach(function (img) {
      var box = img.parentElement.getBoundingClientRect();
      var w = Math.ceil(box.width);
      var h = w * 0.67;
      img.style.width = w + 'px';
      img.style.height = h + 'px';
      img.style.top = (Math.ceil(box.height) - h) / 2 + 'px';
      img.classList.add('is-placed');
    });
  }

  /* ---------- YouTube posters: click (or Enter / Space on the button) loads the player ---------- */
  document.querySelectorAll('[data-video]').forEach(function (box) {
    var start = function () {
      if (box.classList.contains('is-playing')) return;
      var f = document.createElement('iframe');
      f.src = box.dataset.video;
      f.title = 'YouTube video';
      f.allow = 'autoplay; fullscreen';
      f.setAttribute('allowfullscreen', '');
      box.appendChild(f);
      box.classList.add('is-playing');
      f.focus();
    };
    box.querySelector('.video__overlay').addEventListener('click', start);
  });

  /* ---------- the video player on Joya Crystallized ---------- */
  document.querySelectorAll('[data-player]').forEach(function (box) {
    var video = box.querySelector('video');
    var play = box.querySelector('.player__play');
    var start = function () {
      box.classList.add('is-playing');
      video.play();
      video.focus();
    };
    play.addEventListener('click', start);
    box.querySelector('.player__poster').addEventListener('click', start);
  });

  /* ---------- marquee: the words drift right at 60px a second ---------- */
  function initMarquees() {
    document.querySelectorAll('[data-marquee]').forEach(function (m) {
      var track = m.querySelector('.marquee__track');
      var item = track.firstElementChild;
      var dir = m.dataset.direction === 'right' ? 1 : -1;
      var speed = 60 * (parseFloat(m.dataset.speed) || 1);
      var pos = 0;
      var last = null;
      var step = function (t) {
        var pitch = item.getBoundingClientRect().width;
        if (last !== null && !reduceMotion.matches) pos = (pos + dir * speed * (t - last) / 1000) % pitch;
        last = t;
        track.style.transform = 'translateX(' + (pos - pitch) + 'px)';
        raf(step);
      };
      raf(step);
    });
  }

  function layoutAll() {
    fitTitles();
    layoutMasonry();
    layoutPosters();
    drawHighlights();
  }

  layoutAll();
  initFadeUp();
  initMarquees();
  onResize(layoutAll);
  // text metrics change when a web font arrives: measure again each time one does
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(layoutAll);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', layoutAll);
  }
  window.addEventListener('load', layoutAll);
})();
