import { test, expect } from '@playwright/test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findDrafts } from '../../scripts/check-drafts.mjs';

// Texto provisório (data-np-draft) não pode ir ao ar: `npm run check:drafts` falha enquanto ele existir no dist/.
test('acha os .html com data-np-draft, em subpastas, e só eles', () => {
  const dir = mkdtempSync(join(tmpdir(), 'napele-dist-'));
  mkdirSync(join(dir, 'a', 'b'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), '<section id="x" data-np-draft>rascunho</section>');
  writeFileSync(join(dir, 'a', 'b', 'index.html'), '<p>limpo</p>');
  writeFileSync(join(dir, 'a', 'draft.html'), '<div class="y" data-np-draft="">outro</div>');
  writeFileSync(join(dir, 'a', 'notes.txt'), 'data-np-draft'); // só .html conta
  const found = findDrafts(dir).map((p) => p.replace(dir, '').replaceAll('\\', '/')).sort();
  expect(found).toEqual(['/a/draft.html', '/index.html']);
});

test('pasta sem rascunhos devolve lista vazia', () => {
  const dir = mkdtempSync(join(tmpdir(), 'napele-dist-'));
  writeFileSync(join(dir, 'index.html'), '<p>ok</p>');
  expect(findDrafts(dir)).toEqual([]);
});
