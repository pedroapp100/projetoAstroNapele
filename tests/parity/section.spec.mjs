import { test, expect } from '@playwright/test';
import { SECTIONS } from './sections.mjs';
import { diffSection } from './harness.mjs';

// Sem movimento: o pré-loader não roda e as seções ficam no estado estático, comparável entre as duas páginas.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const section of SECTIONS) {
  test(`paridade: ${section.id}`, async ({ page }) => {
    const diffs = await diffSection(page, section);
    expect(diffs, diffs.join('\n')).toEqual([]);
  });
}
