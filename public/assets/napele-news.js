/* Napele "Novidades" tabs (.np-news on the Overview, between the gold marquee and "Nossos tratamentos"). The markup is static (overview/index.html) and
   complete: without this script both treatments are simply shown, one under the other. With it:
   - .is-js on the section turns the two cards into tabs: the tab bar appears and only the selected card is shown (the others get [hidden]);
   - the first tab starts selected; a click, or the arrow keys / Home / End on the tab bar, selects another and fades its card in;
   - aria-selected and a roving tabindex tell a screen reader and the keyboard which tab is current. */
(function () {
  var section = document.querySelector('.np-news');
  if (!section) return;
  var tabs = [].slice.call(section.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (tab) { return document.getElementById(tab.getAttribute('aria-controls')); });
  if (!tabs.length || panels.some(function (panel) { return !panel; })) return;

  function select(index, focus, animate) {
    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
      panels[i].classList.remove('is-in');
      if (on && animate) {
        void panels[i].offsetWidth; // restart the fade if the same card is picked again
        panels[i].classList.add('is-in');
      }
    });
    if (focus) tabs[index].focus();
  }

  section.classList.add('is-js');
  select(0, false, false);

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(i, false, true); });
    tab.addEventListener('keydown', function (e) {
      var next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next < 0) return;
      e.preventDefault();
      select(next, true, true);
    });
  });
})();
