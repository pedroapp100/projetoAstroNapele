import { test, expect } from '@playwright/test';
import { loadTreatments } from '../../src/lib/treatments.mjs';
import { openPair, settle } from '../parity/harness.mjs';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

// O carrossel do Overview é configurado pelo Elementor a partir do `data-settings` do widget (loop, autoplay,
// espaçamento, offset). Sem esse atributo o Elementor sobe o Swiper com os padrões e o carrossel sai errado.
const carousel = (page) => page.evaluate(() => {
  const el = document.querySelector('#tratamentos .e-n-carousel');
  const s = el && el.swiper;
  if (!s) return null;
  const p = s.params;
  const bp = Object.fromEntries(Object.entries(p.breakpoints || {}).map(([k, v]) => [k, [v.slidesPerView, v.spaceBetween]]));
  return {
    slidesPerView: p.slidesPerView, spaceBetween: p.spaceBetween, loop: p.loop, speed: p.speed, centeredSlides: p.centeredSlides,
    autoplay: p.autoplay && p.autoplay.delay ? { delay: p.autoplay.delay, pauseOnMouseEnter: !!p.autoplay.pauseOnMouseEnter, disableOnInteraction: !!p.autoplay.disableOnInteraction } : false,
    breakpoints: bp, slides: s.slides.length, offsetRight: el.classList.contains('offset-right'),
  };
});

test('o carrossel de tratamentos tem a mesma configuração do Overview', async ({ context }) => {
  const { astro, ref } = await openPair(context);
  const [a, r] = [await carousel(astro), await carousel(ref)];
  expect(r, 'o Overview deveria ter o carrossel inicializado').not.toBeNull();
  expect(a, 'o Astro deveria ter o carrossel inicializado').not.toBeNull();
  expect(a).toEqual(r);
});

// Regressão real vista no Chrome do usuário: com `defer` nos scripts do Elementor, o jQuery dispara o "ready" por
// timer entre um script e outro. Se um script do Elementor Pro demora a baixar, o Elementor inicializa ANTES de o Pro
// registrar o carrossel e o Swiper nunca nasce (aparece um card gigante). O original controla a ordem (WP Rocket).
for (const slow of [
  'elementor-pro/assets/js/frontend.min.js',
  'elementor-pro/assets/js/elements-handlers.min.js',
  'elementor-pro/assets/js/webpack-pro.runtime.min.js',
  'elementor/assets/lib/swiper/v8/swiper.min.js',
]) {
  test(`o carrossel inicializa mesmo quando ${slow.split('/').pop()} demora para chegar`, async ({ page }) => {
    await page.route(`**/${slow}`, async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.mouse.move(40, 40);
    await page.waitForFunction(() => document.querySelector('#tratamentos .e-n-carousel.swiper-initialized'), null, { timeout: 15_000 })
      .catch(() => {});
    const state = await page.evaluate(() => {
      const c = document.querySelector('#tratamentos .e-n-carousel');
      return { initialized: !!(c && c.swiper), slides: c ? c.querySelectorAll('.swiper-slide').length : 0, slideWidth: c ? Math.round(c.querySelector('.swiper-slide').getBoundingClientRect().width) : 0, carouselWidth: c ? Math.round(c.getBoundingClientRect().width) : 0 };
    });
    expect(state.initialized, `sem Swiper: slide de ${state.slideWidth}px num carrossel de ${state.carouselWidth}px`).toBe(true);
    // o loop montado (13 reais + cópias dos dois lados) e, a partir de 768px, vários cards por vez em vez de um só do
    // tamanho do carrossel (no celular o design system mostra mesmo um card por vez)
    expect(state.slides).toBeGreaterThan(13);
    if (page.viewportSize().width > 767) expect(state.slideWidth).toBeLessThan(state.carouselWidth * 0.6);
  });
}

test('ao ir para #tratamentos o título da seção fica abaixo da navbar, não atrás dela', async ({ page }) => {
  await page.goto('/#tratamentos');
  await settle(page);
  const m = await page.evaluate(() => ({
    navBottom: document.querySelector('.ds-nav').getBoundingClientRect().bottom,
    headingTop: document.querySelector('#tratamentos h2').getBoundingClientRect().top,
    sectionTop: document.querySelector('#tratamentos').getBoundingClientRect().top,
  }));
  expect(m.headingTop, `título em ${m.headingTop}px, navbar termina em ${m.navBottom}px`).toBeGreaterThanOrEqual(m.navBottom);
  expect(m.sectionTop, 'a seção deve começar logo abaixo da navbar').toBeGreaterThanOrEqual(m.navBottom - 1);
});

// Os cards da home levam às páginas de tratamento (/tratamentos/<slug>/), que existem para os 13 tratamentos.
test('cada card do carrossel leva à página do seu tratamento', async ({ page }) => {
  const slugs = loadTreatments().list.map((t) => `/tratamentos/${t.slug}/`);
  await page.goto('/');
  await settle(page);
  const hrefs = await page.$$eval('#tratamentos .swiper-slide:not(.swiper-slide-duplicate) a', (as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs, 'sem âncoras mortas #tratamento-…').toEqual(slugs);
});

test('clicar num card abre a página daquele tratamento', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  const card = page.locator('#tratamentos .swiper-slide:not(.swiper-slide-duplicate) a[href="/tratamentos/fios-de-pdo/"]');
  await card.evaluate((a) => a.click()); // o carrossel corta cards fora da vista; o clique do DOM prova só o destino
  await page.waitForURL('**/tratamentos/fios-de-pdo/');
  expect(await page.evaluate(() => document.querySelector('h1').textContent.trim())).toBe('Fios de PDO');
});

test('os links de tratamento do rodapé da home levam às páginas (como no modelo do design system)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const hrefs = await page.$$eval('footer[data-elementor-type="footer"] a.elementor-item', (as) => as.map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/tratamentos/')));
  expect([...new Set(hrefs)]).toEqual(['/tratamentos/toxina-botulinica/', '/tratamentos/preenchimento-com-acido-hialuronico/', '/tratamentos/fios-de-pdo/', '/tratamentos/intradermoterapia/']);
});
