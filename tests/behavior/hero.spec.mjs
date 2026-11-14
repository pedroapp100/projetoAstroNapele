import { test, expect } from '@playwright/test';
import { openPair, same } from '../parity/harness.mjs';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const portrait = (page) => page.evaluate(() => {
  const img = document.querySelector('.elementor-element-d4f0def > img.np-person');
  if (!img) return null;
  const c = getComputedStyle(img);
  const geometry = {};
  for (const p of ['position', 'zIndex', 'right', 'left', 'bottom', 'width', 'height', 'maxWidth', 'objectFit', 'objectPosition', 'filter', 'maskImage']) geometry[p] = c[p];
  return { file: (img.currentSrc || img.src).split('/').pop(), hasSrcset: !!img.getAttribute('srcset'), sizes: img.getAttribute('sizes'), geometry };
});

test('o retrato do hero é o mesmo arquivo do Overview (srcset 900/1600 gerado do HeroNayana.png)', async ({ context }) => {
  const { astro, ref } = await openPair(context);
  const [a, r] = [await portrait(astro), await portrait(ref)];
  expect(r, 'o Overview deveria ter .np-person').not.toBeNull();
  expect(a, 'o Astro deveria ter .np-person').not.toBeNull();
  expect({ file: a.file, hasSrcset: a.hasSrcset, sizes: a.sizes }).toEqual({ file: r.file, hasSrcset: r.hasSrcset, sizes: r.sizes });
});

test('o retrato tem a mesma geometria, filtro e máscara do Overview', async ({ context }) => {
  const { astro, ref } = await openPair(context);
  const [a, r] = [await portrait(astro), await portrait(ref)];
  const diffs = Object.keys(r.geometry).filter((k) => !same(r.geometry[k], a.geometry[k])).map((k) => `${k}: ${r.geometry[k]} => ${a.geometry[k]}`);
  expect(diffs).toEqual([]);
});

test('a parede inclinada e o véu escuro são os do design system', async ({ context }) => {
  const { astro, ref } = await openPair(context);
  const veil = (page) => page.evaluate(() => {
    const host = document.querySelector('.elementor-element-d4f0def');
    const tiles = host.querySelectorAll(':scope > .np-tiles');
    const t = tiles[0];
    return { tiles: tiles.length, veilAttr: host.dataset.npVeil, layout: t && t.dataset.layout, after: t && getComputedStyle(t, '::after').backgroundImage, wall: t && getComputedStyle(t.querySelector('.np-tiles__wall')).transform.startsWith('matrix3d') };
  });
  expect(await veil(astro)).toEqual(await veil(ref));
});

test('o hero não carrega CSS próprio: só o napele.css do design system manda nele', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const own = await page.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const r of rules) if (r.selectorText && /\.np-hero\b|np-hero__inner/.test(r.selectorText)) out.push(r.selectorText);
    }
    return out;
  });
  expect(own).toEqual([]);
});

test('o hero começa no topo da página, com o mesmo tamanho do Overview', async ({ context }) => {
  const { astro, ref } = await openPair(context);
  const box = (page) => page.evaluate(() => { const r = document.querySelector('.elementor-element-d4f0def').getBoundingClientRect(); return { top: Math.round(r.top + scrollY), height: Math.round(r.height) }; });
  const [a, r] = [await box(astro), await box(ref)];
  expect(a.top).toBe(r.top);
  expect(Math.abs(a.height - r.height)).toBeLessThanOrEqual(1);
});
