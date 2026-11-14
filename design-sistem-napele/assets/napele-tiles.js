/* Napele hero background: tilted wall of photo columns scrolling past, on a 3D plane.
   Builds .np-tiles inside every hero host (.elementor-element-d4f0def): the Overview hero and the Components specimens.
   Photo list, tilt, perspective and speed live here; look and veil live in napele.css.
   Tilt, perspective, gap, plane size and parallax follow the public prop table of React Bits "Tilted Tiles". */
(function () {
  var script = document.currentScript;
  var heroBase = new URL('hero/', script.src).href;
  var base = heroBase + 'tiles/';

  // real before/after photos (Hero/Imagens- Animação-Hero/, resized to WebP in assets/hero/tiles/). The numbering already
  // spreads shots of the same patient apart, so consecutive tiles in a column do not repeat a face.
  var PHOTOS = [
    'tile-01.webp', 'tile-02.webp', 'tile-03.webp', 'tile-04.webp', 'tile-05.webp', 'tile-06.webp',
    'tile-07.webp', 'tile-08.webp', 'tile-09.webp', 'tile-10.webp', 'tile-11.webp', 'tile-12.webp',
    'tile-13.webp', 'tile-14.webp', 'tile-15.webp', 'tile-16.webp', 'tile-17.webp', 'tile-18.webp',
    'tile-19.webp', 'tile-20.webp', 'tile-21.webp', 'tile-22.webp', 'tile-23.webp'
  ];
  var ROTATE = { x: 40, y: 16, z: -20 };  // deg: leans back, turns sideways, spins in its own plane
  var PERSPECTIVE = 1600;                 // px
  var PARALLAX = 0;                       // max extra deg from the pointer (React Bits default is 8); 0 = off
  var GAP = 8;                            // px between tiles and columns
  var ASPECT = 1;                         // tile width / height
  var SPEED = 52;                         // px/s, same for every column; even columns run the other way
  var VEIL = 'dark';                      // 'cream' (Nudik light) or 'dark' (Nudik near-black): colour of the text-protection veil
  var STACKED_MAX = 767;                  // host width at or below which the layout is the stacked (mobile) one

  // cut-out portrait in front of the wall (Hero/HeroNayana.png, cropped and exported to assets/hero/)
  var PERSON = { sm: 'hero-nayana-900.webp', lg: 'hero-nayana-1600.webp', alt: 'Nayana' };

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // grows with the hero so the column count stays near 14 on any screen
  function tileWidth(w) { return Math.max(150, Math.min(520, Math.round(w * 0.2))); }

  // Exact plane size: project the hero corners and edge midpoints back onto the tilted plane (the inverse of
  // perspective + rotateX/Y/Z) and take their bounding box. A fixed multiple of the hero left the far corner
  // (top right: pushed away by both rotateX and rotateY) empty, because perspective shrinks it toward the centre.
  function backProject(m, X, Y) {
    var P = PERSPECTIVE;
    var a1 = m.m11 + X * m.m13 / P, b1 = m.m21 + X * m.m23 / P, c1 = X * (1 - m.m43 / P) - m.m41;
    var a2 = m.m12 + Y * m.m13 / P, b2 = m.m22 + Y * m.m23 / P, c2 = Y * (1 - m.m43 / P) - m.m42;
    var det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-9) return null;
    var u = (c1 * b2 - c2 * b1) / det, v = (a1 * c2 - a2 * c1) / det;
    var w = 1 - (m.m13 * u + m.m23 * v + m.m43) / P;
    return w > 0.05 ? { u: u, v: v } : null;   // null: that pixel lies at or beyond the horizon of the plane
  }

  function planeBounds(w, h) {
    var b = { minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity };
    var cap = 6 * Math.max(w, h), horizon = false;
    var pts = [[-w / 2, -h / 2], [0, -h / 2], [w / 2, -h / 2], [w / 2, 0], [w / 2, h / 2], [0, h / 2], [-w / 2, h / 2], [-w / 2, 0]];
    var steps = PARALLAX ? [-1, 0, 1] : [0];   // cover the pointer tilt extremes too
    steps.forEach(function (dx) {
      steps.forEach(function (dy) {
        var m = new DOMMatrix('rotateX(' + (ROTATE.x - dy * PARALLAX) + 'deg) rotateY(' + (ROTATE.y + dx * PARALLAX) + 'deg) rotateZ(' + ROTATE.z + 'deg)');
        pts.forEach(function (p) {
          var r = backProject(m, p[0], p[1]);
          if (!r) { horizon = true; return; }
          b.minU = Math.min(b.minU, r.u); b.maxU = Math.max(b.maxU, r.u);
          b.minV = Math.min(b.minV, r.v); b.maxV = Math.max(b.maxV, r.v);
        });
      });
    });
    if (horizon) { b.minU = Math.min(b.minU, -cap); b.maxU = Math.max(b.maxU, cap); b.minV = Math.min(b.minV, -cap); b.maxV = Math.max(b.maxV, cap); }
    return b;
  }

  function build(host) {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;

    var tileW = tileWidth(w);
    var tileH = Math.round(tileW / ASPECT);
    var pitch = tileW + GAP;
    var bounds = planeBounds(w, h);
    // plane box in plane coordinates (origin = hero centre, v down), one tile of margin on every side
    var left = Math.floor((bounds.minU - pitch) / pitch) * pitch;
    var top = Math.floor(bounds.minV - pitch);
    var cols = Math.ceil((bounds.maxU + pitch - left) / pitch);
    var planeW = cols * pitch - GAP;
    var planeH = Math.ceil(bounds.maxV + pitch - top);
    var stacked = w <= STACKED_MAX;

    // one half-list must be taller than the plane, else the loop would show a gap
    var unit = PHOTOS.length * (tileH + GAP);
    var reps = Math.max(1, Math.ceil(planeH / unit));
    var half = unit * reps;

    var wall = host.querySelector(':scope > .np-tiles');
    var key = [tileW, cols, planeH, reps, left, top].join('|');
    if (wall && wall.dataset.key === key) { wall.dataset.layout = stacked ? 'stacked' : 'wide'; return; }
    if (wall) wall.remove();

    wall = document.createElement('div');
    wall.className = 'np-tiles';
    wall.setAttribute('aria-hidden', 'true');
    wall.dataset.key = key;
    wall.dataset.layout = stacked ? 'stacked' : 'wide';
    wall.style.setProperty('--np-persp', PERSPECTIVE + 'px');
    wall.style.setProperty('--np-rx', ROTATE.x + 'deg');
    wall.style.setProperty('--np-ry', ROTATE.y + 'deg');
    wall.style.setProperty('--np-rz', ROTATE.z + 'deg');
    wall.style.setProperty('--np-tile-w', tileW + 'px');
    wall.style.setProperty('--np-tile-h', tileH + 'px');
    wall.style.setProperty('--np-gap', GAP + 'px');
    wall.style.setProperty('--np-plane-w', planeW + 'px');
    wall.style.setProperty('--np-plane-h', planeH + 'px');
    // the plane is placed so that its origin (rotation centre) sits on the hero centre
    wall.style.setProperty('--np-plane-left', 'calc(50% + ' + left + 'px)');
    wall.style.setProperty('--np-plane-top', 'calc(50% + ' + top + 'px)');
    wall.style.setProperty('--np-origin', (-left) + 'px ' + (-top) + 'px');

    var inner = document.createElement('div');
    inner.className = 'np-tiles__wall';

    var dur = half / SPEED;
    for (var c = 0; c < cols; c++) {
      var col = document.createElement('div');
      col.className = 'np-tiles__col';
      var track = document.createElement('div');
      track.className = 'np-tiles__track';
      track.style.setProperty('--np-dur', dur.toFixed(1) + 's');
      // head start in px (mod one tile) so tile edges do not line up across columns
      var shift = ((c * 0.37) % 1) * (tileH + GAP);
      track.style.setProperty('--np-delay', '-' + (shift / SPEED).toFixed(2) + 's');

      var start = (c * 3) % PHOTOS.length;
      for (var copy = 0; copy < 2 * reps; copy++) {
        for (var i = 0; i < PHOTOS.length; i++) {
          var img = document.createElement('img');
          img.className = 'np-tiles__tile';
          img.src = base + PHOTOS[(start + i) % PHOTOS.length];
          img.alt = '';
          img.decoding = 'async';
          img.draggable = false;
          track.appendChild(img);
        }
      }
      col.appendChild(track);
      inner.appendChild(col);
    }
    wall.appendChild(inner);
    host.insertBefore(wall, host.firstChild);
  }

  function ensurePerson(host) {
    if (document.body.classList.contains('np-treatment')) return;   // the treatment page has no portrait: its hero is a short banner (napele.css)
    if (host.querySelector(':scope > .np-person')) return;
    var img = document.createElement('img');
    img.className = 'np-person';
    img.srcset = heroBase + PERSON.sm + ' 900w, ' + heroBase + PERSON.lg + ' 1600w';
    img.sizes = '(max-width: 767px) 100vw, 50vw';
    img.src = heroBase + PERSON.lg;
    img.alt = PERSON.alt;
    img.decoding = 'async';
    img.draggable = false;
    var wall = host.querySelector(':scope > .np-tiles');
    // after the wall, so the stacked-layout rule can use the sibling selector
    if (wall) wall.insertAdjacentElement('afterend', img);
    else host.insertBefore(img, host.firstChild);
  }

  function bindParallax(host) {
    if (!PARALLAX || reduced) return;
    host.addEventListener('pointermove', function (e) {
      var wall = host.querySelector(':scope > .np-tiles');
      if (!wall) return;
      var r = host.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      var y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      wall.style.setProperty('--np-px', (x * PARALLAX).toFixed(2));
      wall.style.setProperty('--np-py', (y * PARALLAX).toFixed(2));
    });
    host.addEventListener('pointerleave', function () {
      var wall = host.querySelector(':scope > .np-tiles');
      if (!wall) return;
      wall.style.setProperty('--np-px', 0);
      wall.style.setProperty('--np-py', 0);
    });
  }

  // Stacked layout: the portrait is anchored to the headline (napele.css): her bottom edge sits PORTRAIT_OVERLAP below the first line of text,
  // under a dark gradient, and she grows upward from there, up to PORTRAIT_TOP below the top of the hero. So her height depends on where the
  // text starts, which depends on the copy (a 4-line title on a phone pushes it up). Measured here instead of guessed in CSS:
  // --np-text-top = distance from the top of the hero to the first visible line of text. Without room for a recognisable
  // portrait (under PORTRAIT_MIN tall) she is hidden.
  // She tops out at PORTRAIT_MAX x the width of the hero (napele.css: 140cqw). On a tall, narrow screen that leaves a gap of bare wall above
  // her, so on the Overview the hero is shortened to what she and the text need (never past the 100svh it normally has: on a short
  // screen she just takes the height that is left).
  var PORTRAIT_TOP = 112;                 // px: the highest her top edge may be (keep in step with napele.css)
  var PORTRAIT_OVERLAP = 60;              // px: her bottom edge below the first line of text, hidden by the gradient (same)
  var PORTRAIT_MAX = 1.4;                 // her tallest height, as a share of the hero's width (same: 140cqw)
  var PORTRAIT_MIN = 240;                 // px
  var PORTRAIT_TEXT_BLOCK = 312;          // px: assumed height of the text block under her when the hero has no text (a specimen)

  // distance from the top of the hero to the first visible line of text, or null if the hero has none
  function textTop(host, content) {
    var top = Infinity;
    [].forEach.call(content.querySelectorAll('h1, p, .elementor-button'), function (el) {
      if (!el.offsetParent) return;       // hidden on this breakpoint
      top = Math.min(top, el.getBoundingClientRect().top);
    });
    if (top === Infinity) return null;
    // relative to the content box, so the scroll fade (a translateY on it) does not skew the measure
    return content.offsetTop + (top - content.getBoundingClientRect().top);
  }

  function fitPortrait(host) {
    var wall = host.querySelector(':scope > .np-tiles');
    var content = host.querySelector(':scope > .e-con-inner');
    if (!host.querySelector(':scope > img.np-person')) {             // no portrait on this page: nothing to size, and no gradient for her
      host.style.removeProperty('--np-text-top');
      host.style.removeProperty('--min-height');
      host.setAttribute('data-np-no-portrait', '');
      return;
    }
    if (!wall || wall.dataset.layout !== 'stacked' || !content) {
      host.style.removeProperty('--np-text-top');
      host.style.removeProperty('--min-height');
      host._npNeed = 0;
      host.removeAttribute('data-np-no-portrait');
      return;
    }
    var rel = textTop(host, content);
    if (rel !== null && document.body.matches('.home')) {
      var cs = getComputedStyle(host);
      var width = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var below = host.clientHeight - rel;                 // first line of text to the bottom of the hero: the same whatever height the hero has
      var need = Math.round(below + PORTRAIT_TOP - PORTRAIT_OVERLAP + PORTRAIT_MAX * width);
      if (Math.abs(need - (host._npNeed || 0)) > 1) {      // not for a 1px wobble, it would keep the observer busy
        host._npNeed = need;
        host.style.setProperty('--min-height', 'min(100svh,' + need + 'px)');
        rel = textTop(host, content);                      // measure again: the text moved with the hero
      }
    }
    // a specimen without text: estimated from the height of the hero itself (the CSS fallback counts from the height of the window,
    // which is not the specimen's)
    if (rel === null) rel = host.clientHeight - PORTRAIT_TEXT_BLOCK;
    host.style.setProperty('--np-text-top', Math.round(rel) + 'px');
    if (rel + PORTRAIT_OVERLAP - PORTRAIT_TOP < PORTRAIT_MIN) host.setAttribute('data-np-no-portrait', '');
    else host.removeAttribute('data-np-no-portrait');
  }

  function init() {
    var hosts = document.querySelectorAll('.elementor-element-d4f0def');
    hosts.forEach(function (host) { host.dataset.npVeil = VEIL; build(host); ensurePerson(host); bindParallax(host); fitPortrait(host); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { hosts.forEach(fitPortrait); });
    if (!window.ResizeObserver) return;
    var timer;
    var ro = new ResizeObserver(function (entries) {
      clearTimeout(timer);
      timer = setTimeout(function () { entries.forEach(function (e) { build(e.target); fitPortrait(e.target); }); }, 150);
    });
    hosts.forEach(function (host) { ro.observe(host); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
