import { test, expect } from '@playwright/test';
import { loadTreatments } from '../../src/lib/treatments.mjs';
import { diffTreatment } from './harness.mjs';

// Sem movimento: as duas páginas ficam no estado estático, comparável.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

// Os 4 viewports só para dois tratamentos (o do print do usuário e o de título mais longo); os demais em desktop e celular.
const BOTH_WAYS = new Set(['preenchimento-com-acido-hialuronico', 'hidratacao-e-regeneracao-labial']);

for (const t of loadTreatments().list) {
  test(`paridade: ${t.slug} igual ao modelo do design system`, async ({ page }, testInfo) => {
    const edge = ['desktop', 'mobile'].includes(testInfo.project.name);
    test.skip(!edge && !BOTH_WAYS.has(t.slug), 'viewports intermediários só nos dois tratamentos de referência');
    const diffs = await diffTreatment(page, t.slug);
    expect(diffs, diffs.join('\n')).toEqual([]);
  });

  test(`${t.slug} não tem rolagem horizontal no celular`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'só no celular');
    await page.goto(`/tratamentos/${t.slug}/`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
    expect(m.scroll, `scrollWidth ${m.scroll} > ${m.inner}`).toBeLessThanOrEqual(m.inner);
  });
}
