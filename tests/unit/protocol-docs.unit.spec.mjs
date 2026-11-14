import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// A aba Sistema do design system documenta a seção nova: arco narrativo, seções da home e tamanho das seções.
const html = readFileSync(new URL('../../design-sistem-napele/design-sistem-napele.html', import.meta.url), 'utf8');

test('arco narrativo: o ato 1 (Promessa) inclui o protocolo Full Face Fialho', () => {
  expect(html).toMatch(/<b>1 · Promessa<\/b><span>[^<]*protocolo Full Face Fialho/);
  expect(html).toContain('Existe um método?');
});

test('seções da home: ficha do protocolo, com a ressalva do texto provisório', () => {
  const at = html.indexOf('<span class="dsc-spec-name">Protocolo Full Face Fialho · seção</span>');
  expect(at, 'ficha "Protocolo Full Face Fialho · seção"').toBeGreaterThan(0);
  const spec = html.slice(at, html.indexOf('</figure>', at));
  for (const piece of ['np-protocol', 'data-np-draft', 'provisório', 'assets/fullface', ':is', 'consentimento']) expect(spec, piece).toContain(piece);
  // fica ao lado da ficha da doutora, antes das dúvidas frequentes
  expect(at).toBeGreaterThan(html.indexOf('Card da doutora + chips flutuantes'));
  expect(at).toBeLessThan(html.indexOf('<span class="dsc-spec-name">Dúvidas frequentes</span>'));
});

test('tamanho das seções: linha do protocolo entre Marquee e Tratamentos', () => {
  const marquee = html.indexOf('<div class="dsc-sz-name">Marquee');
  const protocol = html.indexOf('<div class="dsc-sz-name">Protocolo Full Face Fialho');
  const treatments = html.indexOf('<div class="dsc-sz-name">Tratamentos', marquee); // a tabela de movimento, antes, também tem uma linha "Tratamentos"
  expect(marquee).toBeGreaterThan(0);
  expect(protocol, 'linha do protocolo').toBeGreaterThan(marquee);
  expect(protocol).toBeLessThan(treatments);
});
