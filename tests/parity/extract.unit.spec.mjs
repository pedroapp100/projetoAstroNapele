import { test, expect } from '@playwright/test';
import { transformMarkup, extractBlock } from '../../scripts/extract-overview.mjs';

test('remove noscript, hash do WP Rocket e o placeholder do lazy-load', () => {
  const html = `<div data-rocket-location-hash="abc123" class="x"><img width="9" src="data:image/svg+xml,%3Csvg%3E" class="a" alt="Logo" data-lazy-src="../../logo/LogoNapele.svg" /><noscript><img src="../../logo/LogoNapele.svg"></noscript></div>`;
  const out = transformMarkup(html);
  expect(out).not.toContain('noscript');
  expect(out).not.toContain('data-rocket-location-hash');
  expect(out).not.toContain('data:image');
  expect(out).toContain('src="/logo/LogoNapele.svg"');
});

test('reescreve caminhos relativos do Overview para /assets/ em atributos, srcset e style', () => {
  const html = `<img src="../hero/nayana-fialho.svg"><img srcset="../quesoueu/a-480.webp 480w, ../quesoueu/a-960.webp 960w" data-full="../results/01-lg.webp"><video poster="../clinica/passeio-poster.webp" data-src="../clinica/passeio.mp4"></video><a style="background-image:url('../treatments/fios.webp')"></a><link href="wp-content/uploads/x.css">`;
  const out = transformMarkup(html);
  expect(out).toContain('src="/assets/hero/nayana-fialho.svg"');
  expect(out).toContain('srcset="/assets/quesoueu/a-480.webp 480w, /assets/quesoueu/a-960.webp 960w"');
  expect(out).toContain('data-full="/assets/results/01-lg.webp"');
  expect(out).toContain('poster="/assets/clinica/passeio-poster.webp"');
  expect(out).toContain('data-src="/assets/clinica/passeio.mp4"');
  expect(out).toContain(`url('/assets/treatments/fios.webp')`);
  expect(out).toContain('href="/assets/overview/wp-content/uploads/x.css"');
});

test('links de tratamento levam à página do tratamento (/tratamentos/<slug>/)', () => {
  expect(transformMarkup('<a href="tratamento.html?t=fios-de-pdo">x</a>')).toContain('href="/tratamentos/fios-de-pdo/"');
});

test('preserva data-settings e data-e-type (o Elementor depende deles)', () => {
  const html = `<div data-id="a" data-element_type="container" data-e-type="container" data-settings="{&quot;sticky&quot;:&quot;top&quot;}"></div>`;
  const out = transformMarkup(html);
  expect(out).toContain('data-e-type="container"');
  expect(out).toContain('data-settings="{&quot;sticky&quot;:&quot;top&quot;}"');
});

test('extractBlock acha o elemento pelo marcador e fecha na tag certa, mesmo com a mesma tag aninhada', () => {
  const html = `<body><section class="a"><section class="inner"><p>1</p></section><p>2</p></section><section class="b">outro</section></body>`;
  expect(extractBlock(html, 'class="a"')).toBe('<section class="a"><section class="inner"><p>1</p></section><p>2</p></section>');
  expect(extractBlock(html, 'class="b"')).toBe('<section class="b">outro</section>');
});

test('extractBlock lança erro claro quando o marcador não existe', () => {
  expect(() => extractBlock('<div></div>', 'class="nada"')).toThrow(/não encontrado/);
});
