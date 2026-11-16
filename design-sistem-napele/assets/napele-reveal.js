/* Napele entrances on scroll (Overview). One quiet layer over the page: headlines, text, photos and cards come in as they reach the screen.
   Markup is untouched except the headlines, whose words are wrapped for the mask (see split()). Everything here is a GROUP: the pieces of one block, each
   with a delay, so they enter in a chain. Every piece is watched on its own and plays when IT reaches the screen, never because another piece of its block
   did: a block taller than what is on screen has its lower pieces still below it, and they would play unseen. The chain is kept between pieces that arrive
   together (a piece that shows up later waits only what is left of its delay), and nothing plays while the pre-loader covers the page (on a tall window the
   first section is already on screen at load, and it would be over by the time the pre-loader lifts).
   Three effects, the same everywhere (the look of each is in napele.css, "Entrada ao rolar"):
   - rise  (up / card / pop)   fade + a short drift into place;
   - mask  (words / photo / shot / open / wipe)   headline words rise out of a mask, photos open with a clip-path while the picture inside settles from a zoom, a
     paragraph is uncovered from the top;
   - gold hairline   under the emphasis of the results headline, and a sweep along the FAQ cards.
   Each piece plays once. When it has played its classes are taken off again, so the element is exactly what the stylesheet describes (hover,
   transitions and animations of the page work as before). Sections that already have a signature moment (hero entrance and exit, marquee, the clinic
   tour, the results strip, the closing button, the footer) get nothing new, except the gold light behind the closing card, which follows the scroll.
   Not touched on purpose: with prefers-reduced-motion, or without IntersectionObserver, this file does nothing and the page is shown as it is. */
(function () {
  if (!('IntersectionObserver' in window) || !window.matchMedia) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return [].slice.call((ctx || document).querySelectorAll(sel)); };

  var DUR = { up: 0.9, card: 1, pop: 0.8, photo: 1.4, shot: 1.6, open: 1.4, wipe: 1.1, words: 1.2, line: 1.4 };
  var CLIPPED = { open: 1, wipe: 1 };   // kinds hidden by clipping the element itself to nothing (see group): they are watched through another element
  var plans = new WeakMap();   // watched element -> [{ g: its group, it: its piece }] (or { g, whole: true } for a group that settles its pieces on arrival)

  /* ---- headlines: every word in a mask (.np-rv-w) with the word inside (.np-rv-wi) that rises out of it ---- */
  function splitNode(node, words) {
    [].slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var parts = n.nodeValue.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          var w = document.createElement('span');
          var wi = document.createElement('span');
          w.className = 'np-rv-w';
          wi.className = 'np-rv-wi';
          wi.textContent = p;
          w.appendChild(wi);
          frag.appendChild(w);
          words.push(w);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        splitNode(n, words);
      }
    });
  }
  /* WebKit (the iPhone's Safari) does not paint a headline's background-clip:text through the inline-block words inside it: the headline vanished while the
     solid-colour text under it showed (measured: 0% light pixels, against ~10% once the gradient sits on the words). So a headline that is a clipped gradient
     hands it down to its words (napele.css, "mask: headline words"): the headline stops painting it (.np-rv-grad), --np-grad keeps the gradient, and each word
     paints its own slice of it, as wide as the whole headline (--np-gw) and shifted by where the word sits in it (--np-gx), so it still runs across the
     headline as one. The slices are measured again when the headline or a word changes size (a wrap, the web font arriving, a rotated phone). */
  function gradientToWords(h) {
    var cs = getComputedStyle(h);
    if ((cs.webkitBackgroundClip || cs.backgroundClip) !== 'text' || cs.backgroundImage === 'none') return;
    h.style.setProperty('--np-grad', cs.backgroundImage);
    h.classList.add('np-rv-grad');
    var inner = $$('.np-rv-wi', h);
    function place() {
      var box = h.getBoundingClientRect();
      inner.forEach(function (wi) {
        wi.style.setProperty('--np-gx', (box.left - wi.getBoundingClientRect().left) + 'px');
        wi.style.setProperty('--np-gw', box.width + 'px');
      });
    }
    place();
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(place);
      ro.observe(h);
      inner.forEach(function (wi) { ro.observe(wi); });
    } else {
      window.addEventListener('resize', place);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }
  function split(h) {
    if (h.__npRvWords) return h.__npRvWords;
    var words = [];
    splitNode(h, words);
    h.__npRvWords = words;
    gradientToWords(h);
    return words;
  }
  // the delay of each word: by line (the words of a line come in together, a hair apart), or one by one
  function timeWords(h, mode) {
    var words = h.__npRvWords || [];
    var lines = [], tops = [];
    words.forEach(function (w) {
      var t = Math.round(w.offsetTop / 4);
      var li = tops.indexOf(t);
      if (li < 0) { tops.push(t); li = tops.length - 1; lines[li] = []; }
      lines[li].push(w);
    });
    var k = 0;
    lines.forEach(function (ws, li) {
      ws.forEach(function (w, wi) {
        w.firstChild.style.setProperty('--np-rv-wd', (mode === 'words' ? k * 0.07 : li * 0.14 + wi * 0.035).toFixed(3) + 's');
        k++;
      });
    });
  }

  /* ---- groups ---- */
  function group(trigger, items, opts) {
    if (!trigger) return;
    items = items.filter(function (it) { return it && it.el; });
    if (!items.length) return;
    opts = opts || {};
    items.forEach(function (it) {
      var el = it.el;
      if (it.kind === 'words') {
        split(el);
        timeWords(el, it.mode);
      }
      el.classList.add('np-rv', 'np-rv--' + it.kind);
      if (it.delay) el.style.setProperty('--np-rv-d', it.delay + 's');
    });
    var g = { t0: null, items: items, opts: opts };    // t0: when the first piece of the block arrived
    if (opts.resolve) {
      // the carousel: its cards sit side by side, so the whole row is one thing to watch, and the cards are settled when it arrives (see carouselCards)
      addPlan(trigger, { g: g, whole: true });
      watch(trigger);
    } else {
      items.forEach(function (it) {
        // A piece is watched through itself, except one that is hidden by clipping it away (CLIPPED): the observer counts only what is left of an element after
        // its own clip-path, so a piece clipped to nothing has a visible share of 0 and never reaches the threshold: it would stay hidden for good. Those
        // name an unclipped element that sits where the piece does (it.watch).
        var target = it.watch || (CLIPPED[it.kind] ? it.el.parentElement : it.el);
        addPlan(target, { g: g, it: it });
        watch(target);
      });
    }
  }
  function addPlan(el, rec) { var list = plans.get(el); if (!list) plans.set(el, list = []); list.push(rec); }

  var io = new IntersectionObserver(function (entries) {
    var now = performance.now();
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var recs = plans.get(e.target);
      io.unobserve(e.target);
      if (!recs) return;
      recs.forEach(function (rec) {
        var g = rec.g;
        if (g.t0 === null) {
          g.t0 = now;
          if (g.opts.after) setTimeout(g.opts.after, g.opts.afterDelay || 0);
        }
        if (rec.whole) { g.opts.resolve(g.items).forEach(function (it) { play(it); }); return; }
        // a piece that arrives after the start of its block has already waited part of its delay on screen's behalf: it only waits what is left
        var late = (now - g.t0) / 1000;
        play({ el: rec.it.el, kind: rec.it.kind, delay: Math.max(0, +((rec.it.delay || 0) - late).toFixed(3)) });
      });
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  // Nothing is watched until the pre-loader has lifted: the pieces are hidden from the start, but they only play once the page can be seen.
  var ready = false, queue = [];
  function watch(el) { if (ready) io.observe(el); else queue.push(el); }
  function release() { ready = true; queue.forEach(function (el) { io.observe(el); }); queue = []; }
  function whenUncovered(fn) {
    if (!root.classList.contains('np-pre-on')) { fn(); return; }
    var done = false, fallback = 0;
    var mo = new MutationObserver(function () { if (!root.classList.contains('np-pre-on')) go(); });
    function go() { if (done) return; done = true; mo.disconnect(); clearTimeout(fallback); setTimeout(fn, 150); }
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    fallback = setTimeout(go, 40000);   // the pre-loader ends or gives up by itself; this is only a net
  }

  function play(it) {
    var el = it.el;
    el.style.setProperty('--np-rv-d', (it.delay || 0) + 's');
    el.classList.add('is-rv');
    var life = ((it.delay || 0) + (DUR[it.kind] || 1) + (it.kind === 'words' ? 1.2 : 0.4)) * 1000;
    setTimeout(function () {
      el.classList.remove('np-rv', 'np-rv--' + it.kind, 'is-rv');
      el.style.removeProperty('--np-rv-d');
    }, life);
  }

  // The carousel loops: Swiper makes copies of the cards (the ones that peek in at the left of the first card, and past the last) by cloning them, so a
  // copy made after the cards were hidden is born hidden, and nothing in the page's setup knows it. So the cards are settled when the carousel shows up:
  // every card that carries the hidden state, the copies too. The ones on screen come in left to right, a hair apart; any other just stops being hidden.
  function carouselCards(car) {
    var vw = window.innerWidth;
    var hidden = $$('.swiper-slide', car).filter(function (s) { return s.classList.contains('np-rv--card'); });
    var seen = hidden.map(function (s) { return { s: s, r: s.getBoundingClientRect() }; })
      .filter(function (o) { return o.r.right > 0 && o.r.left < vw; })
      .sort(function (a, b) { return a.r.left - b.r.left; });
    var items = seen.map(function (o, i) { return { el: o.s, kind: 'card', delay: +(0.1 + Math.min(i, 6) * 0.09).toFixed(3) }; });
    hidden.forEach(function (s) {
      if (!seen.some(function (o) { return o.s === s; })) items.push({ el: s, kind: 'card', delay: 0 });
    });
    return items;
  }

  // delays: a chain of `n` pieces, `step` seconds apart, from `from`
  function chain(els, kind, from, step, cap) {
    return els.map(function (el, i) { return { el: el, kind: kind, delay: +(from + Math.min(i, cap == null ? 99 : cap) * step).toFixed(3) }; });
  }

  function build() {
    root.classList.add('np-rv-on');

    /* Treatments: headline + intro, then the cards slide in from the right, one after the other (the first six; the rest are off screen) */
    var tHead = $('#tratamentos .elementor-element-def3b56');
    group(tHead, [
      { el: $('.elementor-element-9646726 .elementor-heading-title', tHead), kind: 'words' },
      { el: $('#tratamentos .elementor-element-587e870'), kind: 'up', delay: 0.3 }
    ]);
    var car = $('#tratamentos .e-n-carousel');
    group(car, chain($$('.swiper-slide', car), 'card', 0.1, 0.09, 5), {
      resolve: function () { return carouselCards(car); },
      // a copy Swiper makes while the cards are coming in is born with the classes of that moment (already "in"): take them off once everything has played
      afterDelay: 2600,
      after: function () {
        $$('.swiper-slide', car).forEach(function (s) { s.classList.remove('np-rv', 'np-rv--card', 'is-rv'); s.style.removeProperty('--np-rv-d'); });
      }
    });

    /* The clinic fold (the pinned tour): the headline and the text come in, then the photos of the grid open in a wave from the top-left corner, the tour's frame
       (the centre of the grid) among them, then the button. Only inner pieces are touched (the words, the widgets' containers, the frame): the fold, its columns and the
       photos themselves are driven by the tour (napele-clinic.js writes --np-g, which the stylesheet turns into their transform and opacity on every scroll frame),
       and an entrance on the same properties would fight it. */
    var cf = $('#sobre-a-clinica');
    if (cf) {
      var cHead = $('.elementor-element-189c247', cf);
      // (the text is watched through the headline's widget, and each photo through its cell: the pieces themselves start clipped away, see group())
      group(cHead, [
        { el: $('.elementor-image-box-title', cHead), kind: 'words' },
        { el: $('.elementor-image-box-description', cHead), kind: 'wipe', delay: 0.3, watch: cHead }
      ]);
      var cGrid = $('.np-clinic__grid', cf);
      if (cGrid) {
        group(cGrid, [].slice.call(cGrid.children).map(function (cell, i) {
          var piece = cell.classList.contains('np-clinic__card') ? $('.np-clinic__frame') : $(':scope > .elementor-widget-container', cell);
          return { el: piece, kind: 'open', delay: +(0.1 + (Math.floor(i / 3) + i % 3) * 0.1).toFixed(2), watch: cell };
        }));
      }
      var cBtn = $('.elementor-element-9ddcb1a', cf);
      if (cBtn) group(cBtn, [{ el: $(':scope > .elementor-widget-container', cBtn), kind: 'up' }]);
    }

    /* Gallery (tablet and phone): headline, then each photo opens from the bottom; the right column of a row trails the left one */
    group($('.np-gallery__head'), [{ el: $('.np-gallery__title'), kind: 'words' }]);
    $$('.np-gallery__item').forEach(function (fig, i) {
      // the window that opens is the picture inside the frame (kind 'shot'), and the frame, which is never clipped, is what is watched
      group(fig, [{ el: $('img', fig), kind: 'shot', delay: (i % 2) * 0.14, watch: fig }]);
    });

    /* Results: the strip has its own drift; only the gold line under the emphasis is drawn */
    var em = $('.np-results__title em');
    group($('.np-results__title'), [{ el: em, kind: 'line', delay: 0.5 }]);

    /* Doctor ("Quem sou") and the protocol (#protocolo-full-face), the same block twice, each with its own elements:
       the photo opens, then its two chips pop in; the text follows; the second half ("Sempre em evolução", "O protocolo na prática") comes in as a chain */
    $$('.np-doctor').forEach(function (sec) {
      var photo = $('.elementor-element-25971ad5', sec);
      group(photo, [{ el: photo, kind: 'photo' }].concat(
        $$('.flutua > .elementor-widget-container', sec).map(function (c, i) { return { el: c, kind: 'pop', delay: 0.8 + i * 0.2 }; })
      ));
      var dText = $('.elementor-element-6776c9b6', sec);
      group(dText, [
        { el: $('.elementor-image-box-title', dText), kind: 'words' },
        { el: $('.elementor-image-box-description', dText), kind: 'up', delay: 0.35 }
      ]);
      var ev = $('.np-doctor__evolve-text', sec);
      group(ev, [{ el: ev, kind: 'hl' }, { el: $('.np-doctor__evolve-title', ev), kind: 'up', delay: 0.1 }].concat(chain($$('p', ev), 'up', 0.24, 0.14)));
      var evPh = $('.np-doctor__evolve-photos', sec);
      group(evPh, chain($$('.np-doctor__photo', evPh), 'photo', 0, 0.18));
    });

    /* FAQ: headline, then the cards one by one, each with a gold line sweeping its edge */
    group($('.np-faq__head'), [{ el: $('.np-faq__title'), kind: 'words' }]);
    group($('.np-faq__list'), chain($$('.np-faq__item'), 'up', 0.05, 0.1));

    /* Route: header chain, then the card; the button gives one gold pulse when the card is in */
    var vh = $('.np-visit__head');
    group(vh, [
      { el: $('.np-visit__chip', vh), kind: 'up' },
      { el: $('.np-visit__title', vh), kind: 'words', delay: 0.05 },
      { el: $('.np-visit__lead', vh), kind: 'up', delay: 0.3 }
    ]);
    var vBtn = $('.np-visit__cta .elementor-button');
    group($('.np-visit__card'), [{ el: $('.np-visit__card'), kind: 'up' }], {
      afterDelay: 1100,
      after: function () {
        if (!vBtn) return;
        vBtn.classList.add('np-rv-pulse');
        vBtn.addEventListener('animationend', function f() { vBtn.classList.remove('np-rv-pulse'); vBtn.removeEventListener('animationend', f); });
      }
    });

    /* Closing: card, then the headline word by word, the line under it and the button */
    var cc = $('.np-cta__card');
    group(cc, [
      { el: cc, kind: 'up' },
      { el: $('.np-cta__title', cc), kind: 'words', mode: 'words', delay: 0.2 },
      { el: $('.np-cta__lead', cc), kind: 'up', delay: 0.7 },
      { el: $('.elementor-element-400055b5', cc), kind: 'up', delay: 0.9 }
    ]);
  }

  /* ---- scroll-linked: a gold light grows behind the closing card as it arrives (the hero's own exit, the text rising and fading, is napele-nav.js) ---- */
  function linked(target, setter) {
    if (!target) return;
    var inView = false, raf = 0;
    function run() {
      raf = 0;
      setter(inView ? 1 : 0);
    }
    function tick() { if (!raf) raf = requestAnimationFrame(run); }
    new IntersectionObserver(function (es) {
      inView = es[es.length - 1].isIntersecting;
      tick();
    }, { rootMargin: '10% 0px' }).observe(target);
    window.addEventListener('scroll', function () { if (inView) tick(); }, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
  }
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  function ctaGlow() {
    var sec = $('.np-cta');
    linked(sec, function (on) {
      if (!on) return;
      var r = sec.getBoundingClientRect(), vh = window.innerHeight;
      // 0 when the section's top is at the foot of the screen, 1 when its middle is at the middle of the screen
      sec.style.setProperty('--np-cta-p', clamp((vh - r.top) / (vh / 2 + r.height / 2)).toFixed(3));
    });
  }

  function start() {
    // the hidden states are put on without a transition (np-rv-init), or the elements already on the page would fade out first
    root.classList.add('np-rv-init');
    build();
    whenUncovered(release);
    ctaGlow();
    void root.offsetWidth;
    requestAnimationFrame(function () { root.classList.remove('np-rv-init'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
