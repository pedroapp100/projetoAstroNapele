import { test, expect } from '@playwright/test';
import { openPair } from '../parity/harness.mjs';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

// Sistema → Textura e grão: `.bg { background: transparent url(noise-01.webp) repeat center center; opacity: .4;
// position: fixed; z-index: 100; inset: -50%; width: 150%; height: 200vh; pointer-events: none }`
// O elemento vem do widget HTML do rodapé e cobre a página toda (inclusive o hero).
const grain = (page) => page.evaluate(() => {
  const all = document.querySelectorAll('.bg');
  if (!all.length) return { count: 0 };
  const c = getComputedStyle(all[0]);
  return {
    count: all.length, position: c.position, zIndex: c.zIndex, opacity: c.opacity, pointerEvents: c.pointerEvents,
    repeat: c.backgroundRepeat, image: c.backgroundImage.replace(/^url\(["']?.*\/([^/"')]+)["']?\)$/, 'url($1)'),
    width: c.width, height: c.height, parentIsInFooter: !!all[0].closest('footer'),
  };
});

test('existe um único grão global (.bg), com os valores do design system', async ({ context }) => {
  const { astro, ref } = await openPair(context);
  const [a, r] = [await grain(astro), await grain(ref)];
  expect(r.count).toBe(1);
  expect(r).toMatchObject({ position: 'fixed', zIndex: '100', opacity: '0.4', pointerEvents: 'none', repeat: 'repeat', image: 'url(noise-01.webp)' });
  expect(a).toEqual(r);
});
