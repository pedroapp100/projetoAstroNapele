import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTreatments } from '../../src/lib/treatments.mjs';

test('lê os 13 tratamentos do design system, na ordem do carrossel', () => {
  const { list } = loadTreatments();
  expect(list).toHaveLength(13);
  expect(list[0].slug).toBe('toxina-botulinica');
});

test('todo tratamento tem intro, "Conheça o procedimento" e 4 cards completos', () => {
  for (const t of loadTreatments().list) {
    expect(t.intro, t.slug).toBeTruthy();
    expect(t.about.title, t.slug).toBeTruthy();
    expect(Array.isArray(t.about.text) && t.about.text.length > 0, `${t.slug}: about.text`).toBe(true);
    expect(t.forWhom, t.slug).toHaveLength(4);
    for (const card of t.forWhom) {
      expect(card.title, t.slug).toBeTruthy();
      expect(card.text, t.slug).toBeTruthy();
    }
  }
});

test('find devolve o tratamento pelo slug, ou null', () => {
  const { find } = loadTreatments();
  expect(find('preenchimento-com-acido-hialuronico').about.title).toBe('Volume e contorno com ácido hialurônico');
  expect(find('nao-existe')).toBeNull();
});

test('um tratamento sem "Conheça o procedimento" derruba o build em vez de publicar texto vazio', () => {
  const dir = mkdtempSync(join(tmpdir(), 'napele-'));
  const file = join(dir, 'treatments.js');
  writeFileSync(file, `window.NAPELE_TREATMENTS = { list: [{ slug: 'x', name: 'X', group: 'facial', photo: 'x.webp', intro: 'i' }], groups: { facial: 'F' }, defaultIntro: 'd' };`);
  expect(() => loadTreatments(file)).toThrow(/x: about/);
});
