import { test, expect } from '@playwright/test';

// Títulos no iPhone. O CSS pinta os títulos com gradiente dourado (texto transparente + background-clip:text) e o napele-reveal.js divide cada um em palavras
// (`.np-rv-w` > `.np-rv-wi`, inline-block). O WebKit (Safari do iPhone) não pinta o clip do título através dessas palavras: o título sumia, e o texto abaixo,
// que é cor sólida, aparecia. Medido no WebKit: 0 pixels claros no título; com o gradiente nas palavras, ~10%.
// Roda no celular Android (Chromium, projeto `mobile`) e no iPhone (WebKit, projeto `iphone`; precisa de `npx playwright install webkit`).
test.beforeEach(({}, testInfo) => {
  test.skip(!['mobile', 'iphone'].includes(testInfo.project.name), 'só celular: Android (Chromium) e iPhone (WebKit)');
});
test.setTimeout(120_000);

const TITULOS = ['#np-protocol-title', '#np-gallery-title', '#np-doctor-title', '#np-visit-title', '#np-cta-title'];

// % de pixels claros (texto dourado sobre fundo escuro) na caixa do título, medido numa captura da tela
async function tinta(page, sel) {
  const clip = await page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    const x = Math.max(0, r.x);
    return { x, y: Math.max(0, r.y), width: Math.min(innerWidth - x, r.width), height: Math.max(8, r.height) };
  }, sel);
  const png = await page.screenshot({ clip });
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let claros = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.max(d[i], d[i + 1], d[i + 2]) > 120) claros++;
    return (claros / (d.length / 4)) * 100;
  }, png.toString('base64'));
}

async function abrir(page) {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.waitForFunction(() => !document.documentElement.classList.contains('np-pre-on'), null, { timeout: 45_000 });
  await page.waitForTimeout(1500);
}

test('os títulos com gradiente aparecem (têm texto pintado) depois do reveal', async ({ page }) => {
  await abrir(page);
  const medidas = {};
  for (const sel of TITULOS) {
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
    await page.waitForTimeout(2500);   // o reveal roda quando o título entra na tela
    medidas[sel] = Math.round((await tinta(page, sel)) * 10) / 10;
  }
  for (const sel of TITULOS) expect(medidas[sel], `pixels claros (%) em ${sel}; todos: ${JSON.stringify(medidas)}`).toBeGreaterThan(2);
});

test('o gradiente continua contínuo ao longo do título: cada palavra recebe o pedaço dela', async ({ page }) => {
  await abrir(page);
  await page.evaluate(() => document.querySelector('#np-protocol-title').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const h = document.querySelector('#np-protocol-title');
    const hr = h.getBoundingClientRect();
    const palavras = [...h.querySelectorAll('.np-rv-wi')].map((w) => {
      const s = getComputedStyle(w);
      return { gx: parseFloat(s.getPropertyValue('--np-gx')), gw: parseFloat(s.getPropertyValue('--np-gw')), esperado: hr.left - w.getBoundingClientRect().left, imagem: s.backgroundImage };
    });
    return { tituloSemFundo: getComputedStyle(h).backgroundImage, largura: hr.width, palavras };
  });
  expect(r.palavras.length).toBeGreaterThanOrEqual(3);
  expect(r.tituloSemFundo, 'o título não pinta o gradiente por conta própria').toBe('none');
  for (const p of r.palavras) {
    expect(p.imagem, 'a palavra pinta o gradiente').toContain('linear-gradient');
    expect(Math.abs(p.gw - r.largura), 'a largura do gradiente é a do título inteiro').toBeLessThan(1.5);
    expect(Math.abs(p.gx - p.esperado), 'o deslocamento põe a palavra no seu pedaço do gradiente').toBeLessThan(1.5);
  }
});
