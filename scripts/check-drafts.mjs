// Texto provisório não vai ao ar: falha se algum .html do site gerado ainda tiver o atributo `data-np-draft`.
// A seção "Protocolo Full Face Fialho" nasce marcada assim (só a Nayana pode descrever o método). Quando o texto
// definitivo entrar, tire o atributo da seção em design-sistem-napele/assets/overview/index.html e rode `npm run ds:sync`.
//
//   npm run build && npm run check:drafts        (sai com 1 e lista os arquivos enquanto houver rascunho)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DRAFT = /[\s"']data-np-draft(?=[\s=>/])/;

/** @param {string} dir @returns {string[]} caminhos dos .html que têm `data-np-draft` */
export function findDrafts(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...findDrafts(path));
    else if (name.endsWith('.html') && DRAFT.test(readFileSync(path, 'utf8'))) found.push(path);
  }
  return found;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = process.argv[2] || 'dist';
  if (!existsSync(dir)) { console.error(`${dir}/ não existe: rode "npm run build" antes.`); process.exit(2); }
  const drafts = findDrafts(dir);
  if (drafts.length) {
    console.error(`Texto provisório (data-np-draft) no site gerado, não publique:\n  ${drafts.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Nenhum texto provisório no site gerado.');
}
