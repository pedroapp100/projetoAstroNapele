import { test, expect } from '@playwright/test';
import { settle } from '../parity/harness.mjs';

// COM movimento (sem reducedMotion): a home toca o pré-loader, que trava a rolagem e leva a página ao topo.
// De uma página de tratamento, os links do menu e do rodapé levam a /#tratamentos, /#sobre-a-clinica, /#como-chegar:
// depois do pré-loader, o visitante tem de estar na seção que pediu, não no topo da home.
test.describe('de uma página de tratamento de volta a uma seção da home', () => {
  // `belowNav`: só #tratamentos tem scroll-margin-top na home (Header.astro); as outras âncoras ficam rente ao topo da tela,
  // como já ficam quando o link é clicado na própria home.
  for (const [href, section, label, belowNav] of [
    ['/#tratamentos', '#tratamentos', 'Tratamentos', true],
    ['/#como-chegar', '#como-chegar', 'Como chegar', false],
  ]) {
    test(`${label}: depois do pré-loader a seção fica logo abaixo da navbar`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'o pré-loader leva ~10 s: só no desktop');
      test.setTimeout(80_000);
      await page.goto('/tratamentos/fios-de-pdo/');
      await settle(page);
      await page.click(`.ds-nav .elementor-nav-menu--main a[href="${href}"]`);
      await page.waitForURL((u) => u.pathname === '/' && u.hash === section);
      await page.waitForFunction(() => !document.documentElement.classList.contains('np-pre-on'), null, { timeout: 40_000 });
      await page.waitForTimeout(1500);
      const m = await page.evaluate((sel) => ({
        navBottom: document.querySelector('.ds-nav').getBoundingClientRect().bottom,
        top: document.querySelector(sel).getBoundingClientRect().top,
        y: window.scrollY,
      }), section);
      expect(m.y, 'não ficou no topo da home').toBeGreaterThan(300);
      expect(m.top, `seção em ${m.top}px, navbar termina em ${m.navBottom}px`).toBeGreaterThanOrEqual(belowNav ? m.navBottom - 1 : -2);
      expect(m.top, 'a seção está no topo da tela, não lá embaixo').toBeLessThan(m.navBottom + 120);
    });
  }
});
