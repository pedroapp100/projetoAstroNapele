/* Napele contact points: the only place in the project that holds a WhatsApp number, a phone or a social profile. Fill the fields below; every page reads them.

   whatsapp   digits with country and area code, no spaces or signs: '5562900000000'. The "Agendar Avaliação" buttons open wa.me/<number> with the message below.
   phone      how the number is written in the footer: '(62) 9 0000-0000'. Shown as a WhatsApp link.
   instagram, youtube, tiktok   the full address of the profile or channel, or ''.
   message    the text the WhatsApp conversation starts with.

   While a field is empty the page stays honest: the booking buttons take the visitor to "Como chegar" (the address), the footer's phone block and the
   empty social icons stay hidden. Nothing here points to another clinic. Works on the Overview, on the treatment page and in the catalog.

   The icons in the catalog's navbar (data-np-icon) are the exception: they stay in the bar either way. With an address they are links; without one
   they are plain icons (no href, aria-disabled). The location icon is a fixed link to the clinic's route on Google Maps, not a field here. */
(function () {
  var CONTACT = {
    whatsapp: '5562994949157',
    phone: '',
    instagram: '',
    youtube: '',
    tiktok: '',
    message: 'Olá gostaria de saber mais sobre os procedimentos e protocolos da napele!'
  };

  // where a booking button goes while there is no WhatsApp: the address, which is "Como chegar" on the Overview (this page, if it has it)
  var script = document.currentScript, base = script && script.src ? script.src.replace(/napele-contact\.js.*$/, '') : '';
  var visit = document.getElementById('como-chegar') ? '#como-chegar' : (base ? base + 'overview/index.html#como-chegar' : '#');

  var digits = String(CONTACT.whatsapp).replace(/\D/g, '');
  var wa = digits ? 'https://wa.me/' + digits + '?text=' + encodeURIComponent(CONTACT.message) : '';

  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }

  function apply() {
    // booking buttons (and their copy in the tour's last stop): WhatsApp when there is a number, "Como chegar" when there is not
    each('a[data-np-contact="whatsapp"]', function (a) {
      if (wa) { a.href = wa; a.target = '_blank'; a.rel = 'noopener'; }
      else { a.setAttribute('href', visit); a.removeAttribute('target'); a.removeAttribute('rel'); }
    });
    // footer: the phone line and its heading, only when there is a phone
    each('[data-np-contact="phone-group"]', function (el) { el.hidden = !CONTACT.phone; });
    each('[data-np-contact="phone"]', function (a) {
      if (!CONTACT.phone) return;
      var label = a.querySelector('.elementor-icon-list-text');
      if (label) label.textContent = CONTACT.phone;
      if (wa) { a.href = wa; a.target = '_blank'; a.rel = 'noopener'; }
      else { a.setAttribute('href', visit); }
    });
    // social icons: only the ones that have an address
    ['instagram', 'youtube', 'tiktok'].forEach(function (k) {
      each('a[data-np-contact="' + k + '"]', function (a) {
        if (CONTACT[k]) { a.href = CONTACT[k]; a.target = '_blank'; a.rel = 'noopener'; a.hidden = false; }
        else { a.hidden = true; }
      });
    });
    // navbar icons (catalog page): always in the bar; a link when there is an address, a plain icon when there is not
    each('a[data-np-icon]', function (a) {
      var k = a.getAttribute('data-np-icon'), url = k === 'whatsapp' ? wa : CONTACT[k];
      if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.removeAttribute('aria-disabled'); }
      else { a.removeAttribute('href'); a.removeAttribute('target'); a.removeAttribute('rel'); a.setAttribute('aria-disabled', 'true'); }
    });
  }

  // before napele-clinic.js copies the button into the tour: this file is loaded first, and runs at once
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  apply();
})();
