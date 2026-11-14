/* Napele FAQ accordion (.np-faq on the Overview, between the doctor and "Como chegar"). The markup is static (overview/index.html) and complete: without this
   script every answer is simply open. With it:
   - .is-js on the section turns the answers into collapsible panels (napele.css animates their height with grid-template-rows, so nothing is measured here);
   - one question open at a time; a click on the open one closes it; all start closed;
   - aria-expanded on each button tells a screen reader which answer is open. Enter and Space are the button's own. */
(function () {
  var section = document.querySelector('.np-faq');
  if (!section) return;
  var items = [].slice.call(section.querySelectorAll('.np-faq__item'));
  if (!items.length) return;

  function set(item, open) {
    item.classList.toggle('is-open', open);
    item.querySelector('.np-faq__btn').setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  section.classList.add('is-js');
  items.forEach(function (item) {
    set(item, false);
    item.querySelector('.np-faq__btn').addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      items.forEach(function (other) { if (other !== item) set(other, false); });
      set(item, open);
    });
  });
})();
