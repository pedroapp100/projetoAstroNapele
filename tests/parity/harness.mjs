// Harness de paridade: compara o Overview original (/assets/overview/index.html, servido pelo próprio Astro)
// com a página Astro (/), seção por seção, pelos estilos computados.
//
// Pareamento por CAMINHO ESTRUTURAL (índice entre irmãos), nunca por classe: o hero do Astro tinha classes
// extras e o pareamento por classe gera ruído. `img.np-person`, `script`, `style`, `link` e `noscript` ficam
// de fora (o original traz fallbacks `noscript` que não existem no Astro).

export const PROPS = [
  'display', 'position', 'width', 'height', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'fontSize', 'fontFamily', 'fontWeight',
  'lineHeight', 'letterSpacing', 'color', 'backgroundColor', 'backgroundImage', 'backgroundClip',
  'borderRadius', 'opacity', 'transform', 'filter', 'boxShadow', 'textShadow', 'zIndex', 'overflow',
  'textAlign', 'flexDirection', 'gap', 'gridTemplateColumns', 'animationName', 'top', 'left', 'objectFit',
  'mixBlendMode', 'maskImage', 'backdropFilter', 'visibility',
];
export const PSEUDO_PROPS = [
  'content', 'backgroundImage', 'backgroundSize', 'backgroundRepeat', 'opacity', 'mixBlendMode', 'position',
  'width', 'height',
];

export const REF_URL = '/assets/overview/index.html';
export const ASTRO_URL = '/';

// Roda DENTRO da página (é serializada pelo Playwright: não pode usar nada de fora dela).
export function collectInPage({ rootSelector, index, topSelector, props, pseudoProps }) {
  const skip = (c) => c.matches('img.np-person, script, style, link, noscript');
  const kids = (el) => [...el.children].filter((c) => !skip(c));
  const root = document.querySelector(rootSelector);
  // `topSelector` pega o bloco direto (rodapé, header); senão vale o índice entre os filhos do container da home
  const top = topSelector ? document.querySelector(topSelector) : root ? kids(root)[index] : null;
  const out = [];
  const walk = (el, path) => {
    const cs = getComputedStyle(el);
    const s = {};
    for (const p of props) s[p] = cs[p];
    const pseudo = {};
    for (const ps of ['::before', '::after']) {
      const pcs = getComputedStyle(el, ps);
      if (pcs.content !== 'none' && pcs.content !== 'normal') {
        const o = {};
        for (const p of pseudoProps) o[p] = pcs[p];
        pseudo[ps] = o;
      }
    }
    const tag = el.tagName.toLowerCase();
    const cls = String(el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(-2).join('.');
    out.push({ path, desc: `<${tag}${cls ? '.' + cls : ''}>`, s, pseudo });
    if (tag === 'svg') return; // não desce nos internos do SVG
    kids(el).forEach((c, i) => walk(c, `${path}/${i}`));
  };
  if (top) walk(top, '');
  return out;
}

// `warm`: rola a página inteira e volta ao topo. O original usa o lazy-load do WP Rocket (imagens só trocam o
// placeholder ao entrarem na tela); aquecer as duas páginas compara o estado já carregado, como o visitante vê.
async function warmUp(page) {
  await page.evaluate(async () => {
    // 150ms por passo: o reveal (IntersectionObserver) precisa de uns quadros para disparar em cada seção. Com 60ms ele às vezes perdia o
    // card da visita numa das duas páginas, e o margin calculado dele (que muda quando o reveal dispara) diferia sem diferença visual.
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
}

export async function settle(page, { warm = false } = {}) {
  await page.waitForLoadState('load');
  // pré-loader (se houver) termina antes de medir
  await page.waitForFunction(() => !document.documentElement.classList.contains('np-pre-on'), null, { timeout: 20_000 }).catch(() => {});
  // O WP Rocket do original só libera o Elementor depois da 1ª interação do visitante: simulamos uma nos dois.
  await page.mouse.move(40, 40);
  await page.waitForFunction(
    () => window.elementorFrontend && (!document.querySelector('.e-n-carousel') || document.querySelector('.e-n-carousel.swiper-initialized')),
    null,
    { timeout: 15_000 },
  ).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500); // scripts do DS medem e montam (tiles, procedures, clinic)
  if (warm) await warmUp(page);
}

const PX = /^-?\d+(\.\d+)?px$/;
export const same = (a, b) => a === b || (PX.test(a) && PX.test(b) && Math.abs(parseFloat(a) - parseFloat(b)) <= 1);

// Abre o site e o Overview original lado a lado (mesmo contexto = mesmo viewport) já assentados.
export async function openPair(context, { astroUrl = ASTRO_URL, refUrl = REF_URL } = {}) {
  const astro = await context.newPage();
  const ref = await context.newPage();
  await Promise.all([astro.goto(astroUrl), ref.goto(refUrl)]);
  await Promise.all([settle(astro), settle(ref)]);
  return { astro, ref };
}

export function compareEntries(ref, astro, { ignore = [] } = {}) {
  const skip = new Set(ignore);
  const byPath = new Map(astro.map((e) => [e.path, e]));
  const seen = new Set();
  const lines = [];
  for (const r of ref) {
    const a = byPath.get(r.path);
    if (!a) { lines.push(`${r.path || '/'} ${r.desc} só no original`); continue; }
    seen.add(r.path);
    const d = [];
    for (const p of Object.keys(r.s)) if (!skip.has(p) && !same(r.s[p], a.s[p])) d.push(`${p}: ${String(r.s[p]).slice(0, 60)} => ${String(a.s[p]).slice(0, 60)}`);
    for (const ps of new Set([...Object.keys(r.pseudo), ...Object.keys(a.pseudo)])) {
      const rp = r.pseudo[ps], ap = a.pseudo[ps];
      if (!rp || !ap) { d.push(`${ps}: ${rp ? 'só no original' : 'só no Astro'}`); continue; }
      for (const p of Object.keys(rp)) if (!skip.has(p) && !same(rp[p], ap[p])) d.push(`${ps} ${p}: ${String(rp[p]).slice(0, 60)} => ${String(ap[p]).slice(0, 60)}`);
    }
    if (d.length) lines.push(`${r.path || '/'} ${r.desc} ${d.join(' ; ')}`);
  }
  for (const a of astro) if (!seen.has(a.path)) lines.push(`${a.path || '/'} ${a.desc} só no Astro`);
  return lines;
}

// [] = paridade. Cada linha: "<caminho> <tag.classe> prop: valorOriginal => valorAstro"
export async function diffSection(page, section, viewport) {
  const ctx = page.context();
  const ref = await ctx.newPage();
  try {
    if (viewport) { await page.setViewportSize(viewport); await ref.setViewportSize(viewport); }
    await Promise.all([page.goto(ASTRO_URL), ref.goto(REF_URL)]);
    await Promise.all([settle(page, { warm: true }), settle(ref, { warm: true })]);
    const arg =(rootSelector) => ({ rootSelector, index: section.index, topSelector: section.selector, props: PROPS, pseudoProps: PSEUDO_PROPS });
    const [astroEntries, refEntries] = await Promise.all([
      page.evaluate(collectInPage, arg('main.elementor-11')),
      ref.evaluate(collectInPage, arg('div.elementor-11')),
    ]);
    if (!refEntries.length) return [`seção ${section.id}: não encontrada no original`];
    if (!astroEntries.length) return [`seção ${section.id}: não encontrada no Astro`];
    return compareEntries(refEntries, astroEntries, { ignore: section.ignore });
  } finally {
    await ref.close();
  }
}

// ---- Páginas de tratamento: /tratamentos/<slug>/ (Astro) × /assets/overview/tratamento.html?t=<slug> (design system)

export const TREATMENT_BLOCKS = [
  { id: 'hero', selector: 'div.elementor-11' },
  { id: 'sections', selector: 'div.elementor-825' },
  { id: 'footer', selector: 'footer[data-elementor-type="footer"]' },
];

// [] = paridade. Cada linha: "<bloco>: <caminho> <tag.classe> prop: valorOriginal => valorAstro"
// `transform` e `opacity` ficam de fora: o fade do hero por rolagem e a deriva da parede de rostos mexem nelas.
export async function diffTreatment(page, slug, viewport) {
  const ctx = page.context();
  const ref = await ctx.newPage();
  try {
    if (viewport) { await page.setViewportSize(viewport); await ref.setViewportSize(viewport); }
    await Promise.all([page.goto(`/tratamentos/${slug}/`), ref.goto(`/assets/overview/tratamento.html?t=${slug}`)]);
    await Promise.all([settle(page, { warm: true }), settle(ref, { warm: true })]);
    const lines = [];
    for (const block of TREATMENT_BLOCKS) {
      const arg = { rootSelector: 'body', index: 0, topSelector: block.selector, props: PROPS, pseudoProps: PSEUDO_PROPS };
      const [a, r] = await Promise.all([page.evaluate(collectInPage, arg), ref.evaluate(collectInPage, arg)]);
      if (!r.length) { lines.push(`${block.id}: não encontrado no modelo`); continue; }
      if (!a.length) { lines.push(`${block.id}: não encontrado no Astro`); continue; }
      for (const l of compareEntries(r, a, { ignore: ['transform', 'opacity'] })) lines.push(`${block.id}: ${l}`);
    }
    return lines;
  } finally {
    await ref.close();
  }
}
