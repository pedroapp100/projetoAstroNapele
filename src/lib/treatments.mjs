// Os tratamentos do site: uma única fonte, o `treatments.js` do design system (public/assets/treatments.js).
// Esse arquivo é um script de navegador (define window.NAPELE_TREATMENTS); aqui ele roda num sandbox do Node,
// no build, para o texto das páginas nunca ser copiado à mão.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const DEFAULT_FILE = join(process.cwd(), 'public/assets/treatments.js');

/**
 * @typedef {{ title: string, text: string }} Card
 * @typedef {{ slug: string, name: string, group: string, groupLabel: string, photo: string, intro: string,
 *             about: { title: string, text: string[] }, forWhom: Card[] }} Treatment
 */

/** @param {any} t @returns {Treatment} */
function normalize(t, defaultIntro) {
  const fail = (field) => { throw new Error(`tratamento ${t.slug}: ${field} ausente`); };
  if (!t.about || !t.about.title) fail('about.title');
  const text = [].concat(t.about.text || []).filter(Boolean);
  if (!text.length) fail('about.text');
  if (!Array.isArray(t.forWhom) || t.forWhom.length < 4) fail('forWhom (4 cards)');
  const forWhom = t.forWhom.slice(0, 4).map((c) => (typeof c === 'string' ? { title: '', text: c } : { title: c.title || '', text: c.text || '' }));
  return { ...t, intro: t.intro || defaultIntro, about: { title: t.about.title, text }, forWhom };
}

/** @param {string} [file] @returns {{ list: Treatment[], find: (slug: string) => Treatment | null }} */
export function loadTreatments(file = DEFAULT_FILE) {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(file, 'utf8'), sandbox, { filename: file });
  const data = sandbox.window.NAPELE_TREATMENTS;
  if (!data || !Array.isArray(data.list)) throw new Error(`${file}: window.NAPELE_TREATMENTS.list não encontrado`);
  const list = data.list.map((t) => normalize(t, data.defaultIntro));
  return { list, find: (slug) => list.find((t) => t.slug === slug) || null };
}
