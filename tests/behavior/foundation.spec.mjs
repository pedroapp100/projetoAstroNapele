import { test, expect } from '@playwright/test';

// Sem movimento: o pré-loader não trava a página e as medidas ficam estáveis.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const NAPELE_SCRIPTS = [
  'napele-tiles.js', 'napele-nav.js', 'napele-marquee.js', 'napele-procedures.js', 'napele-results.js',
  'napele-faq.js', 'napele-contact.js', 'napele-clinic.js', 'napele-clinic-gallery.js', 'napele-reveal.js',
  'napele-preloader.js',
];

// O export do design system não traz os "chunks" lazy do Elementor (background-video, text-editor...): o próprio
// Overview original já acusa esses 404. O critério é, portanto, "nenhum problema além dos que o Overview já tem".
async function problemsOf(context, url) {
  const page = await context.newPage();
  const problems = new Set();
  const clean = (s) => s.replace(/\?ver=[\w.]+/g, '');
  page.on('pageerror', (e) => problems.add(`pageerror: ${clean(e.message)}`));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && problems.add(`console: ${clean(m.text())}`));
  page.on('response', (r) => r.status() >= 400 && problems.add(`${r.status()}: ${clean(r.url())}`));
  await page.goto(url);
  await page.waitForLoadState('load');
  await page.waitForTimeout(2500);
  await page.close();
  return [...problems];
}

test('a página não tem nenhum erro ou arquivo faltando além dos que o Overview original já tem', async ({ context }) => {
  const original = await problemsOf(context, '/assets/overview/index.html');
  const site = await problemsOf(context, '/');
  // TEMPORÁRIO (remover na Tarefa 12): sem `data-e-type`/`data-settings` no markup (causa C7), o Elementor tenta
  // carregar todos os chunks. Some sozinho quando cada seção voltar a ser cópia literal do index.html.
  const chunkDoElementor = (p) => /elementor\/assets\/js\/chunks\/|failed to load chunk/.test(p);
  const novos = site.filter((p) => !original.includes(p) && !chunkDoElementor(p));
  expect(novos).toEqual([]);
});

test('o Elementor frontend está ativo, como no Overview', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => typeof window.elementorFrontend)).toBe('object');
});

test('nenhum ancestral do passeio corta o position: sticky', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const clipping = await page.evaluate(() => {
    const out = [];
    for (let el = document.querySelector('.np-clinic')?.parentElement; el; el = el.parentElement) {
      const c = getComputedStyle(el);
      if (c.overflowX !== 'visible' || c.overflowY !== 'visible') out.push(`${el.tagName.toLowerCase()}: ${c.overflowX}/${c.overflowY}`);
    }
    return out;
  });
  expect(clipping).toEqual([]);
});

test('cada script do design system carrega uma única vez', async ({ page }) => {
  await page.goto('/');
  const counts = await page.evaluate((names) => Object.fromEntries(names.map((n) => [n, document.querySelectorAll(`script[src*="/assets/${n}"]`).length])), NAPELE_SCRIPTS);
  expect(counts).toEqual(Object.fromEntries(NAPELE_SCRIPTS.map((n) => [n, 1])));
});

test('adaptador: window.parent entrega as mensagens do design system à própria janela', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  // os scripts do DS só postam quando `window.parent !== window` (estão num iframe no DS)
  expect(await page.evaluate(() => window.parent !== window)).toBe(true);
  const hold = () => page.evaluate(() => document.body.classList.contains('np-pre-hold'));
  await page.evaluate(() => window.parent.postMessage({ npPre: 'on' }, '*'));
  await expect.poll(hold).toBe(true);
  await page.evaluate(() => window.parent.postMessage({ npPre: 'nav' }, '*'));
  await expect.poll(hold).toBe(false);
});
