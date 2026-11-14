import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { settle } from '../parity/harness.mjs';

// Sem movimento: o pré-loader não trava a rolagem (ele é testado à parte, na Tarefa 1).
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const heroHeight = (page) => page.evaluate(() => document.querySelector('.elementor-element-d4f0def').offsetHeight);
const scrollTo = async (page, y) => { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(500); };
const navState = (page) => page.evaluate(() => { const n = document.querySelector('.ds-nav'); const c = getComputedStyle(n); return { scrolled: n.classList.contains('np-nav-scrolled'), open: n.classList.contains('np-nav-open'), bg: c.backgroundColor, position: c.position }; });

test.describe('navbar (desktop)', () => {
  test('é fixa, transparente no topo e vira vidro escuro depois de 70% do hero', async ({ page }) => {
    await page.goto('/'); await settle(page);
    const H = await heroHeight(page);
    let s = await navState(page);
    expect(s.position).toBe('fixed');
    expect(s.scrolled).toBe(false);
    expect(s.bg).toBe('rgba(0, 0, 0, 0)');
    await scrollTo(page, Math.floor(H * 0.69)); expect((await navState(page)).scrolled, 'antes de 70% ainda transparente').toBe(false);
    await scrollTo(page, Math.ceil(H * 0.71)); s = await navState(page);
    expect(s.scrolled, 'depois de 70% vira vidro escuro').toBe(true);
    expect(s.bg).toBe('rgba(27, 25, 23, 0.94)');
    await scrollTo(page, 0); expect((await navState(page)).scrolled, 'voltando ao topo, transparente de novo').toBe(false);
  });

  test('o texto do hero esmaece ao rolar (some conforme o hero sai da tela)', async ({ page }) => {
    await page.goto('/'); await settle(page);
    const H = await heroHeight(page);
    const opacity = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.elementor-element-d4f0def > .e-con-inner')).opacity));
    expect(await opacity()).toBe(1);
    await scrollTo(page, Math.round(H * 0.25));            // p = 0.5 -> suavizado 0.5
    expect(await opacity()).toBeGreaterThan(0.44); expect(await opacity()).toBeLessThan(0.56);
    await scrollTo(page, Math.round(H * 0.6));
    expect(await opacity()).toBe(0);
    await scrollTo(page, 0); expect(await opacity()).toBe(1);
  });

  test('só o design system cuida da navbar: nenhum script próprio no Header', async ({ page }) => {
    await page.goto('/'); await page.waitForLoadState('load');
    const own = await page.evaluate(() => [...document.querySelectorAll('script:not([src])')].filter((s) => /np-nav-scrolled|np-nav-open|np-burger/.test(s.textContent)).length);
    expect(own).toBe(0);
  });

  test('os itens do menu levam às seções certas', async ({ page }) => {
    await page.goto('/'); await page.waitForLoadState('load');
    const links = await page.$$eval('.ds-nav .elementor-nav-menu--main a', (as) => as.map((a) => a.getAttribute('href') + '|' + a.textContent.trim()));
    expect(links).toEqual(['#|Início', '#tratamentos|Tratamentos', '#sobre-a-clinica|A Clínica', '#como-chegar|Como chegar']);
  });

  // napele-contact.js é "o único lugar do projeto" com WhatsApp, telefone e redes. Enquanto ele estiver vazio, o design
  // system mantém os ícones da navbar sem link (aria-disabled) e o pino sempre com a rota do Google Maps. O Astro
  // não pode ter número ou perfil escrito à mão no markup: o oráculo é a própria navbar do design system.
  test('os ícones da navbar se comportam como no design system (contatos só vêm do napele-contact.js)', async ({ page, context }) => {
    const icons = (p) => p.$$eval('.ds-nav a.np-icon', (as) => as.map((a) => ({ icon: a.getAttribute('data-np-icon') || 'pin', hasHref: a.hasAttribute('href') && !a.hasAttribute('aria-disabled'), disabled: a.getAttribute('aria-disabled') || null, maps: (a.getAttribute('href') || '').includes('google.com/maps') })));
    await page.goto('/'); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    const ds = await context.newPage();
    await ds.goto(pathToFileURL(resolve('design-sistem-napele/design-sistem-napele.html')).href + '#overview'); await ds.waitForTimeout(1500);
    expect(await icons(page)).toEqual(await icons(ds));
    const html = await page.content();
    expect(html, 'nenhum número de WhatsApp escrito à mão no HTML').not.toMatch(/wa\.me\/\d/);
  });
});

test.describe('navbar (celular)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('o hambúrguer abre o menu em tela cheia e fecha de novo', async ({ page }) => {
    await page.goto('/'); await settle(page);
    const burger = page.locator('.ds-nav .np-burger');
    await expect(burger).toBeVisible();
    await burger.click(); await page.waitForTimeout(300);
    expect((await navState(page)).open, 'um clique abre').toBe(true);
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await burger.click(); await page.waitForTimeout(300);
    expect((await navState(page)).open, 'outro clique fecha').toBe(false);
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
  });

  test('Esc fecha o menu e devolve o foco ao hambúrguer', async ({ page }) => {
    await page.goto('/'); await settle(page);
    const burger = page.locator('.ds-nav .np-burger');
    await burger.click(); await page.waitForTimeout(300);
    expect((await navState(page)).open).toBe(true);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    expect((await navState(page)).open).toBe(false);
    expect(await page.evaluate(() => document.activeElement.classList.contains('np-burger'))).toBe(true);
  });

  test('escolher um item fecha o menu e leva à seção', async ({ page }) => {
    await page.goto('/'); await settle(page);
    await page.locator('.ds-nav .np-burger').click(); await page.waitForTimeout(300);
    await page.locator('.ds-nav .elementor-nav-menu--main a', { hasText: 'Como chegar' }).click(); await page.waitForTimeout(600);
    expect((await navState(page)).open, 'o menu fecha ao escolher').toBe(false);
    expect(new URL(page.url()).hash).toBe('#como-chegar');
  });
});
