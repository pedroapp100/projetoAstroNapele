/* Napele preloader (Overview page only): the counter of the "Preloader de Cortinas" prototype, then the blinds ("persiana") of the SCS site as its curtain.
   Loaded in <head> after vendor/gsap.min.js. Order of things:
     1. here, at once: html.np-pre-on (napele-preloader.css) locks the page, covers it and hides the hero's content, so nothing flashes;
     2. at DOMContentLoaded: builds #np-pre (counter, line, title, blinds) and the timeline;
     3. at the end: unlocks, removes everything it made, and tells the catalog page (postMessage) that its menu may come in.
   Photo, timings and the hero selector live here; the look lives in napele-preloader.css.
   Phases, in seconds (each phase can be stretched, its inner times scale together):
     1  counter 000 > 100, line slides, block leaves        F.p1   (counter 2 / slide 2.5 / exit 1 / gap 0.5, at 5 s)
     2  the blinds open: the counter's photo, cut into 6      F.p2   (slat 1.35 + 0.08 per extra slat, at the original pace)
        slats, slides off to the left one slat after the other (4 rows sliding down on a tall window), and the hero,
        which has not moved, is uncovered
     3  menu (catalog page) and hero text come in           F.p3   (1.5 s at the original pace) */
(function () {
  'use strict';

  var script = document.currentScript;
  var base = new URL('hero/curtains/', script.src).href;
  var root = document.documentElement;

  // the photo behind the counter (BACKDROP, assets/hero/curtains/; napele-preloader.css points at the same file), a straight copy (no re-encode) of
  // assets/NayanaBgfundopreloader.webp. BgNayanaPreloader.webp (6688x3764) sits in the same folder but is NOT used: it is an upscaled, smoothed version of
  // this photo (0.09 bits per pixel; skin, lashes and hair strands come out plastic), measurably softer than this one at any size. The grain is in napele-preloader.css (no veil, no vignette: the photo shows as it is).
  // The blinds are this same photo, same crop, cut into slats: SLATS_WIDE vertical ones, or SLATS_TALL horizontal ones on a tall window (a phone).
  var BACKDROP = 'bgpreloader-fundo.webp?v=1';   // ?v= : raise it when the photo is replaced under the same name, or a browser keeps showing the old one. 2560x1444 WebP of public/assets/Fundo Preloader  (2).png (the backdrop is drawn 1.12x the window to start with, so it is sharp up to a ~2285 px window at 1x, or a ~1140 px one at 2x)
  var SLATS_WIDE = 6, SLATS_TALL = 4;
  var F = { p1: 6.5, p2: 1.75, p3: 2 };        // 10.25 s in total (the prototype's counter and menu, the blinds of the SCS site at their own pace)
  var HERO = '.elementor-11 .elementor-element.elementor-element-d4f0def';   // the Overview hero (same host as napele-tiles.js)

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = { el: null, skip: null, tl: null, kids: null, done: false };

  // The catalog page hides its menu until phase 3 (napele-nav.js, napele.css). 'on' = running, 'nav' = menu may come in, 'off' = finished or not running.
  function post(msg) {
    try { if (window.parent !== window) window.parent.postMessage({ npPre: msg }, '*'); } catch (err) { /* cross-origin parent: nothing to do */ }
  }

  // Everything this script put on the page, back to how it was
  function release() {
    if (state.kids) gsap.set(state.kids, { clearProps: 'opacity,visibility,transform' });
    if (state.el) state.el.remove();
    if (state.skip) state.skip.remove();
    root.classList.remove('np-pre-on', 'np-pre-ready');
    document.removeEventListener('keydown', onKey);
    post('off');
  }
  function finish() {
    if (state.done) return;
    state.done = true;
    release();
  }

  if (reduced) {                               // reduced motion: no preloader at all, the page opens as it is
    post('off');
    document.addEventListener('DOMContentLoaded', function () { post('off'); });
    return;
  }

  root.classList.add('np-pre-on');
  post('on');

  function skipNow() {
    if (state.done || !state.tl) return;
    state.skip.disabled = true;
    state.tl.pause();
    gsap.to(state.tl, { progress: 1, duration: 0.8, ease: 'power2.inOut', overwrite: true });
  }
  function onKey(e) { if (e.key === 'Escape') skipNow(); }

  // A photo as a CSS background is rastered tile by tile, and the browser does not wait for all the tiles before showing a frame: the late ones
  // are black bands. A photo drawn once into a canvas is a single texture, there whole or not there at all, and from then on the zoom and the
  // curtains only move it. Drawn like background-size:cover, anchored at (px, py), at `zoom` times the size of the host (so it stays sharp
  // while the host is scaled down from that zoom). If anything fails the CSS background takes over, the way it always was.
  function paint(host, file, px, py, zoom) {
    var url = base + file;
    var im = new Image();
    im.src = url;
    return (im.decode ? im.decode() : Promise.reject(new Error('no decode()'))).then(function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = Math.round(host.clientWidth * dpr * zoom), H = Math.round(host.clientHeight * dpr * zoom);
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      cv.className = 'np-pre__cv';
      var ctx = cv.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.imageSmoothingQuality = 'high';
      var s = Math.max(W / im.naturalWidth, H / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      ctx.drawImage(im, (W - dw) * px, (H - dh) * py, dw, dh);
      host.insertBefore(cv, host.firstChild);
      host.classList.add('np-pre--cv');
    }).catch(function () {
      host.style.backgroundImage = 'url("' + url + '")';
    });
  }

  function nextFrame() {
    return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); });
  }

  // The blinds: the backdrop's photo, cropped the same way (cover, anchored at (px, py), at 1x: by the time the blinds open the backdrop has settled
  // at 1x), one canvas per slat. A slat's canvas is its share of the window plus 1 CSS px, the pixel that goes under the next slat: where two slats meet
  // on a fractional pixel there is no hairline of what is behind. One slat is drawn per frame, so no single frame carries them all, and they are put in
  // place together at the end. Resolves true when every slat has its photo; if anything fails it resolves false and the slats stay plain dark (the
  // timeline then fades the backdrop out over them instead of swapping it).
  function paintSlats(host, slats, rows, file, px, py) {
    var im = new Image();
    im.src = base + file;
    return (im.decode ? im.decode() : Promise.reject(new Error('no decode()'))).then(function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var vw = host.clientWidth, vh = host.clientHeight, n = slats.length;
      var W = vw * dpr, H = vh * dpr;
      var s = Math.max(W / im.naturalWidth, H / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      var ox = (W - dw) * px, oy = (H - dh) * py;
      var cvs = [], chain = Promise.resolve();
      slats.forEach(function (slat, i) {
        chain = chain.then(nextFrame).then(function () {
          var cv = document.createElement('canvas');
          cv.width = Math.ceil(rows ? W : (vw / n + 1) * dpr);
          cv.height = Math.ceil(rows ? (vh / n + 1) * dpr : H);
          cv.className = 'np-pre__cv';
          var ctx = cv.getContext('2d');
          if (!ctx) throw new Error('no 2d context');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(im, ox - (rows ? 0 : i * W / n), oy - (rows ? i * H / n : 0), dw, dh);
          cvs.push(cv);
        });
      });
      return chain.then(function () {
        slats.forEach(function (slat, i) { slat.insertBefore(cvs[i], slat.firstChild); });
        return true;
      });
    }).catch(function () { return false; });
  }

  function init() {
    var hero = document.querySelector(HERO);
    if (!window.gsap || !hero) { finish(); return; }   // no GSAP or no hero: never leave the page covered
    gsap.config({ nullTargetWarn: false });

    // the lock only works from the top: the hero is what the blinds uncover and must be where they are
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    window.addEventListener('load', function () { if (!state.done) window.scrollTo(0, 0); });

    // a tall window (phone): the slats are rows and slide down. Decided here, once: the slats are built for that shape and stay as they are if the window turns
    var rows = !!(window.matchMedia && matchMedia('(max-aspect-ratio: 1/1)').matches);
    var n = rows ? SLATS_TALL : SLATS_WIDE;
    var cells = '';
    for (var k = 0; k < n; k++) cells += '<div class="np-pre__cell" style="--i:' + k + '"><div class="np-pre__slat"></div></div>';   // its photo is painted into a canvas (paintSlats(), above)
    var el = document.createElement('div');
    el.id = 'np-pre';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="np-pre__bg"></div>'
      + '<div class="np-pre__blinds np-pre__blinds--' + (rows ? 'rows' : 'cols') + '" style="--n:' + n + '">' + cells + '</div>'
      + '<div class="np-pre__kick"><span class="np-pre__kick-t">Conheça</span><i class="np-pre__kick-rule"></i></div>'
      + '<div class="np-pre__title" translate="no">'
      + '<span class="np-pre__mask"><span class="np-pre__rise np-pre__name">Full Face</span></span>'
      + '<span class="np-pre__mask"><span class="np-pre__rise np-pre__sub"><i class="np-pre__rule"></i><span class="np-pre__sub-t">Fialho</span><i class="np-pre__rule"></i></span></span>'
      + '</div>'
      + '<div class="np-pre__count"><span class="np-pre__label">Carregando</span><span class="np-pre__num">000</span><span class="np-pre__pct">%</span></div>'
      + '<div class="np-pre__line"></div>';
    document.body.insertBefore(el, document.body.firstChild);

    var skip = document.createElement('button');
    skip.id = 'np-pre-skip';
    skip.type = 'button';
    skip.textContent = 'Pular';
    skip.setAttribute('aria-label', 'Pular a animação de abertura');
    skip.addEventListener('click', skipNow);
    document.body.appendChild(skip);
    document.addEventListener('keydown', onKey);

    // np-pre-ready (the black cover over #np-pre comes off) is added below, once the backdrop photo is decoded
    state.el = el; state.skip = skip;
    state.kids = hero.querySelectorAll(':scope > .e-con-inner > *');

    // timings: the prototype's numbers for the counter and the menu, the SCS site's for the blinds (slat 1.35 s, 0.08 s between slats), scaled per phase
    var f1 = F.p1 / 5, f2 = F.p2 / (1.35 + 0.08 * (SLATS_WIDE - 1)), f3 = F.p3 / 1.5;
    var T = { count: 2 * f1, t1: 2 * f1, slide: 2.5 * f1, exitD: 1 * f1, gap: 0.5 * f1,
              dur: 1.35 * f2, stag: 0.08 * f2, fade: 1 * f3, off: 0.5 * f3 };
    var tExit = T.t1 + T.slide, t2 = tExit + T.gap, span = T.dur + T.stag * (n - 1), tEnd = t2 + span;

    var num = el.querySelector('.np-pre__num'), count = el.querySelector('.np-pre__count'), line = el.querySelector('.np-pre__line');
    var bg = el.querySelector('.np-pre__bg'), blinds = el.querySelector('.np-pre__blinds'), slats = el.querySelectorAll('.np-pre__slat');
    var c = { v: 0 };
    var slatsOk = false;                       // set by paintSlats(), long before t2
    var slatTo = { duration: T.dur, ease: 'power4.inOut', stagger: T.stag };
    if (rows) slatTo.yPercent = 100; else slatTo.xPercent = -100;

    // onStart: the Overview can load hidden (the catalog opened on another tab); the ticker only runs once it is shown, so that is when the
    // menu has to be told to wait again
    var tl = gsap.timeline({ paused: true, onStart: function () { post('on'); }, onComplete: finish });
    state.tl = tl;
    tl.to(c, { v: 100, duration: T.count, ease: 'power2.inOut', onUpdate: function () { num.textContent = String(Math.round(c.v)).padStart(3, '0'); } }, 0)
      .to(count, { xPercent: -65, duration: T.slide, ease: 'expo.out' }, T.t1)
      .to(line, { width: '65%', duration: T.slide, ease: 'expo.out' }, T.t1)
      .to(count, { xPercent: -120, autoAlpha: 0, duration: T.exitD, ease: 'expo.in' }, tExit)
      .to(line, { width: '120%', autoAlpha: 0, duration: T.exitD, ease: 'expo.in' }, tExit)
      // the backdrop of the counter (a photo) settles slowly, 1.12 > 1, while the number counts. It has reached 1 at t2, the instant the blinds open
      .fromTo(bg, { scale: 1.12 }, { scale: 1, duration: t2, ease: 'power1.out' }, 0)
      // t2, the blinds: the slats (the same photo, same crop, waiting under the backdrop) take its place at once, so the swap is not seen, and #np-pre
      // stops being a black ground (what shows between the slats as they leave is the hero). Without the slats' photos (paintSlats() failed or was
      // late) the backdrop fades out over the dark slats instead
      .call(function () {
        if (slatsOk) gsap.set(bg, { autoAlpha: 0 });
        else gsap.to(bg, { autoAlpha: 0, duration: T.dur * 0.4, ease: 'none' });
      }, null, t2)
      .set(el, { backgroundColor: 'rgba(0,0,0,0)' }, t2)
      .to(slats, slatTo, t2)
      // phase 3: the catalog menu and the hero text come in; whatever is left of the overlay goes
      .call(function () { post('nav'); skip.hidden = true; }, null, tEnd)
      .to(el, { autoAlpha: 0, duration: 0.6, ease: 'none' }, tEnd)
      .fromTo(state.kids, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: T.fade, ease: 'power3.out', stagger: T.off / 2 }, tEnd)
      .set({}, {}, tEnd + F.p3);               // pads the timeline to the phase length

    // the title over the photo, while the number counts: "Conheça" fades in at the top left and the method name rises from behind its mask
    // (name first, "Fialho" a beat later); both leave with the counter, upwards, as the blinds start
    var kick = el.querySelector('.np-pre__kick-t'), kickRule = el.querySelector('.np-pre__kick-rule');
    var rises = el.querySelectorAll('.np-pre__rise'), rules = el.querySelectorAll('.np-pre__rule');
    var tIn = 0.4;
    tl.fromTo(kick, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power2.out' }, tIn)
      .fromTo(kickRule, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.out' }, tIn + 0.3)
      .fromTo(rises[0], { yPercent: 115 }, { yPercent: 0, duration: 1.6, ease: 'expo.out' }, tIn + 0.2)
      .fromTo(rises[1], { yPercent: 115 }, { yPercent: 0, duration: 1.4, ease: 'expo.out' }, tIn + 0.75)
      .fromTo(rules, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'expo.out' }, tIn + 1.1)
      .to([kick, kickRule], { autoAlpha: 0, duration: T.exitD * 0.8, ease: 'power2.in' }, tExit)
      .to(rises, { yPercent: -115, duration: T.exitD, ease: 'expo.in', stagger: 0.08 }, tExit);

    // the counter is set in Aeonik 700 and the title in Bodoni Moda 700: wait for them (at most 0.8 s) so they do not swap fonts while they play
    var fontReady = document.fonts && document.fonts.load
      ? Promise.race([Promise.all([document.fonts.load('700 100px aeonik'), document.fonts.load('700 100px "Bodoni Moda"')]), new Promise(function (r) { setTimeout(r, 800); })])
      : Promise.resolve();
    // the counter backdrop is a photo: it gets the same short wait (at most 1.2 s), so it does not pop in while the number counts. It is painted
    // into a canvas at 1.12x (the zoom it starts at), so the zoom down to 1 only ever shrinks a finished picture
    var photoReady = Promise.race([paint(bg, BACKDROP, 0.5, 0.12, 1.12), new Promise(function (r) { setTimeout(r, 1200); })]);
    // The slats are painted while only a counter is moving (phase 1 has seconds to spare), one per frame (paintSlats()), and the portrait is decoded
    // after them: a big photo decoded and painted at the instant it is revealed is what showed as bands
    tl.call(function () {
      paintSlats(blinds, slats, rows, BACKDROP, 0.5, 0.12).then(function (ok) { slatsOk = ok; });
    }, null, 1.5);
    tl.call(function () {
      var person = hero.querySelector('img.np-person');
      if (person && person.decode) person.decode().catch(function () {});
    }, null, 2.5);
    // The photo sits under the black cover (napele-preloader.css) until it is painted and has had two frames to be shown: the first thing
    // the eye gets is the whole picture, not the few tiles of it that were ready. The timeout covers a hidden tab, where frames do not run.
    var started = false;
    function go() {
      if (state.done || started) return;
      started = true;
      root.classList.add('np-pre-ready');
      tl.play();
    }
    Promise.all([fontReady, photoReady]).then(function () {
      requestAnimationFrame(function () { requestAnimationFrame(go); });
      setTimeout(go, 400);
    });
  }

  function safeInit() {
    try { init(); } catch (err) { if (window.console) console.error('napele-preloader:', err); finish(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeInit);
  else safeInit();
})();
