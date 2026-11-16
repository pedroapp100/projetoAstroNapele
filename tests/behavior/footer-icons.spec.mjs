import { test, expect } from '@playwright/test';

// Rodapé com os mesmos três ícones do topo: Instagram, WhatsApp, Localização; sem TikTok nem YouTube
// (docs/superpowers/specs/2026-11-16-rodape-icones-design.md).
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const RODAPE = 'footer[data-elementor-type="footer"]';
// No desktop o sticky do Elementor clona a barra de baixo do rodapé para guardar o espaço dela (`.elementor-sticky__spacer`, com visibility:hidden):
// os ícones reais são os que ficam fora desse clone.
const ICONES = `${RODAPE} a.np-icon:not(.elementor-sticky__spacer *)`;
const ROTULOS =['Instagram da Napele Clínica', 'WhatsApp da Napele Clínica', 'Como chegar à Napele Clínica'];

for (const [nome, url] of [['home', '/'], ['página de tratamento', '/tratamentos/toxina-botulinica/']]) {
  test.describe(nome, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('load');
    });

    test('o rodapé tem 3 ícones visíveis, na ordem Instagram, WhatsApp, Localização', async ({ page }) => {
      const icones = page.locator(ICONES);
      await expect(icones).toHaveCount(3);
      expect(await icones.evaluateAll((as) => as.map((a) => a.getAttribute('aria-label')))).toEqual(ROTULOS);
      for (let i = 0; i < 3; i++) {
        await expect(icones.nth(i)).toBeVisible();
        const caixa = await icones.nth(i).boundingBox();
        expect(caixa.width, `largura do ícone ${i}`).toBeGreaterThanOrEqual(16);
        expect(caixa.height, `altura do ícone ${i}`).toBeGreaterThanOrEqual(16);
      }
      // o desenho vem inteiro no próprio SVG: os HTMLs do design system não têm o sprite #np-i-*
      expect(await icones.evaluateAll((as) => as.map((a) => a.querySelectorAll('svg *').length > 0 && !a.querySelector('use')))).toEqual([true, true, true]);
    });

    test('não sobra TikTok, YouTube nem o bloco social antigo no rodapé', async ({ page }) => {
      expect(await page.locator(`${RODAPE} [data-np-contact="tiktok"], ${RODAPE} [data-np-contact="youtube"], ${RODAPE} [data-np-contact="instagram"], ${RODAPE} .elementor-social-icon`).count()).toBe(0);
    });

    test('WhatsApp abre a conversa e Localização abre a rota; o Instagram nunca aponta para "#"', async ({ page }) => {
      const [insta, zap, mapa] = await page.locator(ICONES).all();
      expect(await zap.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
      expect(await zap.getAttribute('target')).toBe('_blank');
      expect(await mapa.getAttribute('href')).toContain('google.com/maps/dir');
      expect(await mapa.getAttribute('target')).toBe('_blank');
      // sem endereço de perfil cadastrado (napele-contact.js) o ícone fica sem link, como no topo; com endereço, é um https
      const href = await insta.getAttribute('href');
      if (href === null) expect(await insta.getAttribute('aria-disabled')).toBe('true');
      else expect(href).toMatch(/^https:\/\//);
    });

    test('a cor é a dos ícones do topo (creme), não a dos botões dourados antigos', async ({ page }) => {
      const cor = await page.locator(ICONES).first().evaluate((a) => getComputedStyle(a).color);
      expect(cor).toBe('rgba(245, 240, 234, 0.9)');
    });

    test('a página não ganha rolagem horizontal', async ({ page }) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  });
}
