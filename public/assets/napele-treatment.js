/* Napele treatment page (overview/tratamento.html): one page for every treatment. It reads ?t=<slug>, looks the treatment up in
   treatments.js and fills the places that change from one treatment to the next: the title and paragraph of the hero, the
   title and photo of "Conheça o procedimento", the title of "Para quem é", and the page title. Optional fields of a treatment
   (about.text, forWhom) replace the placeholder text of the page when they exist; without them the placeholder stays. about.text is
   one paragraph (string) or several (array, kept apart by the same blank line the template has); a forWhom card is { title, text }
   (a plain string sets only its text). An unknown or missing slug shows the first treatment. Load it before napele-tiles.js: the hero is only as
   tall as its text on this page (no portrait, napele.css), and that script sizes the tile wall to the hero. */
(function () {
  var DATA = window.NAPELE_TREATMENTS;
  if (!DATA) return;
  var slug = new URLSearchParams(location.search).get('t');
  var t = DATA.find(slug) || DATA.first;

  function first(sel) { return document.querySelector(sel); }
  function setText(sel, value) {
    var el = first(sel);
    if (el && value != null && value !== '') el.textContent = value;
  }
  // paragraphs of one <p>, the way the template has them: text, <br><br>, text (nodes, not innerHTML: the copy is data, not markup)
  function setParagraphs(sel, value) {
    var el = first(sel), paras = [].concat(value);
    if (!el || !paras.length) return;
    el.textContent = '';
    paras.forEach(function (text, i) {
      if (i) { el.appendChild(document.createElement('br')); el.appendChild(document.createElement('br')); }
      el.appendChild(document.createTextNode(text));
    });
  }

  // hero (the same one as the Home)
  setText('.elementor-element-9c6552f h1', t.name);
  setText('.elementor-element-9c6552f p', t.intro || DATA.defaultIntro);

  // Conheça o procedimento
  setText('.elementor-element-9a98fab h2', (t.about && t.about.title) || t.name);
  if (t.about && t.about.text) setParagraphs('.elementor-element-9a98fab p', t.about.text);
  var photo = first('.elementor-element-af0503e img');
  if (photo && t.photo) {
    ['srcset', 'sizes', 'data-lazy-src', 'data-lazy-srcset', 'data-lazy-sizes'].forEach(function (a) { photo.removeAttribute(a); });
    photo.classList.remove('lazyload');
    photo.src = new URL('../treatments/' + t.photo, location.href).href;
    photo.alt = t.name;
  }

  // Para quem é
  setText('.elementor-element-10edd60 h2', t.name + ': para quem é indicado');
  ['11a5e25', '809394d', '2195691', 'a9914de'].forEach(function (id, i) {
    var card = t.forWhom && t.forWhom[i];
    if (!card) return;
    if (typeof card === 'string') card = { text: card };
    setText('.elementor-element-' + id + ' .elementor-icon-box-title span', card.title);
    setText('.elementor-element-' + id + ' p', card.text);
  });

  document.title = t.name + ' · Napele Clínica';
  document.body.setAttribute('data-treatment', t.slug);
})();
