import { test, expect } from '@playwright/test';
import { extractTreatmentToAstro } from '../../scripts/extract-treatment.mjs';

const LOREM = ['Velit esse', 'Excepteur sint', 'Quis nostrud', 'Aliquip ex', 'Minim veniam', 'Referência em estética facial e corporal em Anápolis'];

test('hero: título e parágrafo viram {t.name} e {t.intro}', () => {
  const out = extractTreatmentToAstro('hero');
  expect(out).toContain('const { t } = Astro.props;');
  expect(out).toContain('<h1 class="elementor-image-box-title">{t.name}</h1>');
  expect(out).toContain('{t.intro}');
  expect(out).toContain('elementor-11'); // o wrapper que o napele.css usa para o hero
  for (const l of LOREM) expect(out, l).not.toContain(l);
});

test('seções: sobre, foto e os 4 cards viram slots, sem lorem e sem a foto de exemplo', () => {
  const out = extractTreatmentToAstro('sections');
  expect(out).toContain('{t.about.title}');
  expect(out).toContain('{t.name}: para quem é indicado');
  for (let i = 0; i < 4; i++) {
    expect(out).toMatch(new RegExp(String.raw`<span[^>]*>\{t\.forWhom\[${i}\]\.title\}</span>`));
    expect(out).toMatch(new RegExp(String.raw`<p class="elementor-icon-box-description">\{t\.forWhom\[${i}\]\.text\}</p>`));
  }
  expect(out, 'sobrou referência de grupo ($1/$2) do replace').not.toMatch(/\$\d/);
  expect(out).toContain('alt={t.name}');
  expect(out).toContain('/assets/treatments/${t.photo}');
  expect(out).toContain('elementor-825');
  for (const l of [...LOREM, 'sala-de-rpp']) expect(out, l).not.toContain(l);
  const photo = out.match(/<img[^>]*alt=\{t\.name\}[^>]*>/)[0];
  expect(photo).not.toMatch(/srcset|sizes=|data-lazy/);
});

test('a saída é cópia limpa do modelo: sem noscript, sem hash do WP Rocket, sem placeholder de lazy-load', () => {
  for (const key of ['hero', 'sections']) {
    const out = extractTreatmentToAstro(key);
    expect(out).not.toContain('noscript');
    expect(out).not.toContain('data-rocket-location-hash');
    expect(out).not.toContain('data:image');
  }
});

test('o botão e os links do modelo continuam (Agendar Avaliação com data-np-contact)', () => {
  const out = extractTreatmentToAstro('sections');
  expect(out).toContain('data-np-contact="whatsapp"');
  expect(out).toContain('Agendar Avaliação');
});

test('rodapé do modelo: links levam ao site e "Início" não é o item atual (ao contrário do rodapé da home)', () => {
  const out = extractTreatmentToAstro('footer');
  expect(out).not.toContain('index.html');
  expect(out).not.toContain('tratamento.html?');
  expect(out).toContain('href="/"');
  expect(out).toContain('href="/#tratamentos"');
  expect(out).toContain('href="/#sobre-a-clinica"');
  expect(out).toContain('href="/tratamentos/toxina-botulinica/"');
  expect(out).not.toContain('elementor-item-active');
  expect(out).not.toContain('const { t }'); // o rodapé não tem slots
});
