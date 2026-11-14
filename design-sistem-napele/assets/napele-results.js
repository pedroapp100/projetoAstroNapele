/* Napele results strip (.np-results on the Overview, where the video testimonials section used to be). The markup is static (overview/index.html); this adds:
   - the drift: the photos are copied once and the strip moves left at SPEED px/s on a transform; when it has moved by one copy's length it
     jumps back by that length, which looks the same, so it never ends. The length is measured (half the strip plus half a gap), never
     assumed, and re-measured when the strip's size changes (the photo height changes at 767px). It stands still while the mouse is over
     it, a finger is on it, a photo has the keyboard focus, the lightbox is open, the section is off screen or the tab is hidden, and the
     frame loop stops with it. With prefers-reduced-motion there is no drift and no copies: the strip scrolls sideways by hand.
   - the lightbox: tap / click / Enter on a photo opens its large version (assets/results/NN-lg.webp) with previous / next buttons, a
     counter, the arrow keys and a swipe (55px); Escape, the X or a click outside closes it and the focus goes back to the photo.
   - the reveal on scroll of the headline, the hint, the strip and the note.
   The look is the "Resultados" fold of the Dra. Dani Faccioni page, whose script this one follows (44px/s, pause on hover / touch). */
(function () {
  var section = document.querySelector('.np-results');
  if (!section) return;
  var rail = section.querySelector('.np-results__rail');
  var track = section.querySelector('.np-results__track');
  var items = [].slice.call(track.children);
  if (!items.length) return;

  var SPEED = 44;     // px per second, to the left
  var SWIPE = 55;     // px of horizontal drag that changes the photo in the lightbox
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  section.classList.add('is-js');
  items.forEach(function (el, i) { el.setAttribute('data-i', i); });

  // ---- reveal on scroll
  var reveals = [].slice.call(section.querySelectorAll('.np-reveal'));
  reveals.forEach(function (el, i) { el.style.setProperty('--np-d', (i * 0.15) + 's'); });
  if ('IntersectionObserver' in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        revealIO.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { revealIO.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ---- drift
  var clones = [];
  var loopLen = 0;    // px between a photo and its copy: the distance after which the strip looks the same again
  var x = 0;          // current offset of the strip (<= 0)
  var last = 0;
  var raf = 0;
  var held = { hover: false, touch: false, focus: false, lightbox: false, away: 'IntersectionObserver' in window };

  function paused() { return held.hover || held.touch || held.focus || held.lightbox || held.away || document.hidden; }

  function tick(t) {
    raf = 0;
    if (paused()) { last = 0; return; }                    // the loop stops here; resume() starts it again
    if (!last) last = t;
    var dt = Math.min((t - last) / 1000, 0.1);             // a long gap (hidden tab) is not a long jump
    last = t;
    x -= SPEED * dt;
    if (loopLen > 0 && -x >= loopLen) x += loopLen;
    track.style.transform = 'translate3d(' + x + 'px,0,0)';
    raf = requestAnimationFrame(tick);
  }
  function resume() {
    if (raf || reduce.matches || !clones.length || paused()) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  }
  function hold(key, value) { held[key] = value; resume(); }

  function measure() {
    if (!clones.length) return;
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    var len = (track.getBoundingClientRect().width + gap) / 2;   // 2N photos, 2N-1 gaps: one copy is half of that plus half a gap (exact; a photo growing on hover does not change it)
    if (len <= 0) return;
    if (loopLen > 0 && len !== loopLen) x = x * len / loopLen;   // keep the same photos on screen when the size changes
    loopLen = len;
  }

  function applyMotion() {
    if (reduce.matches) {
      section.classList.add('is-static');
      clones.forEach(function (c) { c.parentNode.removeChild(c); });
      clones = [];
      loopLen = 0;
      x = 0;
      track.style.transform = '';
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      return;
    }
    section.classList.remove('is-static');
    if (!clones.length) {
      items.forEach(function (el) {
        var c = el.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        ['role', 'tabindex', 'aria-label'].forEach(function (a) { c.removeAttribute(a); });
        track.appendChild(c);
        clones.push(c);
      });
    }
    measure();
    resume();
  }

  track.addEventListener('mouseenter', function () { hold('hover', true); });
  track.addEventListener('mouseleave', function () { hold('hover', false); });
  track.addEventListener('touchstart', function () { hold('touch', true); }, { passive: true });
  track.addEventListener('touchend', function () { hold('touch', false); }, { passive: true });
  track.addEventListener('touchcancel', function () { hold('touch', false); }, { passive: true });
  // keyboard: only the real photos take the focus; bring the focused one to the middle of the strip instead of letting the browser
  // scroll the (overflow:hidden) rail
  track.addEventListener('focusin', function (e) {
    var keyboard = true;                                   // a click also focuses a photo: only a keyboard focus stops the strip
    try { keyboard = e.target.matches(':focus-visible'); } catch (err) { /* no :focus-visible: treat as keyboard */ }
    if (!keyboard) return;
    hold('focus', true);
    var item = e.target.closest ? e.target.closest('.np-results__item') : null;
    if (!item || section.classList.contains('is-static')) return;
    rail.scrollLeft = 0;
    x = Math.min(0, (rail.clientWidth - item.offsetWidth) / 2 - item.offsetLeft);
    track.style.transform = 'translate3d(' + x + 'px,0,0)';
  });
  track.addEventListener('focusout', function () { hold('focus', false); });
  rail.addEventListener('scroll', function () { if (!section.classList.contains('is-static')) rail.scrollLeft = 0; });
  document.addEventListener('visibilitychange', resume);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { hold('away', !entries[entries.length - 1].isIntersecting); }, { rootMargin: '200px 0px' }).observe(section);
  }
  if (window.ResizeObserver) new ResizeObserver(measure).observe(track);
  else window.addEventListener('resize', measure);
  if (reduce.addEventListener) reduce.addEventListener('change', applyMotion);
  else if (reduce.addListener) reduce.addListener(applyMotion);
  applyMotion();

  // ---- lightbox
  var lb = document.createElement('div');
  lb.className = 'np-lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Resultado ampliado');
  lb.innerHTML = '<button class="np-lb__x" type="button" aria-label="Fechar">&times;</button>' +
    '<button class="np-lb__nav np-lb__prev" type="button" aria-label="Foto anterior">&#8249;</button>' +
    '<img alt="">' +
    '<button class="np-lb__nav np-lb__next" type="button" aria-label="Próxima foto">&#8250;</button>' +
    '<span class="np-lb__count" aria-live="polite"></span>';
  document.body.appendChild(lb);
  var big = lb.querySelector('img');
  var count = lb.querySelector('.np-lb__count');
  var btnX = lb.querySelector('.np-lb__x');
  var btnPrev = lb.querySelector('.np-lb__prev');
  var btnNext = lb.querySelector('.np-lb__next');
  var current = 0;
  var opener = null;
  var scrollLock = null;

  function full(i) { var im = items[(i + items.length) % items.length].querySelector('img'); return im.getAttribute('data-full') || im.currentSrc || im.src; }
  function show(i) {
    current = (i + items.length) % items.length;
    big.src = full(current);
    big.alt = items[current].querySelector('img').alt;
    count.textContent = (current + 1) + ' de ' + items.length;
    new Image().src = full(current + 1);                   // the next and previous ones are ready before they are asked for
    new Image().src = full(current - 1);
  }
  function tellCatalog(open) {                             // the catalog's navbar floats over the iframe, and over the X
    try { if (window.parent !== window) window.parent.postMessage({ npLightbox: open }, '*'); } catch (e) { /* cross-origin parent: nothing to do */ }
  }
  function open(i, from) {
    opener = from && from.hasAttribute('tabindex') ? from : null;
    show(i);
    lb.classList.add('is-open');
    scrollLock = { html: document.documentElement.style.overflow, body: document.body.style.overflow };
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    hold('lightbox', true);
    tellCatalog(true);
    btnX.focus();
  }
  function close() {
    lb.classList.remove('is-open');
    if (scrollLock) { document.documentElement.style.overflow = scrollLock.html; document.body.style.overflow = scrollLock.body; scrollLock = null; }
    hold('lightbox', false);
    tellCatalog(false);
    if (opener) opener.focus({ preventScroll: true });
  }
  function opens(e) {
    var item = e.target.closest ? e.target.closest('.np-results__item') : null;
    if (item) open(+item.getAttribute('data-i'), item);
  }

  track.addEventListener('click', opens);
  track.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    opens(e);
  });
  btnX.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { show(current - 1); });
  btnNext.addEventListener('click', function () { show(current + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  var startX = 0;
  big.addEventListener('pointerdown', function (e) { startX = e.clientX; });
  big.addEventListener('pointerup', function (e) {
    var d = e.clientX - startX;
    if (d > SWIPE) show(current - 1);
    else if (d < -SWIPE) show(current + 1);
  });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'Tab') {                            // the focus stays inside the lightbox
      var ring = [btnX, btnPrev, btnNext];
      var at = ring.indexOf(document.activeElement);
      var to = e.shiftKey ? (at <= 0 ? ring.length - 1 : at - 1) : (at === ring.length - 1 ? 0 : at + 1);
      e.preventDefault();
      ring[to].focus();
    }
  });
})();
