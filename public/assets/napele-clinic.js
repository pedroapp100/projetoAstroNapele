/* Napele "A clínica" tour (.np-clinic on the Overview, around the #sobre-a-clinica fold). The fold is the old "Quem somos" fold with one more card, the facade
   (.np-clinic__card, between the text and the button). This script turns it into a walk through the clinic that the scroll drives:
   - the fold is pinned to the top of the screen (position:sticky inside the tall .np-clinic track, whose height is set here) for GROW + the walk + HOLD
     screens of scroll; if the fold is taller than the screen it is pinned by its bottom edge instead, so all of it is in view the moment it locks;
   - GROW: the card grows into the frame (.np-clinic__frame, a video the scroll plays) while the side cards and the button fade and drift away
     (the look of that is napele.css, driven by --np-g on the fold). The headline and the text do not fade on a desktop: they slide up under the navbar
     (--np-hy) and stay there for the whole walk, with the frame and the caption centred in the space under them (class is-head on the track);
   - the walk: the scroll position is the video time, and the pace is not the same everywhere. The video (assets/clinica/passeio.mp4, passeio-m.mp4 on a phone)
     is the ten Video/ clips joined; the two procedure rooms (Sala 1 and Sala 2) play at normal speed with their last frame held, and data-pace on
     .np-clinic__stage says how much scroll each stretch of the video gets ("second:vh per second, ..."): the rooms get a lot, the corridor that repeats
     before each of them almost none. Each <li> of .np-clinic__stops starts at data-at (a second of the video): that stop's caption shows centred under
     the frame (the frame is centred in the fold), and the bar at the bottom of the frame has one segment per stop, as long (in scroll) as the stop lasts;
   - HOLD: the last stop (with the booking button, a copy of the one of the fold) stays on screen, then the fold lets go and the next one comes in.
   The picture catches up with the scroll a little late on purpose (CATCH), so a mouse wheel that moves in steps still looks like a glide.
   The fold is as tall as the screen, and the last stop ends well above its foot (more of it the taller the screen). When the gallery block of a tablet or a phone follows
   (.np-gallery), it is pulled up over that empty tail, so the last stop is followed by a gap of a few dozen pixels, not by the rest of a screen (--np-tail, below).
   The video is only fetched when the track is three screens away, and is kept in memory so every seek is local (see "the video", below). With prefers-reduced-motion, or without a video, nothing is pinned and the card stays a still of the facade. */
(function () {
  var track = document.getElementById('np-clinic');
  if (!track) return;
  var sec = document.getElementById('sobre-a-clinica');
  var card = track.querySelector('.np-clinic__card');
  var stage = track.querySelector('.np-clinic__stage');
  var frame = track.querySelector('.np-clinic__frame');
  var video = track.querySelector('.np-clinic__video');
  var legend = track.querySelector('.np-clinic__legend');
  if (!sec || !card || !stage || !frame || !video || !legend) return;
  if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var GROW = 45;      // screens (vh) of scroll in which the card grows into the frame
  var HOLD = 30;      // screens (vh) the last stop stays pinned
  var CATCH = 9;      // 1/s: how fast the picture catches up with the scroll (higher = tighter, lower = floatier)
  var RADIUS = 18;    // px, the corners of the card and of the frame
  var stacked = window.matchMedia('(max-width: 899px)');   // frame on top, caption under it
  var wide = window.matchMedia('(min-width: 1025px)');     // the photo grid, and the headline + text side by side, are there (napele.css)
  var small = window.matchMedia('(max-width: 767px)');     // the navbar is the one-row burger bar (napele.css)
  var head = sec.querySelector('.elementor-element-189c247');   // the headline and the text of the fold
  var HEAD_GAP = 30;   // px of air between the headline's text and the frame (the margin under the headline's block is the page's spacing, not counted)
  var MIN_FRAME = 260; // px: the least height the frame may have for the headline to stay on screen; on a shorter screen it fades with the rest, as it always did
  var MIN_FRAME_PHONE = 150;   // the same on a phone, where the frame is the width of the screen and is let shrink to make room
  var TAIL_KEEP = 16;  // px of the fold's empty tail that stay under the last stop; the gallery that follows is pulled up over the rest
  var SKIP_AIR = 40;   // px: "Pular passeio" lands with the top of the gallery block this far down the screen (its first line is its padding, then the headline)

  /* ---- the pace: rows of video seconds, each with the scroll (vh) it takes; s0 / s1 are the scroll at the start / end of the row ---- */
  var DURATION = parseFloat(stage.getAttribute('data-duration')) || 36;
  var rows = [], tourVh = 0;
  (stage.getAttribute('data-pace') || '0:11').split(',').forEach(function (pair) {
    var a = pair.split(':');
    rows.push({ t0: parseFloat(a[0]), rate: parseFloat(a[1]) });
  });
  rows.forEach(function (r, i) {
    r.t1 = i + 1 < rows.length ? rows[i + 1].t0 : DURATION;
    r.s0 = tourVh;
    tourVh += (r.t1 - r.t0) * r.rate;
    r.s1 = tourVh;
  });
  function timeAt(s) {                              // video second at s vh into the walk
    for (var i = 0; i < rows.length - 1 && s > rows[i].s1; i++);
    return rows[i].t0 + (s - rows[i].s0) / rows[i].rate;
  }
  function scrollAt(t) {                            // vh into the walk at video second t
    for (var i = 0; i < rows.length - 1 && t >= rows[i].t1; i++);
    return rows[i].s0 + (t - rows[i].t0) * rows[i].rate;
  }

  var items = [].slice.call(legend.querySelectorAll('.np-clinic__stops li'));
  if (!items.length) return;
  var at = items.map(function (li) { return parseFloat(li.getAttribute('data-at')) || 0; });
  var starts = at.map(scrollAt);
  var ends = starts.map(function (s, i) { return i + 1 < starts.length ? starts[i + 1] : tourVh; });
  var names = items.map(function (li) { return li.querySelector('h3').textContent; });
  var tag = frame.querySelector('.np-clinic__tag');
  var count = legend.querySelector('.np-clinic__n');
  var bar = frame.querySelector('.np-clinic__bar');
  var fills = [];
  items.forEach(function (li, i) {
    var seg = document.createElement('span');
    var fill = document.createElement('i');
    seg.style.flexGrow = ends[i] - starts[i];
    seg.appendChild(fill);
    bar.appendChild(seg);
    fills.push(fill);
  });
  legend.querySelector('.np-clinic__total').textContent = pad(items.length);

  // the booking button of the fold, copied into the caption of the last stop
  var cta = legend.querySelector('.np-clinic__cta');
  var button = sec.querySelector('.elementor-element-9ddcb1a');
  if (cta && button) cta.appendChild(button.cloneNode(true));

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // how tall the caption is on the last stop (the one with the booking button), whichever stop is showing now: that stop is put on, alone, for the length of one measure
  function lastStopHeight() {
    var wasLast = track.classList.contains('is-last');
    track.classList.add('is-last');
    items.forEach(function (li, i) { li.style.display = i === items.length - 1 ? 'block' : 'none'; });
    var h = legend.offsetHeight;
    items.forEach(function (li) { li.style.display = ''; });
    if (!wasLast) track.classList.remove('is-last');
    return h;
  }

  /* ---- the video: fetched late, kept in memory, seeked by the scroll (one seek at a time, the newest target waits its turn) ----
     In memory (a blob), not streamed: a seek outside what is buffered is a byte-range request, one network round trip each, and on a phone's network that
     is ~0.5 s a seek (measured at 170 ms / 9 Mbps: a fast flick got 3-4 picture updates a second); from memory every seek is local. It also needs no
     server that answers byte ranges. The whole file comes down (5.5 MB on a phone, 12 MB on a desktop), so it starts three screens ahead, not two.
     iOS paints a muted video only once it has been played (the seeks land and "seeked" fires, but the picture stays on one frame), so the video is primed
     with a play() and a pause(): as soon as it has its metadata (a muted inline play() needs no gesture, except in Low Power Mode or with data saver on,
     where it is refused), and again on every touch, click and scroll until one is accepted ("touchend" counts as a gesture, "touchstart" does not, so
     a phone in Low Power Mode gets its chance when the finger lifts). A play() promise may stay pending for ever on iOS: the "priming" flag is let go
     after 2 s so a later touch can try again. */
  var loaded = false, dur = 0, seeking = false, seekAt = 0, pending = -1;
  var primed = false, priming = false, primeAt = 0;
  var GESTURES = ['touchstart', 'touchend', 'pointerdown', 'click', 'scroll'];
  function load() {
    if (loaded) return;
    loaded = true;
    var light = stacked.matches || (navigator.connection && navigator.connection.saveData);
    var url = video.getAttribute(light ? 'data-src-m' : 'data-src');
    video.muted = true;                       // as properties, not only as attributes: that is what iOS reads
    video.playsInline = true;
    video.preload = 'auto';
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(function (b) {
      video.src = URL.createObjectURL(b);     // the listeners below are on already: assigning src is what starts the load
    }).catch(function () { video.src = url; });   // could not take it whole: stream it
  }
  function seek(t) {
    t = Math.max(0, Math.min(dur - .05, t));
    if (seeking && performance.now() - seekAt < 400) { pending = t; return; }
    if (Math.abs(video.currentTime - t) < .02) return;
    seeking = true;
    seekAt = performance.now();
    video.currentTime = t;
  }
  function prime() {
    if (primed || priming || !video.src) return;
    priming = true;
    primeAt = performance.now();
    var letGo = function () { priming = false; };
    setTimeout(letGo, 2000);
    var ok = function () {
      priming = false;
      primed = true;
      try { video.pause(); } catch (e) { /* nothing to pause */ }
      // a primed decoder keeps the stale frame until it is asked for another time, and seek() will not ask when the scroll is already there: nudge it
      if (dur) seek(video.currentTime + .05);
      kick();
    };
    var started;
    try { started = video.play(); } catch (e) { letGo(); return; }
    if (started && started.then) started.then(ok, letGo); else ok();
  }
  function onGesture(e) {
    if (e.type === 'scroll' && performance.now() - primeAt < 500) return;   // a scroll fires all the time: do not hammer a phone that keeps refusing
    prime();
    if (primed) GESTURES.forEach(function (ev) { window.removeEventListener(ev, onGesture); });
  }
  GESTURES.forEach(function (ev) { window.addEventListener(ev, onGesture, { passive: true }); });
  video.addEventListener('loadedmetadata', function () { dur = video.duration; prime(); });
  video.addEventListener('loadeddata', function () { prime(); kick(); });
  video.addEventListener('seeked', function () {
    seeking = false;
    if (pending >= 0) { var t = pending; pending = -1; seek(t); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, io) {
      if (entries[0].isIntersecting) { load(); io.disconnect(); }
    }, { rootMargin: '300% 0px' }).observe(track);
  } else load();

  /* ---- geometry: where the card is, where the frame and the caption end up (all in the fold's own coordinates) ---- */
  var geo = null;
  function layout() {
    var vh = window.innerHeight;
    sec.style.top = '0px';
    track.classList.add('is-head');                 // measure the headline where it rests: no shift yet, and not the fade's own transform
    sec.style.setProperty('--np-hy', '0px');
    var W = sec.clientWidth, H = sec.offsetHeight;
    // where the fold locks: the top of the screen, or higher when the fold is taller. It locks by its bottom edge, and the kit's bottom padding (7rem on a
    // desktop) is empty: all of it past 40 px is let hang below the screen instead of costing the top of the content its place
    var padB = parseFloat(window.getComputedStyle(sec.querySelector('.e-con-inner') || sec).paddingBottom) || 0;
    var pin = Math.min(0, vh - H + Math.max(0, padB - 40));
    sec.style.top = pin + 'px';
    var len = (GROW + tourVh + HOLD) / 100 * vh;
    track.style.height = (H + len) + 'px';

    var sr = sec.getBoundingClientRect(), cr = card.getBoundingClientRect();
    var seen = -pin - sec.clientTop;                // top of the part of the fold that is on screen once it is locked
    // the frame is centred in the fold and the caption sits under it, also centred; the pair is centred in the screen
    var CAPTION = 240, GAP = 26;                    // room kept for the caption (px) and the air between it and the frame
    var phone = stacked.matches;
    // The headline (and the text) stay on screen during the tour: they slide up to just under the navbar while the frame grows, and the frame and the
    // caption are centred in what is left under them. The navbar floats over the top of the screen. Three cases, the first that leaves the frame room:
    //   2  the headline and the text   (a desktop: side by side, one row; a tall phone or tablet: stacked)
    //   1  the headline only           (a phone or tablet: the text fades as it always did)
    //   0  none: the screen is too short, and they fade with the rest, as they always did
    // The caption is as tall as the last stop's (with the booking button): ~225 px at the base size, ~270 at the largest (the type grows with --np-u).
    var u = Math.max(1, Math.min(1.35, window.innerWidth / 1440)), cap = Math.round(225 + (u - 1) * 130);
    var keep = 0, band = 0, navClear = 0, gap = GAP, bottom = Math.max(24, vh * .03);
    if (head) {
      if (small.matches) navClear = 76 + 12;        // the burger bar of the catalog page (its height is set there, not in this page)
      else {                                        // the bar of a desktop / tablet: its height is a custom property, read through a probe
        var probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:calc(var(--np-nav-h-scrolled) + 20px)';
        sec.appendChild(probe);
        navClear = probe.offsetHeight;
        sec.removeChild(probe);
      }
      if (phone) { gap = 20; bottom = 16; }
      var hg = phone ? 20 : HEAD_GAP, minFrame = phone ? MIN_FRAME_PHONE : MIN_FRAME;
      // measured from the top of the headline's own text: on a phone the kit gives the headline a margin of its own above it (~27 px), which is not
      // part of what is seen, so the headline (not its block) is what is put just under the navbar
      var box = head.querySelector('.elementor-image-box-wrapper') || head;
      var titleEl = head.querySelector('.elementor-image-box-title') || box;
      var hr = head.getBoundingClientRect(), tr = titleEl.getBoundingClientRect();
      var hTitle = tr.height, hFull = box.getBoundingClientRect().bottom - tr.top, off = tr.top - hr.top;
      var fit = function (hh) { return vh - (navClear + hh + hg) - bottom - gap - cap >= minFrame; };
      if (fit(hFull)) { keep = 2; band = navClear + hFull + hg; }
      else if (!wide.matches && fit(hTitle)) { keep = 1; band = navClear + hTitle + hg; }
      if (keep) sec.style.setProperty('--np-hy', ((seen + navClear) - (hr.top - sr.top - sec.clientTop) - off) + 'px');
      else { bottom = Math.max(24, vh * .03); gap = GAP; }
    }
    track.classList.toggle('is-head', keep > 0);
    track.classList.toggle('is-head-t', keep === 1);
    var avail = keep ? vh - band - bottom - gap - cap : vh - 2 * Math.max(40, vh * .05) - GAP - CAPTION;
    var tw = phone ? (keep ? Math.min(W - 32, avail * 16 / 9) : W - 32) : Math.max(320, Math.min(W * .6, avail * 16 / 9, 1120));
    var th = tw * 9 / 16;
    var tl = (W - tw) / 2;
    var tt = keep ? seen + band + Math.max(0, (vh - band - bottom - (th + gap + cap)) / 2)
                  : seen + Math.max(phone ? 72 : 40, (vh - (th + GAP + CAPTION)) / 2);
    var lw = phone ? W - 32 : Math.min(tw, 640);
    frame.style.width = tw + 'px';
    frame.style.height = th + 'px';
    legend.style.left = (W - lw) / 2 + 'px';
    legend.style.top = (tt + th + (keep ? gap : GAP)) + 'px';
    legend.style.width = lw + 'px';
    // what is left of the fold under the last stop, minus the gap that stays, is how far the gallery block that follows is pulled up (napele.css: .np-gallery)
    var after = track.nextElementSibling;
    if (after && after.classList.contains('np-gallery')) {
      var legendBottom = tt + th + (keep ? gap : GAP) + lastStopHeight();
      after.style.setProperty('--np-tail', Math.max(0, Math.round(H - legendBottom - TAIL_KEEP)) + 'px');
    }
    geo = {
      W: W, H: H, pin: pin, len: len,
      cx: cr.left - sr.left - sec.clientLeft, cy: cr.top - sr.top - sec.clientTop, s0: cr.width / tw,
      tl: tl, tt: tt
    };
  }

  /* ---- one frame of the animation, p = how far the scroll is through the track (0 to 1) ---- */
  var stop = -1;
  function apply(p) {
    var total = GROW + tourVh + HOLD;
    var g = clamp(p * total / GROW);
    var walked = Math.max(0, Math.min(tourVh, p * total - GROW));   // vh scrolled into the walk
    var e = g * g * (3 - 2 * g);
    var s = geo.s0 + (1 - geo.s0) * e;
    frame.style.transform = 'translate3d(' + (geo.cx + (geo.tl - geo.cx) * e) + 'px,' + (geo.cy + (geo.tt - geo.cy) * e) + 'px,0) scale(' + s + ')';
    frame.style.borderRadius = (RADIUS / s) + 'px';
    var css = sec.style;
    css.setProperty('--np-g', e.toFixed(4));
    css.setProperty('--np-inv', (1 / s).toFixed(4));                   // the cue chip is drawn at the size of the card, not scaled with the frame
    css.setProperty('--np-cue', clamp(1 - e * 7).toFixed(3));
    css.setProperty('--np-ui', clamp((e - .7) / .3).toFixed(3));
    css.setProperty('--np-leg', clamp((e - .8) / .2).toFixed(3));
    track.classList.toggle('is-touring', e > .5);

    var t = timeAt(walked);
    if (dur && video.readyState >= 2) seek(t);
    var i = 0;
    while (i + 1 < at.length && t >= at[i + 1]) i++;
    if (i !== stop) {
      if (stop >= 0) items[stop].classList.remove('is-on');
      items[i].classList.add('is-on');
      count.textContent = pad(i + 1);
      tag.textContent = pad(i + 1) + ' · ' + names[i];
      track.classList.toggle('is-last', i === items.length - 1);
      stop = i;
    }
    for (var k = 0; k < fills.length; k++) {
      var span = ends[k] - starts[k];
      fills[k].style.transform = 'scaleX(' + (span > 0 ? clamp((walked - starts[k]) / span) : 0).toFixed(4) + ')';
    }
  }

  /* ---- the loop: runs while the picture is still catching up with the scroll, sleeps otherwise ---- */
  var shown = 0, last = 0, raf = 0;
  function target() { return clamp((geo.pin - track.getBoundingClientRect().top) / geo.len); }
  function tick(now) {
    raf = 0;
    var p = target();
    var dt = last ? Math.min(.05, (now - last) / 1000) : .016;
    last = now;
    shown += (p - shown) * (1 - Math.exp(-CATCH * dt));
    if (Math.abs(p - shown) < .0003) shown = p;
    apply(shown);
    if (shown !== p) raf = requestAnimationFrame(tick); else last = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  legend.querySelector('.np-clinic__skip').addEventListener('click', function () {
    // the start of the next fold; when that is the gallery block of a tablet or a phone, which is pulled up over the fold's tail (--np-tail), its own top, a little
    // below the navbar that floats over the screen, so the headline is not under it
    var next = track.nextElementSibling;
    var gallery = next && next.classList.contains('np-gallery') && next.offsetParent !== null;
    window.scrollTo(0, window.scrollY + (gallery ? next.getBoundingClientRect().top - SKIP_AIR : track.getBoundingClientRect().bottom));
  });

  /* ---- start, and keep the numbers right when the window or the fold changes ---- */
  var lastW = 0, lastH = 0;
  function relayout() {
    layout();
    shown = target();
    apply(shown);
  }
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    if (w === lastW && Math.abs(h - lastH) < 120) return;   // the address bar of a phone sliding in and out is not a resize
    lastW = w; lastH = h;
    relayout();
  }
  track.classList.add('is-js');
  lastW = window.innerWidth; lastH = window.innerHeight;
  relayout();
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', onResize);
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      if (sec.offsetHeight !== geo.H || sec.clientWidth !== geo.W) relayout();
    }).observe(sec);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
})();
