/* Napele marquee: a band of text that scrolls sideways without end (between the hero and the treatments section).
   The author writes one plain <ul class="np-marquee__list"> inside .np-marquee; this script repeats it until it is wider
   than the band, doubles that run (the CSS animation slides exactly one run, then restarts: seamless) and sets the
   duration so the speed in px/s is the same on every screen. Optional attributes on .np-marquee:
   data-speed="40" (px/s, default 40) · data-direction="right" (default: moves left).
   Without JS the first list simply sits there; with prefers-reduced-motion it stays static and centred. */
(function () {
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function build(root) {
    var source = root._npSource;
    if (!source) {
      var list = root.querySelector('.np-marquee__list');
      if (!list) return;
      source = root._npSource = list.cloneNode(true);
      root._npView = root.querySelector('.np-marquee__viewport');
    }
    var view = root._npView;
    var speed = parseFloat(root.getAttribute('data-speed')) || 40;
    var width = root.clientWidth;
    if (!width) return;

    var track = document.createElement('div');
    track.className = 'np-marquee__track';

    var first = source.cloneNode(true);
    track.appendChild(first);
    view.replaceChildren(track);

    if (reduced) { root.setAttribute('data-static', ''); return; }

    // repeat the items until one run is wider than the band (+ one item of slack)
    var items = [].slice.call(first.children);
    var guard = 0;
    while (first.scrollWidth < width * 1.1 && guard++ < 12) {
      items.forEach(function (li) {
        var copy = li.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        first.appendChild(copy);
      });
    }
    var run = first.scrollWidth;

    var twin = first.cloneNode(true);
    twin.setAttribute('aria-hidden', 'true');
    track.appendChild(twin);

    track.style.setProperty('--np-mq-dur', (run / speed).toFixed(1) + 's');
    track.style.animationDirection = root.getAttribute('data-direction') === 'right' ? 'reverse' : 'normal';
  }

  function init() {
    var roots = [].slice.call(document.querySelectorAll('.np-marquee'));
    roots.forEach(build);
    if (!window.ResizeObserver || reduced) return;
    var timer;
    var lastWidth = new WeakMap();
    roots.forEach(function (r) { lastWidth.set(r, r.clientWidth); });
    var ro = new ResizeObserver(function (entries) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        entries.forEach(function (e) {
          var w = e.target.clientWidth;
          if (w !== lastWidth.get(e.target)) { lastWidth.set(e.target, w); build(e.target); }
        });
      }, 150);
    });
    roots.forEach(function (r) { ro.observe(r); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
