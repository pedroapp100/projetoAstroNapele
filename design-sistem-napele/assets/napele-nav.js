/* Napele navbar behaviour, after napele.vercel.app: transparent over the hero, dark glass once the user has
   scrolled past 70% of the hero's height (that site: scrollY > hero.offsetHeight * 0.7).
   Two roles, one file:
   - inside the Overview iframe: reports when the 70% line is crossed to the catalog page (postMessage);
   - in the catalog page: toggles .np-nav-scrolled on .ds-nav. Outside the Overview (Tratamentos, Components) the
     bar is always dark, because those pages have light heroes where cream text on transparent would not read. */
(function () {
  var THRESHOLD = 0.7;

  var nav = document.querySelector('.ds-nav');

  if (nav) {
    var overviewScrolled = false;
    var apply = function () {
      var view = document.body.getAttribute('data-view');
      nav.classList.toggle('np-nav-scrolled', view !== 'overview' || overviewScrolled);
    };
    window.addEventListener('message', function (e) {
      if (!e.data || typeof e.data.npNavScrolled !== 'boolean') return;
      overviewScrolled = e.data.npNavScrolled;
      apply();
    });
    new MutationObserver(apply).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
    apply();

    // A lightbox open inside the Overview's iframe (napele-results.js, napele-clinic-gallery.js): the bar steps away, it would cover the X.
    window.addEventListener('message', function (e) {
      if (!e.data || typeof e.data.npLightbox !== 'boolean') return;
      nav.classList.toggle('np-nav-away', e.data.npLightbox);
    });

    // Overview preloader (napele-preloader.js, inside the iframe): the bar stays hidden (body.np-pre-hold, napele.css) until the preloader reaches
    // phase 3 ('nav') or ends ('off'); 'on' puts it back to waiting. Without the iframe's message (reduced motion, script failed, message sent
    // before this listener existed) it must not stay hidden: reduced motion releases it at once, anything else after 20 s.
    var hold = function (on) { document.body.classList.toggle('np-pre-hold', on); };
    window.addEventListener('message', function (e) {
      if (!e.data || typeof e.data.npPre !== 'string') return;
      hold(e.data.npPre === 'on');
    });
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) hold(false);
    else setTimeout(function () { hold(false); }, 20000);

    // Over the Overview and Tratamentos iframes the bar floats above the page, and those iframes scroll on their own:
    // without this the bar runs under their scrollbar and the burger touches it. The iframe is not readable from here
    // (file:// is cross-origin), but its scrollbar is the system one, so a probe element tells its width.
    var syncScrollbar = function () {
      var probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;left:-999px;width:100px;height:100px;overflow:scroll;visibility:hidden';
      document.body.appendChild(probe);
      var w = probe.offsetWidth - probe.clientWidth;
      probe.remove();
      document.documentElement.style.setProperty('--np-sbw', w + 'px');
    };
    syncScrollbar();
    window.addEventListener('resize', syncScrollbar, { passive: true });

    // Hamburger (767px and below): opens the menu as a full-screen overlay, like napele.vercel.app.
    var burger = nav.querySelector('.np-burger');
    if (burger) {
      var wide = window.matchMedia('(min-width: 768px)');
      var setOpen = function (open) {
        nav.classList.toggle('np-nav-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      };
      burger.addEventListener('click', function () { setOpen(!nav.classList.contains('np-nav-open')); });
      // choosing a tab (or tapping the logo) closes it; the hash change itself is handled by the catalog script
      nav.addEventListener('click', function (e) {
        if (e.target.closest('#ds-tabs a, .elementor-widget-image a')) setOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('np-nav-open')) { setOpen(false); burger.focus(); }
      });
      var onWide = function (e) { if (e.matches) setOpen(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide); else wide.addListener(onWide);
    }
    return;
  }

  if (window.parent === window) return;

  var hero = document.querySelector('.elementor-element-d4f0def');
  var content = hero && hero.querySelector(':scope > .e-con-inner');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var last = null;

  // The hero text and button fade out and rise 60px while the hero scrolls away (that site: scrub from the top of
  // the hero until its bottom reaches the middle of the screen). Without it they slide under the transparent bar.
  function fadeContent() {
    if (!content) return;
    var p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.5)));
    var eased = p * p * (3 - 2 * p);
    content.style.opacity = (1 - eased).toFixed(3);
    content.style.transform = reduced ? '' : 'translateY(' + (-60 * eased).toFixed(1) + 'px)';
    content.style.pointerEvents = p > 0.9 ? 'none' : '';
  }

  function report() {
    fadeContent();
    var limit = hero ? hero.offsetHeight * THRESHOLD : 100;
    var scrolled = window.scrollY > limit;
    if (scrolled === last) return;
    last = scrolled;
    try { window.parent.postMessage({ npNavScrolled: scrolled }, '*'); } catch (err) { /* cross-origin parent: nothing to do */ }
  }
  window.addEventListener('scroll', report, { passive: true });
  window.addEventListener('resize', report, { passive: true });
  report();
})();
