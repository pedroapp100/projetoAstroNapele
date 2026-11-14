/* Napele "A clínica" gallery (.np-clinic__grid on the Overview, desktop). The nine photos of the grid (the eight around the centre card, and the card, which is the
   tour's first still) open in a lightbox when they are clicked, and the scroll still carries the centre card into the tour (napele-clinic.js). The two do not
   fight: a photo opens only while the grid is at rest, and the lightbox holds the scroll while it is open.
   - the photos: each cell of the grid becomes a button (role, tabindex, aria-label), zooms a little on hover, and opens its large version (the img's data-full:
     assets/clinica/galeria/<name>-lg.webp, 1664 x 936, made from FlowFrames/ by tools/prep-flowframes-galeria.py; the grid shows <name>.webp, 960 x 540; the
     card shows the tour's poster in the grid, since it is the first frame of the video, and the facade still in the lightbox). data-name is the short name shown in the counter;
   - "at rest" is --np-g (the tour's progress, written on #sobre-a-clinica) at or under REST, and not is-touring. Once the card starts to grow the photos fade and drift
     away, so a click on one would open something that is leaving; the centre card is the frame there, which takes the click (pointer-events, napele.css) only at rest;
   - up to 1024px the grid is not on the page: the eight photos are the gallery block after the tour (.np-gallery, in index.html, napele.css), and a tap on one opens the
     same lightbox, at the same photo (the item's data-i is its place in the nine: the card, the fifth, is not in the block). The card is not a button there;
   - the lightbox is the one of the results strip (.np-lb, napele.css): previous / next buttons, the arrow keys, a swipe (55px), Escape or a click outside to close,
     the focus kept inside and handed back to the photo;
   - inside the catalog's iframe the page tells the catalog to put its navbar away while the lightbox is open (napele-nav.js), which would otherwise cover the X. */
(function () {
  var track = document.getElementById('np-clinic');
  var sec = document.getElementById('sobre-a-clinica');
  var grid = track && track.querySelector('.np-clinic__grid');
  if (!sec || !grid) return;
  var cells = [].slice.call(grid.children).filter(function (el) { return el.querySelector('img'); });
  if (!cells.length) return;

  var wide = window.matchMedia ? window.matchMedia('(min-width: 1025px)') : { matches: true };
  var SWIPE = 55;     // px of horizontal drag that changes the photo
  var REST = 0.25;    // --np-g up to which the grid still counts as at rest (its photos are at least 67% visible)

  function img(i) { return cells[(i + cells.length) % cells.length].querySelector('img'); }
  function full(i) { var im = img(i); return im.getAttribute('data-full') || im.currentSrc || im.src; }
  function name(i) { return img(i).getAttribute('data-name') || img(i).alt; }

  // the photos are buttons only where they are on the page (from 1025px; on a tablet one of them still shows, and it would be a button that does nothing)
  function arm() {
    cells.forEach(function (el, i) {
      el.classList.toggle('np-clinic-gal', wide.matches);
      if (wide.matches) {
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', 'Ampliar foto: ' + name(i) + ', ' + (i + 1) + ' de ' + cells.length);
      } else {
        el.removeAttribute('role');
        el.removeAttribute('tabindex');
        el.removeAttribute('aria-label');
      }
    });
  }
  cells.forEach(function (el, i) { el.setAttribute('data-i', i); });
  arm();
  if (wide.addEventListener) wide.addEventListener('change', arm); else if (wide.addListener) wide.addListener(arm);

  function atRest() {
    var g = parseFloat(sec.style.getPropertyValue('--np-g')) || 0;
    return g <= REST && !track.classList.contains('is-touring');
  }

  // ---- lightbox
  var lb = document.createElement('div');
  lb.className = 'np-lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Foto da clínica ampliada');
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

  function show(i) {
    current = (i + cells.length) % cells.length;
    big.src = full(current);
    big.alt = img(current).alt;
    count.textContent = name(current) + ' · ' + (current + 1) + ' de ' + cells.length;
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
    tellCatalog(true);
    btnX.focus();
  }
  function close() {
    lb.classList.remove('is-open');
    if (scrollLock) { document.documentElement.style.overflow = scrollLock.html; document.body.style.overflow = scrollLock.body; scrollLock = null; }
    tellCatalog(false);
    if (opener) opener.focus({ preventScroll: true });
  }

  function opens(e) {
    var cell = e.target.closest ? e.target.closest('.np-clinic-gal') : null;
    if (cell && wide.matches && atRest()) open(+cell.getAttribute('data-i'), cell);
  }
  grid.addEventListener('click', opens);
  grid.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    opens(e);
  });
  // the gallery block of a tablet or a phone (display:none from 1025px, where the grid is): each photo opens the lightbox at its place in the nine
  var gallery = document.querySelector('.np-gallery');
  if (gallery) {
    [].slice.call(gallery.querySelectorAll('.np-gallery__item')).forEach(function (el) {
      var i = +el.getAttribute('data-i');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', 'Ampliar foto: ' + name(i) + ', ' + (i + 1) + ' de ' + cells.length);
    });
    var galleryOpens = function (e) {
      var item = e.target.closest ? e.target.closest('.np-gallery__item') : null;
      if (item) open(+item.getAttribute('data-i'), item);
    };
    gallery.addEventListener('click', galleryOpens);
    gallery.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      galleryOpens(e);
    });
  }
  // the centre card is the tour's frame once the script has run (the card itself is hidden under it): the frame is clickable only at rest
  var frame = track.querySelector('.np-clinic__frame');
  var card = grid.querySelector('.np-clinic__card');
  if (frame && card) frame.addEventListener('click', function () { if (wide.matches && atRest()) open(cells.indexOf(card), null); });

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
