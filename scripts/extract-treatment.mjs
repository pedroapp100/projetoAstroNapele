// Extrai a página-modelo de tratamento do design system (assets/overview/tratamento.html) e a converte em dois
// componentes Astro. O markup é cópia fiel do modelo; só o texto que muda de um tratamento para outro vira slot
// `{t.…}` (os mesmos pontos que o napele-treatment.js preenche no navegador), preenchido no build.
//
//   node scripts/extract-treatment.mjs <hero|sections|footer> [arquivo.astro]      (sem arquivo: imprime no terminal)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { extractBlock, transformMarkup } from './extract-overview.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = 'design-sistem-napele/assets/overview/tratamento.html';

// hero: o wrapper `div.elementor-11` que contém o hero; sections: o wrapper `div.elementor-825` (Conheça, Para quem é, Nayana)
// footer: o rodapé do modelo. Difere do da home (extract-overview.mjs): "Início" não é o item atual e os links de
// tratamento levam às páginas. Não tem texto por tratamento, então não tem slots.
const BLOCKS = { hero: 'data-elementor-id="11"', sections: 'data-elementor-id="825"', footer: 'data-elementor-type="footer"' };

const CARDS = ['11a5e25', '809394d', '2195691', 'a9914de'];
const TITLE = (tag, cls) => new RegExp(`<${tag} class="${cls}">[^<]*</${tag}>`);

// Troca, a partir do widget `data-id="<id>"`, a primeira ocorrência de `regex` por `replacement` (texto, ou função do
// resultado do regex); falha se não achar.
function replaceOnce(markup, id, regex, replacement, name) {
  const at = markup.indexOf(`data-id="${id}"`);
  const m = at < 0 ? null : regex.exec(markup.slice(at));
  if (!m) throw new Error(`slot não encontrado: ${name}`);
  const from = at + m.index;
  const novo = typeof replacement === 'function' ? replacement(m) : replacement;
  return markup.slice(0, from) + novo + markup.slice(from + m[0].length);
}

const SLOTS = {
  hero: (html) => {
    html = replaceOnce(html, '9c6552f', TITLE('h1', 'elementor-image-box-title'), '<h1 class="elementor-image-box-title">{t.name}</h1>', 'hero h1');
    return replaceOnce(html, '9c6552f', TITLE('p', 'elementor-image-box-description'), '<p class="elementor-image-box-description">{t.intro}</p>', 'hero p');
  },
  sections: (html) => {
    html = replaceOnce(html, '9a98fab', TITLE('h2', 'elementor-image-box-title'), '<h2 class="elementor-image-box-title">{t.about.title}</h2>', 'sobre h2');
    html = replaceOnce(html, '9a98fab', /<p class="elementor-image-box-description">[\s\S]*?<\/p>/,
      '<p class="elementor-image-box-description">{t.about.text.map((para, i) => <Fragment>{i > 0 && <><br /><br /></>}{para}</Fragment>)}</p>', 'sobre p');
    html = replaceOnce(html, 'af0503e', /<img [^>]*>/,
      '<img decoding="async" width="510" height="546" class="attachment-full size-full wp-image-856" alt={t.name} src={`/assets/treatments/${t.photo}`} />', 'sobre foto');
    html = replaceOnce(html, '10edd60', TITLE('h2', 'elementor-image-box-title'), '<h2 class="elementor-image-box-title">{t.name}: para quem é indicado</h2>', 'para quem é h2');
    CARDS.forEach((id, i) => {
      html = replaceOnce(html, id, /(<div class="elementor-icon-box-title">\s*<span[^>]*>)[^<]*(<\/span>)/, (m) => `${m[1]}{t.forWhom[${i}].title}${m[2]}`, `card ${i} título`);
      html = replaceOnce(html, id, /(<p class="elementor-icon-box-description">)[^<]*(<\/p>)/, (m) => `${m[1]}{t.forWhom[${i}].text}${m[2]}`, `card ${i} texto`);
    });
    return html;
  },
};

SLOTS.footer = (html) => html.replace(/href="index\.html(#[^"]*)?"/g, (_, hash) => `href="/${hash || ''}"`);

export function extractTreatmentToAstro(key) {
  if (!BLOCKS[key]) throw new Error(`bloco desconhecido: ${key}. Use: ${Object.keys(BLOCKS).join(', ')}`);
  const html = readFileSync(join(root, SOURCE), 'utf8');
  const markup = SLOTS[key](transformMarkup(extractBlock(html, BLOCKS[key])));
  const slots = key === 'footer' ? '' : ', com o texto do tratamento em slots {t.…}';
  const props = key === 'footer' ? '' : 'const { t } = Astro.props;\n';
  return `---\n// Cópia fiel do bloco "${key}" de ${SOURCE}${slots}.\n// Gerado por scripts/extract-treatment.mjs: se o design system mudar, rode\n//   node scripts/extract-treatment.mjs ${key} <este arquivo>\n${props}---\n${markup}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [key, file] = process.argv.slice(2);
  if (!key) { console.error('uso: node scripts/extract-treatment.mjs <hero|sections|footer> [arquivo.astro]'); process.exit(1); }
  const astro = extractTreatmentToAstro(key);
  if (file) { writeFileSync(join(root, file), astro); console.log(`${key} -> ${file} (${astro.length} bytes)`); }
  else process.stdout.write(astro);
}
