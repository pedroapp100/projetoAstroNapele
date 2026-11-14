// Extrai um bloco do Overview do design system (design-sistem-napele/assets/overview/index.html) e o
// converte em markup de componente Astro: cópia fiel, só os caminhos e o lazy-load do WP Rocket mudam.
//
//   node scripts/extract-overview.mjs <bloco> [arquivo.astro]      (sem arquivo: imprime no terminal)
//   blocos: hero, header, marquee, protocolo, tratamentos, clinica, galeria, resultados, doutora, faq, visita, cta, footer, footer-bg
//
// Mantém `data-settings` e `data-e-type`: o Elementor lê esses atributos para configurar carrossel, sticky etc.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = 'design-sistem-napele/assets/overview/index.html';

// Marcador único dentro da tag de abertura de cada bloco (o elemento começa no `<` anterior ao marcador).
export const BLOCKS = {
  header: 'data-elementor-type="header"',
  hero: 'elementor-element-d4f0def e-flex',
  marquee: 'class="np-marquee"',
  protocolo: 'class="np-doctor np-protocol"', // a seção "Protocolo Full Face Fialho" (a da doutora é `class="np-doctor"`, com aspas)
  tratamentos: 'elementor-element-7c94319 e-flex',
  clinica: 'class="np-clinic',
  galeria: 'class="np-gallery"',
  resultados: 'class="np-results',
  doutora: 'class="np-doctor"',
  faq: 'class="np-faq',
  visita: 'class="np-visit"',
  cta: 'class="np-cta"',
  footer: 'data-elementor-type="footer"',
  'footer-bg': 'elementor-element-fa83a6e',
};

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

// Devolve o elemento (com tudo dentro) cuja tag de abertura contém `marker`.
export function extractBlock(html, marker) {
  const at = html.indexOf(marker);
  if (at < 0) throw new Error(`marcador não encontrado: ${marker}`);
  const start = html.lastIndexOf('<', at);
  const name = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(start))[1].toLowerCase();
  const tag = new RegExp(`<(/?)${name}(?=[\\s>/])[^>]*>`, 'gi');
  tag.lastIndex = start;
  let depth = 0;
  for (let m; (m = tag.exec(html)); ) {
    if (m[1] === '/') depth--;
    else if (!VOID.has(name) && !m[0].endsWith('/>')) depth++;
    if (depth === 0) return html.slice(start, tag.lastIndex);
  }
  throw new Error(`tag <${name}> sem fechamento para o marcador ${marker}`);
}

function rewriteUrl(u) {
  if (u.startsWith('../../')) return '/' + u.slice(6);
  if (u.startsWith('../')) return '/assets/' + u.slice(3);
  if (/^(wp-content|wp-includes)\//.test(u)) return '/assets/overview/' + u;
  return u;
}

export function transformMarkup(html) {
  let out = html
    .replace(/<noscript>[\s\S]*?<\/noscript>/g, '') // fallbacks do WP Rocket
    .replace(/\sdata-rocket-location-hash="[^"]*"/g, '')
    .replace(/\ssrc="data:image\/[^"]*"/g, '') // placeholder do lazy-load
    .replace(/\sdata-lazy-src=/g, ' src=')
    .replace(/\sdata-lazy-srcset=/g, ' srcset=')
    .replace(/\sdata-lazy-sizes=/g, ' sizes=')
    .replace(/tratamento\.html\?t=([a-z0-9-]+)/g, '/tratamentos/$1/'); // páginas geradas por scripts/extract-treatment.mjs

  out = out.replace(/(\s(?:src|href|poster|data-src|data-full)=")([^"]*)(")/g, (_, a, u, c) => a + rewriteUrl(u) + c);
  out = out.replace(/(\ssrcset=")([^"]*)(")/g, (_, a, list, c) => a + list.split(',').map((item) => {
    const [u, ...rest] = item.trim().split(/\s+/);
    return [rewriteUrl(u), ...rest].join(' ');
  }).join(', ') + c);
  out = out.replace(/(\sstyle=")([^"]*)(")/g, (_, a, css, c) => a + css.replace(/url\((['"]?)([^)'"]*)\1\)/g, (_m, q, u) => `url(${q}${rewriteUrl(u)}${q})`) + c);

  // chaves em texto viram expressões no Astro: escapa
  out = out.replace(/>([^<]*[{}][^<]*)</g, (_, text) => '>' + text.replace(/{/g, '&#123;').replace(/}/g, '&#125;') + '<');
  return out;
}

export function extractToAstro(key) {
  if (!BLOCKS[key]) throw new Error(`bloco desconhecido: ${key}. Use: ${Object.keys(BLOCKS).join(', ')}`);
  const html = readFileSync(join(root, SOURCE), 'utf8');
  const markup = transformMarkup(extractBlock(html, BLOCKS[key]));
  return `---\n// Cópia fiel do bloco "${key}" de ${SOURCE}.\n// Gerado por scripts/extract-overview.mjs: se o design system mudar, rode\n//   node scripts/extract-overview.mjs ${key} <este arquivo>\n---\n${markup}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [key, file] = process.argv.slice(2);
  if (!key) { console.error('uso: node scripts/extract-overview.mjs <bloco> [arquivo.astro]'); process.exit(1); }
  const astro = extractToAstro(key);
  if (file) { writeFileSync(join(root, file), astro); console.log(`${key} -> ${file} (${astro.length} bytes)`); }
  else process.stdout.write(astro);
}
