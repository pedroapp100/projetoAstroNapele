// Confere se public/ é um espelho byte a byte do design system.
//   design-sistem-napele/assets -> public/assets
//   design-sistem-napele/logo   -> public/logo
// Sai com 1 se algum arquivo do DS faltar ou diferir em public/. Arquivos que existem
// só em public/ são avisos (exit 0): caem na limpeza da Tarefa 12.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const MIRRORS = [
  ['design-sistem-napele/assets', 'public/assets'],
  ['design-sistem-napele/logo', 'public/logo'],
];
const IGNORE = new Set(['desktop.ini', '.DS_Store', 'Thumbs.db']);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && !IGNORE.has(e.name))
    .map((e) => relative(dir, join(e.parentPath, e.name)).split(sep).join('/'));
}
const sha = (file) => createHash('sha1').update(readFileSync(file)).digest('hex');

export function checkDrift() {
  const differ = [];
  const missing = [];
  const extra = [];
  for (const [srcRel, dstRel] of MIRRORS) {
    const src = join(root, srcRel);
    const dst = join(root, dstRel);
    const srcFiles = new Set(walk(src));
    for (const f of srcFiles) {
      const d = join(dst, f);
      if (!existsSync(d)) missing.push(`${dstRel}/${f}`);
      else if (sha(join(src, f)) !== sha(d)) differ.push(`${dstRel}/${f}`);
    }
    for (const f of walk(dst)) if (!srcFiles.has(f)) extra.push(`${dstRel}/${f}`);
  }
  return { differ, missing, extra };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { differ, missing, extra } = checkDrift();
  const show = (title, list) => list.length && console.log(`${title} (${list.length}):\n${list.map((f) => '  ' + f).join('\n')}`);
  show('DIFEREM do design system', differ);
  show('FALTAM em public', missing);
  show('só no site (aviso)', extra);
  if (differ.length || missing.length) {
    console.log('\nFALHA: public/ não espelha o design system. Rode: npm run ds:sync');
    process.exit(1);
  }
  console.log('OK: public/ espelha o design system.');
}
