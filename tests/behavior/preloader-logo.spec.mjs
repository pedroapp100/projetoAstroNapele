import { test, expect } from '@playwright/test';

// Abertura em três tempos: logo → foto → textos (docs/superpowers/specs/2026-11-16-preloader-logo-design.md).
test.beforeEach(({}, testInfo) => {
  test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o pré-loader leva ~11 s: só desktop e celular');
});
test.setTimeout(60_000);

// O fundo da abertura é o do site, não um preto liso: o escuro do véu da hero (--np-dark-rgb) com o grão do kit (.bg: noise-01.webp, opacidade .4).
const VEU = 'rgb(36, 35, 33)';

// Amostra a cada quadro. t = 0 quando a cobertura preta sai (html.np-pre-ready); termina quando np-pre-on sai.
async function sampleOpening(page) {
  await page.addInitScript(() => {
    const trace = (window.__trace = []);
    let t0 = null;
    const op = (sel) => { const e = document.querySelector(sel); return e ? Number(getComputedStyle(e).opacity) : null; };
    const tick = () => {
      const root = document.documentElement;
      if (t0 === null && root.classList.contains('np-pre-ready')) t0 = performance.now();
      if (t0 !== null) {
        trace.push({ t: (performance.now() - t0) / 1000, logo: op('.np-pre__logo'), bg: op('.np-pre__bg'), count: op('.np-pre__count'), kick: op('.np-pre__kick-t') });
        if (!root.classList.contains('np-pre-on')) { window.__traceDone = true; return; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__traceDone === true, null, { timeout: 30_000 });
  return page.evaluate(() => window.__trace);
}

const logoVisivel = (page, min) => page.waitForFunction((m) => { const e = document.querySelector('.np-pre__logo'); return !!e && Number(getComputedStyle(e).opacity) > m; }, min, { timeout: 15_000 });

test('a logo abre sozinha, some quando a foto entra, e só então vêm os textos e o contador', async ({ page }) => {
  const T = await sampleOpening(page);
  const at = (t) => T.find((s) => s.t >= t);
  expect(at(1.5).logo).toBeGreaterThan(0.95);                                   // 1. logo inteira...
  for (const k of ['bg', 'count', 'kick']) expect(at(1.5)[k], k).toBeLessThan(0.02);   // ...e mais nada
  expect(at(2.8).logo ?? 0).toBeLessThan(0.02);                                  // 2. a logo foi
  expect(at(3.1).bg).toBeGreaterThan(0.98);                                      //    a foto está inteira
  expect(T.filter((s) => s.t < 2.9).every((s) => s.kick < 0.02 && s.count < 0.02)).toBe(true);   // 3. textos só depois (T0 = 3,0 s)
  expect(at(4.0).count).toBeGreaterThan(0.9);
  expect(at(5.5).kick).toBeGreaterThan(0.9);
  expect(T.at(-1).t).toBeGreaterThan(10.5);                                      // 4. duração ≈ 11,25 s
  expect(T.at(-1).t).toBeLessThan(12);
});

test('a logo cabe na tela e fica centralizada', async ({ page }) => {
  await page.goto('/');
  await logoVisivel(page, 0.95);
  const r = await page.locator('.np-pre__logo img').boundingBox();
  const ov = await page.locator('#np-pre').boundingBox();   // o pré-loader reserva a faixa da barra de rolagem (scrollbar-gutter: stable): a logo centraliza nele, não na janela inteira
  expect(r.width).toBeGreaterThan(ov.width * 0.2);
  expect(r.width).toBeLessThan(ov.width * 0.7);
  expect(Math.abs(r.x + r.width / 2 - (ov.x + ov.width / 2))).toBeLessThan(4);
});

test('a tela da logo tem o véu escuro do site e o grão por baixo, não um preto liso', async ({ page }) => {
  await page.goto('/');
  await logoVisivel(page, 0.95);
  const g = await page.evaluate(() => {
    const e = document.querySelector('.np-pre__ground');
    if (!e) return null;
    const a = getComputedStyle(e, '::after');
    return { bg: getComputedStyle(e).backgroundColor, grain: a.backgroundImage, op: Number(a.opacity), z: getComputedStyle(e).zIndex, pre: getComputedStyle(document.querySelector('#np-pre')).backgroundColor };
  });
  expect(g, 'existe .np-pre__ground').not.toBeNull();
  expect(g.bg).toBe(VEU);
  expect(g.pre).toBe(VEU);
  expect(g.grain).toContain('noise-01.webp');
  expect(g.op).toBeCloseTo(0.4, 2);
  // de fato há textura na tela: um canto sem texto (a logo fica no centro, o "Pular" na direita) tem média do véu e desvio > 0
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 240, height: 140 } });
  const s = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0, sum = 0, sq = 0;
    for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += v; sq += v * v; n++; }
    const mean = sum / n; return { mean, std: Math.sqrt(Math.max(0, sq / n - mean * mean)) };
  }, png.toString('base64'));
  expect(Math.abs(s.mean - 35), `média ${s.mean}`).toBeLessThan(6);
  expect(s.std, 'o grão existe (desvio dos pixels)').toBeGreaterThan(0.2);
});

test('a cobertura de primeiro desenho tem a cor e o grão do fundo da logo (sem salto quando ela sai)', async ({ page }) => {
  await page.addInitScript(() => {
    window.__cover = null;
    const tick = () => {
      const r = document.documentElement;
      if (r.classList.contains('np-pre-on') && !r.classList.contains('np-pre-ready')) {
        window.__cover = { bg: getComputedStyle(r, '::before').backgroundColor, html: getComputedStyle(r).backgroundColor, grain: getComputedStyle(r, '::after').backgroundImage };
        return;
      }
      if (!r.classList.contains('np-pre-ready')) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.classList.contains('np-pre-ready'), null, { timeout: 15_000 });
  const c = await page.evaluate(() => window.__cover);
  expect(c, 'a cobertura foi vista').not.toBeNull();
  expect(c.bg).toBe(VEU);
  expect(c.html).toBe(VEU);   // a faixa da barra de rolagem usa o fundo do <html>
  expect(c.grain).toContain('noise-01.webp');
});

test('se a logo falhar, o pré-loader pula a fase da logo e termina em ~9 s', async ({ page }) => {
  await page.route('**/logo/LogoNapele.svg', (route) => route.abort());
  const T = await sampleOpening(page);
  expect(T.every((s) => (s.logo ?? 0) < 0.02)).toBe(true);
  expect(T.find((s) => s.t >= 1.0).bg).toBeGreaterThan(0.98);
  expect(T.at(-1).t).toBeGreaterThan(8.4);
  expect(T.at(-1).t).toBeLessThan(9.8);
});

for (const how of ['clique', 'Escape']) {
  test(`"Pular" (${how}) durante a logo termina o pré-loader em até 3 s`, async ({ page }) => {
    await page.goto('/');
    await logoVisivel(page, 0.5);
    if (how === 'clique') await page.click('#np-pre-skip'); else await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.documentElement.classList.contains('np-pre-on'), null, { timeout: 3_000 });
  });
}

test.describe('sem animação', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('não há pré-loader, nem logo, nem véu', async ({ page }) => {   // guarda: já passa antes da mudança e tem de continuar passando
    await page.goto('/');
    await page.waitForLoadState('load');
    expect(await page.evaluate(() => document.documentElement.classList.contains('np-pre-on'))).toBe(false);
    expect(await page.locator('#np-pre, .np-pre__logo, .np-pre__ground').count()).toBe(0);
  });
});
