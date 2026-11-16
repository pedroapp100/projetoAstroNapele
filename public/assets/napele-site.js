/* Adaptador do site: o design system roda em DOIS documentos (a navbar na página do catálogo e o Overview num iframe,
   que conversam por postMessage). O site é UM documento só. Este é o único JS que não vem do design system.
   Carregar ANTES de napele-preloader.js.

   Faz window.parent devolver um objeto cujo postMessage reentrega a mensagem como evento `message` da própria
   janela. Assim, as mensagens que os scripts do design system só enviam quando `window.parent !== window`
   (npPre do pré-loader, npLightbox dos lightboxes) chegam ao ramo "navbar" do napele-nav.js sem alterá-lo. */
(function () {
  try {
    Object.defineProperty(window, 'parent', {
      configurable: true,
      get: function () {
        return {
          postMessage: function (data) {
            window.dispatchEvent(new MessageEvent('message', { data: data, source: window, origin: window.location.origin }));
          },
        };
      },
    });
  } catch (err) { /* sem o adaptador a navbar apenas não recebe as mensagens do pré-loader */ }

  /* Módulos do Elementor que a página não usa. O Elementor 4 carrega "chunks" sob demanda (js/chunks/<nome>.min.js) e pede, para todo contêiner,
     background-slideshow e background-video, e text-editor para o widget de texto. O export do design system não traz essa pasta, e a página não tem
     vídeo de fundo, slideshow nem capitular: eram 3 pedidos que davam 404 (403 na Vercel) e ~150 erros no console em toda visita.
     Antes de ir à rede o Elementor consulta window.__elementorChunks[nome] e espera { default: ClasseDoHandler }; aqui os três já nascem registrados
     como um handler que não faz nada, então não há pedido nem erro. ATENÇÃO: se um dia a página ganhar vídeo ou slideshow de fundo, ou capitular no
     texto, estes três têm de sair daqui e o js/chunks/ real do plugin entrar em /assets/overview/wp-content/plugins/elementor/assets/. */
  var chunks = window.__elementorChunks = window.__elementorChunks || {};
  function NoHandler() {}
  NoHandler.prototype.getConstructorID = function () { return 'napele-no-handler'; };
  NoHandler.prototype.onDestroy = function () {};
  ['background-slideshow', 'background-video', 'text-editor'].forEach(function (nome) {
    if (!chunks[nome]) chunks[nome] = { default: NoHandler };
  });

  /* O que o napele-nav.js só faz no lado "iframe" (linhas 80–105 dele) e que no site precisa rodar na mesma página: o
     conteúdo do hero esmaece e sobe 60px enquanto o hero sai da tela (sem isso o texto desliza por baixo da navbar
     transparente) e a navbar vira vidro escuro depois de 70% da altura do hero. A navbar recebe {npNavScrolled}
     pelo mesmo window.parent acima. Mesma fórmula do design system. */
  var THRESHOLD = 0.7;
  function start() {
    var hero = document.querySelector('.elementor-element-d4f0def');
    var content = hero && hero.querySelector(':scope > .e-con-inner');
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var last = null;

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
      window.parent.postMessage({ npNavScrolled: scrolled }, '*');
    }

    window.addEventListener('scroll', report, { passive: true });
    window.addEventListener('resize', report, { passive: true });
    report();
  }
  // o hero ainda não existe quando este arquivo roda (fica no <head>); o napele-nav.js (no fim do body) já ouve a mensagem
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  /* Link para uma seção da home (/#tratamentos, /#como-chegar...) vindo de outra página: o pré-loader trava a rolagem e leva
     a página ao topo, então o salto do navegador para o #hash se perde e o visitante cai no topo da home. Quando o
     pré-loader termina (npPre 'off', pelo window.parent acima), vai para a seção. Sem pré-loader (movimento reduzido) o
     navegador já saltou sozinho e isto só repete o mesmo salto. */
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.npPre !== 'off' || !window.location.hash) return;
    var target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (target) target.scrollIntoView();
  });
})();
