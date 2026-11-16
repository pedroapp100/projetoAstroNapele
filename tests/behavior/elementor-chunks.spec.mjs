import { test, expect } from '@playwright/test';

// O Elementor 4 carrega "módulos" (chunks) sob demanda e, para todo contêiner da página, pede background-slideshow e background-video; para o widget de texto, text-editor.
// O export do design system não traz a pasta js/chunks/ (e a página não tem vídeo de fundo, slideshow nem capitular): eram ~150 erros no console e 3 pedidos 404 (403 na Vercel)
// em toda visita, e o ruído esconde erros de verdade. O napele-site.js registra esses 3 módulos como "sem efeito" em window.__elementorChunks, que o Elementor consulta antes de ir à rede.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const SEM_USO = ['background-video', 'background-slideshow', 'text-editor'];

for (const [nome, url] of [['home', '/'], ['página de tratamento', '/tratamentos/toxina-botulinica/']]) {
  test.describe(nome, () => {
    test('o Elementor não pede módulos à rede e não deixa erro de chunk no console', async ({ page }) => {
      const pedidos = [];
      const erros = [];
      page.on('request', (r) => { if (/\/js\/chunks\//.test(r.url())) pedidos.push(r.url()); });
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
      await page.goto(url);
      await page.waitForLoadState('load');
      await page.mouse.move(40, 40);
      await page.waitForTimeout(2500);   // o Elementor inicializa cada elemento depois do load
      expect(pedidos, 'pedidos a /js/chunks/').toEqual([]);
      expect(erros.filter((e) => /\[elementor\]|chunk/i.test(e)), 'erros de chunk no console').toEqual([]);
    });

    test('cada módulo "sem uso" é uma classe de handler que o Elementor consegue instanciar', async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('load');
      const formas = await page.evaluate((nomes) => nomes.map((n) => {
        const m = window.__elementorChunks && window.__elementorChunks[n];
        let instanciou = false;
        try { instanciou = !!(m && typeof m.default === 'function' && new m.default({ $element: null, elementName: 'x' })); } catch (e) { instanciou = false; }
        return [n, instanciou];
      }), SEM_USO);
      expect(formas).toEqual(SEM_USO.map((n) => [n, true]));
    });
  });
}

test('o Elementor continua funcionando: o carrossel dos tratamentos é inicializado (Swiper)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.mouse.move(40, 40);
  await expect(page.locator('#tratamentos .e-n-carousel.swiper-initialized')).toHaveCount(1, { timeout: 15_000 });
});
