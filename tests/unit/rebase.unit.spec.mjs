import { test, expect } from '@playwright/test';
import { rebaseAnchors } from '../../src/lib/rebase.mjs';

test('href="#" vira a home e href="#x" vira /#x, em qualquer posição do atributo', () => {
  expect(rebaseAnchors('<a href="#">Início</a>')).toBe('<a href="/">Início</a>');
  expect(rebaseAnchors('<a class="x" href="#tratamentos" data-y="1">T</a>')).toBe('<a class="x" href="/#tratamentos" data-y="1">T</a>');
  expect(rebaseAnchors('<a\n  href="#como-chegar"\n  class="x">C</a>')).toBe('<a\n  href="/#como-chegar"\n  class="x">C</a>');
});

test('não mexe no sprite de ícones nem em links que já têm destino', () => {
  const keep = '<svg><use href="#np-i-pin"></use></svg><a href="https://example.com/#a">x</a><a href="/tratamentos/fios-de-pdo/">y</a><a href="tel:+55">z</a>';
  expect(rebaseAnchors(keep)).toBe(keep);
});

test('aceita outra base', () => {
  expect(rebaseAnchors('<a href="#faq">f</a>', '/pt/')).toBe('<a href="/pt/#faq">f</a>');
});
