/* Napele procedures section (title + card carousel, right below the marquee). From 768px up it is as tall as its content (napele.css has
   no 100svh floor there: the floor put whatever height the cards leave over under the arrows, an empty band that grew with the window); on
   a phone it keeps the 100svh floor. Spacing is the design system's own, 4rem (64px): marquee > title and title > cards are GAP, and the
   arrows sit ARROW_GAP (24px) under the cards and END_GAP (112px, more than GAP: the end of the section needs more air than its top) is left under them. The cards are SCALE (75%) of the height that would fill the screen, between MIN and
   MAX; their width follows their height (the photos are 720x950). So:
   - on a 1250px screen the cards are ~570px tall (they would fill 760px), on a 1320px screen ~630px;
   - screens under ~1100px tall: the cards stay at MIN (the kit's own 475px) and the section runs a little past the screen below
     ~955px;
   - screens over ~1440px tall: the cards stop at MAX.
   Sets on the section: .np-fit, --np-card-h (card height) and --np-top-extra / --np-card-shift / --np-end-extra (change of the gaps
   from their natural size, px, may be negative). napele.css turns them into the card height, the carousel width and the spacing,
   so Swiper (3 cards per view on desktop, 2 on tablet) lays the slides out at exactly that size. At 767px and below the layout is the
   kit's own (one card, its width set by Swiper); only the card gets taller: it takes whatever the 100svh floor would otherwise leave
   empty under it, up to MOBILE_RATIO x its width (.np-fit-m + --np-card-h). --np-arrow-gap is the distance from the cards to the top of the
   arrows: ARROW_GAP from 768px up, and on a phone halfway between the bottom of the cards and the end of the section. */
(function () {
  var sec = document.querySelector('.elementor-11 .elementor-element-7c94319');
  if (!sec) return;
  var inner = sec.querySelector(':scope > .e-con-inner');
  var carousel = sec.querySelector('.e-n-carousel');
  if (!inner || !carousel) return;
  var row = carousel.closest('.e-con');                    // the carousel's own container: its bottom padding is the room for the arrows
  var widget = carousel.closest('.elementor-widget-n-carousel');   // the arrows are positioned against its bottom edge

  var GAP = 64;        // 4rem: the kit's padding for this section and its title > cards spacing
  var ARROW_GAP = 24;  // cards > arrows, from 768px up
  var END_GAP = 112;   // 7rem: arrows > end of the section, from 768px up (it was GAP, 64px, which read as cramped under the arrows)
  var MIN = 475;       // shortest card (the kit's own)
  var SCALE = 0.75;    // the cards are 3/4 of the size that would fill the screen
  var MAX = 720;       // tallest card (width = 720 x .758 = 546px)
  var MOBILE_MAX = 767;
  var MOBILE_RATIO = 1.5;   // tallest phone card, as a multiple of its width (the photos are 720x950 = 1.32: a little more is cropped at the sides)
  var VARS = ['--np-card-h', '--np-card-shift', '--np-top-extra', '--np-end-extra'];
  var frame = 0;

  // 100svh in px. window.innerHeight changes while a phone's address bar slides in and out, which would make the cards grow and shrink as you scroll.
  var svhProbe = document.createElement('div');
  svhProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(svhProbe);
  function viewportH() { return svhProbe.offsetHeight || window.innerHeight; }

  // Where the arrows sit. They are absolutely positioned, so moving them changes no layout.
  // From 768px up: ARROW_GAP under the cards (the section's bottom padding, set in fit(), leaves GAP under the arrows).
  // On a phone the section keeps its 100svh floor, so what the card leaves over is shared: the arrows go halfway between the cards and the end.
  // Hidden (the catalog switched to another tab, display:none): nothing can be measured, so the last value is kept.
  function placeArrows() {
    var btn = widget && widget.querySelector('.elementor-swiper-button');
    if (!btn || !sec.offsetHeight || !btn.offsetHeight) return;
    if (window.innerWidth > MOBILE_MAX) { sec.style.setProperty('--np-arrow-gap', ARROW_GAP + 'px'); return; }
    var space = sec.getBoundingClientRect().bottom - widget.getBoundingClientRect().bottom;     // cards > end of the section
    sec.style.setProperty('--np-arrow-gap', Math.max(0, Math.round((space - btn.offsetHeight) / 2)) + 'px');
  }

  function fit() {
    frame = 0;
    if (window.innerWidth <= MOBILE_MAX) {
      sec.classList.remove('np-fit', 'np-fit-m');
      VARS.forEach(function (v) { sec.style.removeProperty(v); });
      // Natural layout (the kit's 370px card, the 100svh floor off), then the leftover goes to the card.
      sec.style.setProperty('--min-height', '0px');
      var card = carousel.querySelector('.swiper-slide > .e-con');
      var natural = card && sec.offsetHeight ? card.getBoundingClientRect() : null;
      if (natural && natural.width) {
        var room = viewportH() - sec.getBoundingClientRect().height;      // what the floor would leave empty under the card
        var ch = Math.round(Math.max(natural.height, Math.min(natural.width * MOBILE_RATIO, natural.height + room)));   // never shorter than the kit's card
        sec.style.setProperty('--np-card-h', ch + 'px');
        sec.classList.add('np-fit-m');
      }
      sec.style.removeProperty('--min-height');                          // back to the 100svh floor of napele.css
      placeArrows();
      return;
    }
    sec.classList.remove('np-fit-m');
    // Natural layout, measured with the extras off and the 100svh floor off (it would put its leftover at the bottom).
    sec.style.setProperty('--min-height', '0px');
    sec.style.setProperty('--np-card-shift', '0px');
    sec.style.setProperty('--np-top-extra', '0px');
    sec.style.setProperty('--np-end-extra', '0px');
    var secRect = sec.getBoundingClientRect();
    var cRect = carousel.getBoundingClientRect();
    // bottom of the title block (everything but the carousel row). The rects are relative to the screen, so once the page is scrolled past this
    // section they are negative: the start must be -Infinity, not 0, or Math.max pins the result at 0 and the cards get thousands of px of empty space
    // above them (the symptom: a huge blank scroll in the section, after a resize or a late Swiper start while the page was scrolled down).
    var headerBottom = -Infinity;
    [].forEach.call(inner.children, function (el) {
      if (!el.contains(carousel)) headerBottom = Math.max(headerBottom, el.getBoundingClientRect().bottom);
    });
    if (headerBottom === -Infinity) headerBottom = secRect.top + (parseFloat(getComputedStyle(inner).paddingTop) || 0);   // no title block: nothing above the cards
    var arrows = parseFloat(getComputedStyle(row).paddingBottom) || 0;           // room kept under the cards for the arrows
    var gapTop = parseFloat(getComputedStyle(inner).paddingTop) || 0;            // natural marquee > title
    var gapMid = cRect.top - headerBottom;                                       // natural title > cards
    var gapEnd = secRect.bottom - cRect.bottom - arrows;                         // natural arrows > end of the section
    var titleH = headerBottom - secRect.top - gapTop;

    var fill = window.innerHeight - titleH - arrows - 3 * GAP;                   // height the cards would need to fill the screen
    var h = Math.max(MIN, Math.min(MAX, Math.round(fill * SCALE)));
    var gap = GAP;
    // the section's own bottom padding: what the room under the cards (the row's padding + this) needs so that the arrows sit ARROW_GAP under the cards
    // and END_GAP is left under them
    var btn = widget && widget.querySelector('.elementor-swiper-button');
    var endPad = ARROW_GAP + ((btn && btn.offsetHeight) || 45) + END_GAP - arrows;

    sec.style.setProperty('--np-card-h', h + 'px');
    sec.style.setProperty('--np-top-extra', Math.round(gap - gapTop) + 'px');
    sec.style.setProperty('--np-card-shift', Math.round(gap - gapMid) + 'px');
    sec.style.setProperty('--np-end-extra', Math.round(endPad - gapEnd) + 'px');
    sec.style.removeProperty('--min-height');                                    // back to napele.css (no floor from 768px up)
    sec.classList.add('np-fit');
    placeArrows();
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(fit); }

  // ---- Loop clones. In loop mode Swiper puts a few copies of the slides on each side (the number of slides in view, rounded up:
  // 3 here, 4 in practice). Those copies are what you see peeking out at the sides, but Swiper only counts the 3 cards of the
  // carousel box, while this section lets the cards run out of it to both edges of the screen (7 in view on a wide monitor). Where
  // the loop wraps, the copies ran out before the edge of the screen and a gap showed on the right, for one step. So the number of
  // copies is raised to what the screen really shows (loopAdditionalSlides) and the loop is rebuilt, on the same slide.
  var cloneTimer = 0;
  function ensureClones() {
    cloneTimer = 0;
    var swiper = carousel.swiper;
    if (!swiper || swiper.destroyed || !swiper.params || !swiper.params.loop) return;
    var real = [].filter.call(swiper.slides, function (el) { return !el.classList.contains('swiper-slide-duplicate'); }).length;
    var slide = swiper.slides[swiper.activeIndex];
    if (!real || !slide) return;
    // hidden (the catalog switched to another tab, display:none): nothing can be measured, and a wrong count would stick
    if (!carousel.offsetWidth || !slide.offsetWidth) return;
    var step = slide.getBoundingClientRect().width + (parseFloat(swiper.params.spaceBetween) || 0);
    var box = carousel.getBoundingClientRect();
    var beyond = Math.ceil(Math.max(box.left, window.innerWidth - box.right, 0) / step);   // cards past the box, on the wider side
    var inView = Math.ceil(parseFloat(swiper.params.slidesPerView) || 1);
    var extra = Math.max(0, Math.min(real, inView + beyond + 1) - inView);                 // +1: the card sliding in
    if ((swiper.params.loopAdditionalSlides || 0) === extra) return;
    var index = swiper.realIndex;
    swiper.params.loopAdditionalSlides = extra;
    swiper.loopDestroy();
    swiper.loopCreate();
    swiper.update();
    swiper.slideToLoop(index, 0, false);
  }
  function scheduleClones() { clearTimeout(cloneTimer); cloneTimer = setTimeout(ensureClones, 250); }

  fit();
  scheduleClones();
  window.addEventListener('resize', function () { schedule(); scheduleClones(); }, { passive: true });
  if (window.ResizeObserver) {
    new ResizeObserver(function () { schedule(); scheduleClones(); }).observe(sec);
    // the section keeps its 100svh floor when the cards change height, so its own size does not tell: watch the carousel too
    // (on a phone the card's width is Swiper's, and it changes when Swiper starts: the card's height follows it)
    new ResizeObserver(function () { placeArrows(); if (window.innerWidth <= MOBILE_MAX) schedule(); }).observe(carousel);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { schedule(); scheduleClones(); });
  // Elementor starts Swiper late (WP Rocket holds its scripts back until the first interaction) and may start it again on a
  // breakpoint change: both show up as a class change on the carousel element
  new MutationObserver(function () { scheduleClones(); if (window.innerWidth <= MOBILE_MAX) schedule(); })
    .observe(carousel, { attributes: true, attributeFilter: ['class'] });
})();
