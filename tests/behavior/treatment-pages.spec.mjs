import { test, expect } from '@playwright/test';
import { loadTreatments } from '../../src/lib/treatments.mjs';
import { settle } from '../parity/harness.mjs';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const { list } = loadTreatments();
const CARDS = ['11a5e25', '809394d', '2195691', 'a9914de'];
// O export do design system não traz os "chunks" lazy do Elementor: o modelo original já acusa esses 404 (ver foundation.spec.mjs).
const CHUNK = /elementor\/assets\/js\/chunks\/|failed to load chunk/;
const LOREM = /Velit esse|Excepteur sint|Quis nostrud|Aliquip ex|Minim veniam|Referência em estética facial e corporal/;
const text = (page, sel) => page.locator(sel).first().evaluate((el) => el.textContent.trim());

for (const t of list) {
  test(`/tratamentos/${t.slug}/ mostra o texto do tratamento, sem lorem e sem erros`, async ({ page }) => {
    const problems = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    // "Failed to load resource" é só o eco do 404 de rede, que o handler de `response` abaixo já registra com a URL
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(`console: ${m.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });

    const res = await page.goto(`/tratamentos/${t.slug}/`);
    expect(res.status()).toBe(200);
    await settle(page);

    await expect(page).toHaveTitle(`${t.name} · Napele Clínica`);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe(t.intro);
    expect(await page.locator('body').getAttribute('data-treatment')).toBe(t.slug);

    expect(await page.evaluate(() => document.querySelectorAll('h1').length), 'um só h1 (a barra de dev do Astro tem os seus, em shadow DOM)').toBe(1);
    expect(await text(page, '.elementor-element-d4f0def h1')).toBe(t.name);
    expect(await text(page, '.elementor-element-d4f0def .elementor-image-box-description')).toBe(t.intro);

    expect(await text(page, '.elementor-element-9a98fab h2')).toBe(t.about.title);
    expect(await text(page, '.elementor-element-9a98fab p')).toBe(t.about.text.join(''));
    const img = page.locator('.elementor-element-af0503e img');
    expect(await img.getAttribute('src')).toBe(`/assets/treatments/${t.photo}`);
    expect(await img.getAttribute('alt')).toBe(t.name);
    expect(await img.evaluate((el) => el.complete && el.naturalWidth > 0), 'a foto do tratamento carrega').toBe(true);

    expect(await text(page, '.elementor-element-10edd60 h2')).toBe(`${t.name}: para quem é indicado`);
    for (const [i, id] of CARDS.entries()) {
      expect(await text(page, `.elementor-element-${id} .elementor-icon-box-title span`)).toBe(t.forWhom[i].title);
      expect(await text(page, `.elementor-element-${id} p`)).toBe(t.forWhom[i].text);
    }

    expect(await page.locator('body').innerText()).not.toMatch(LOREM);
    expect(await page.evaluate(() => document.documentElement.classList.contains('np-pre-on') || document.body.classList.contains('np-pre-hold') || !!document.querySelector('.np-pre'))).toBe(false);
    expect(problems.filter((p) => !CHUNK.test(p))).toEqual([]);
  });
}

test('sem JavaScript o texto já está no HTML (é o que o buscador lê)', async ({ request }) => {
  const t = list.find((x) => x.slug === 'fios-de-pdo');
  const html = await (await request.get('/tratamentos/fios-de-pdo/')).text();
  expect(html).toMatch(/<h1 class="elementor-image-box-title"[^>]*>Fios de PDO<\/h1>/); // o dev do Astro acrescenta data-astro-source-*
  expect(html).toContain(t.intro);
  for (const c of t.forWhom) expect(html).toContain(c.title);
  expect(html).not.toMatch(LOREM);
});

test('slug que não existe devolve 404 (não cai em outro tratamento)', async ({ request }) => {
  expect((await request.get('/tratamentos/nao-existe/')).status()).toBe(404);
});

test('a página abre também sem a barra final', async ({ request }) => {
  expect((await request.get('/tratamentos/fios-de-pdo')).status()).toBe(200);
});

test('navbar: leva à home, marca "Tratamentos" como atual e fica escura desde o topo', async ({ page }) => {
  await page.goto('/tratamentos/fios-de-pdo/'); await settle(page);
  const links = await page.$$eval('.ds-nav .elementor-nav-menu--main a', (as) => as.map((a) => `${a.getAttribute('href')}|${a.textContent.trim()}|${a.getAttribute('aria-current') || ''}`));
  expect(links).toEqual(['/|Início|', '/#tratamentos|Tratamentos|page', '/#sobre-a-clinica|A Clínica|', '/#como-chegar|Como chegar|']);
  expect(await page.locator('.ds-nav').evaluate((n) => n.classList.contains('np-nav-scrolled'))).toBe(true);
});

test('nenhum link da página fica como âncora morta (#…): vão para a home', async ({ page }) => {
  await page.goto('/tratamentos/fios-de-pdo/'); await settle(page);
  const dead = await page.$$eval('a[href^="#"]', (as) => as.map((a) => `${a.getAttribute('href')} ${a.textContent.trim().slice(0, 30)}`));
  expect(dead).toEqual([]);
  const cta = await page.$$eval('a.elementor-button[data-np-contact="whatsapp"]', (as) => as.map((a) => a.getAttribute('href')));
  expect(cta.length).toBeGreaterThanOrEqual(2);
});
