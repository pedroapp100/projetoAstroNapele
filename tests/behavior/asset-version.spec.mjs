import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// O Vercel entrega tudo em /assets/ com `max-age=31536000, immutable` e a URL não mudava: quem já visitou ficava com o CSS/JS antigo por até um ano.
// A versão na URL (?v=<hash do conteúdo>) faz o endereço mudar quando o arquivo muda (docs/superpowers/specs/2026-11-16-rodape-icones-design.md).
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const hash = (file) => createHash('sha1').update(readFileSync(`public/assets/${file}`)).digest('hex').slice(0, 8);

for (const [nome, url, minimo] of [['home', '/', 4], ['página de tratamento', '/tratamentos/toxina-botulinica/', 4]]) {
  test(`${nome}: todo CSS e JS napele* sai com ?v=<hash do conteúdo do arquivo>`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('load');   // o `dev` do Vite às vezes recarrega a página logo após editar um arquivo; sem isso o evaluate cai no meio da recarga
    const urls = await page.evaluate(() =>
      [...document.querySelectorAll('link[rel=stylesheet][href], script[src]')]
        .map((e) => e.getAttribute('href') || e.getAttribute('src'))
        .filter((u) => u.startsWith('/assets/napele')));
    expect(urls.length, `arquivos napele* encontrados: ${urls.join(', ')}`).toBeGreaterThanOrEqual(minimo);
    for (const u of urls) {
      const [caminho, query] = u.split('?');
      expect(query, u).toBe(`v=${hash(caminho.replace('/assets/', ''))}`);
    }
  });
}
