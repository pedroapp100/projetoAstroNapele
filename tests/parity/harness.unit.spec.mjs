import { test, expect } from '@playwright/test';
import { compareEntries } from './harness.mjs';

const entry = (path, s = {}, pseudo = {}) => ({ path, desc: '<div.x>', s: { width: '100px', color: 'rgb(0, 0, 0)', transform: 'none', ...s }, pseudo });

test('entradas idênticas não geram diferenças', () => {
  expect(compareEntries([entry('', {}), entry('/0')], [entry(''), entry('/0')])).toEqual([]);
});

test('tolera 1px nas medidas, mas não 2px', () => {
  expect(compareEntries([entry('', { width: '100px' })], [entry('', { width: '100.8px' })])).toEqual([]);
  const d = compareEntries([entry('', { width: '100px' })], [entry('', { width: '102px' })]);
  expect(d).toHaveLength(1);
  expect(d[0]).toContain('width: 100px => 102px');
});

test('acusa propriedade diferente e respeita a lista de ignoradas', () => {
  const a = [entry('', { transform: 'none' })];
  const b = [entry('', { transform: 'matrix(1, 0, 0, 1, 0, -10)' })];
  expect(compareEntries(a, b)).toHaveLength(1);
  expect(compareEntries(a, b, { ignore: ['transform'] })).toEqual([]);
});

test('acusa elemento que só existe de um lado', () => {
  const d = compareEntries([entry(''), entry('/0')], [entry('')]);
  expect(d).toEqual(['/0 <div.x> só no original']);
  expect(compareEntries([entry('')], [entry(''), entry('/1')])).toEqual(['/1 <div.x> só no Astro']);
});

test('compara pseudo-elementos (grão ::after)', () => {
  const grain = { content: '""', backgroundImage: 'url(noise-white.png)', opacity: '1' };
  const d = compareEntries([entry('', {}, { '::after': grain })], [entry('')]);
  expect(d[0]).toContain('::after: só no original');
  const e = compareEntries([entry('', {}, { '::after': grain })], [entry('', {}, { '::after': { ...grain, opacity: '0.4' } })]);
  expect(e[0]).toContain('::after opacity: 1 => 0.4');
});
