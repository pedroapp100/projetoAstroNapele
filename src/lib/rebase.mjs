// Âncoras `#x` só funcionam na página que tem o `#x`. Numa página de tratamento elas têm de levar à home:
// `<a href="#">` vira `<a href="/">` e `<a href="#tratamentos">` vira `<a href="/#tratamentos">`.
// Só mexe em <a>: `<use href="#np-i-…">` (o sprite de ícones, no mesmo documento) fica como está.
export function rebaseAnchors(html, base = '/') {
  return html.replace(/(<a\b[^>]*?\shref=")#([^"]*)"/g, (_, head, id) => `${head}${base}${id ? '#' + id : ''}"`);
}
