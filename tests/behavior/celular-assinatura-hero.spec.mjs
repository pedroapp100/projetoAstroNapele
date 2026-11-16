import { test, expect } from '@playwright/test';

// A assinatura "Nayana Fialho" do hero (assets/hero/nayana-fialho.svg, dourado já no SVG) aparecia só do tablet para cima: o bloco dela tinha a classe
// `elementor-hidden-mobile`, herdada da etiqueta que ela substituiu no Overview. No celular ela agora aparece, centralizada, entre a foto e o título.
// Roda em todos os projetos (desktop e tablets guardam que nada mudou lá) e, no celular, no Android (Chromium, `mobile`) e no iPhone (WebKit, `iphone`).
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const CELULAR = ['mobile', 'iphone'];

async function abrir(page) {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.waitForTimeout(1800);
}

test('a assinatura do hero aparece, carregada e com altura para o traço fino ficar legível', async ({ page }) => {
  await abrir(page);
  const a = await page.evaluate(() => {
    const w = document.querySelector('.np-name');
    const img = w.querySelector('img');
    const r = img.getBoundingClientRect();
    return { display: getComputedStyle(w).display, h: r.height, w: r.width, naturalWidth: img.naturalWidth, vw: innerWidth };
  });
  expect(a.display, 'o bloco não está escondido').not.toBe('none');
  expect(a.naturalWidth, 'o SVG carregou').toBeGreaterThan(0);
  expect(a.h, 'altura em px').toBeGreaterThanOrEqual(40);
  expect(a.w, 'cabe na tela').toBeLessThanOrEqual(a.vw - 40);
});

test('a assinatura é pintada: há traço dourado na caixa dela (não só uma caixa vazia)', async ({ page }) => {
  await abrir(page);
  const clip = await page.evaluate(() => { const r = document.querySelector('.np-name img').getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.max(4, r.width), height: Math.max(4, r.height) }; });
  const png = await page.screenshot({ clip });
  const dourado = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] > 110 && d[i] > d[i + 2] + 30) n++;   // o dourado #cfb07b e os tons próximos
    return (n / (d.length / 4)) * 100;
  }, png.toString('base64'));
  expect(dourado, '% de pixels dourados na caixa da assinatura').toBeGreaterThan(0.8);
});

test('no celular ela fica centralizada, abaixo da barra, acima do título, e o botão continua na primeira tela', async ({ page }, testInfo) => {
  test.skip(!CELULAR.includes(testInfo.project.name), 'só celular (Android e iPhone)');
  await abrir(page);
  const g = await page.evaluate(() => {
    const hero = document.querySelector('.elementor-element-d4f0def');
    const r = (e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, width: b.width }; };
    const cta = [...hero.querySelectorAll('a')].find((x) => /Agendar/.test(x.textContent));
    return { vw: innerWidth, vh: innerHeight, nome: r(document.querySelector('.np-name img')), titulo: r(hero.querySelector('.elementor-heading-title, h1, h2')), cta: r(cta), rolagemHorizontal: document.documentElement.scrollWidth > innerWidth };
  });
  expect(Math.abs(g.nome.left + g.nome.width / 2 - g.vw / 2), 'centro da assinatura vs centro da tela (px)').toBeLessThan(8);
  expect(g.nome.top, 'abaixo da barra de navegação (~68 px)').toBeGreaterThanOrEqual(70);
  expect(g.nome.bottom, 'acima do título').toBeLessThanOrEqual(g.titulo.top);
  expect(g.cta.bottom, 'o botão não saiu da primeira tela').toBeLessThanOrEqual(g.vh);
  expect(g.rolagemHorizontal, 'sem rolagem horizontal').toBe(false);
});
