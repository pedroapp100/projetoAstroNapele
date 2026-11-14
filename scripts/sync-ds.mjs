// Copia do design system para public/ só o que falta ou difere. Não apaga nada.
//   design-sistem-napele/assets -> public/assets
//   design-sistem-napele/logo   -> public/logo
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDrift } from './check-ds-drift.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const FROM = { 'public/assets/': 'design-sistem-napele/assets/', 'public/logo/': 'design-sistem-napele/logo/' };

const { differ, missing } = checkDrift();
const todo = [...differ, ...missing];
for (const dst of todo) {
  const prefix = Object.keys(FROM).find((p) => dst.startsWith(p));
  const src = join(root, FROM[prefix] + dst.slice(prefix.length));
  const out = join(root, dst);
  mkdirSync(dirname(out), { recursive: true });
  cpSync(src, out);
  console.log('copiado:', dst);
}
console.log(todo.length ? `${todo.length} arquivo(s) sincronizado(s).` : 'Nada a sincronizar.');
