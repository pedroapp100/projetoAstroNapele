import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

// O deploy da Vercel sai do `git push`: o que o .gitignore engole em public/ existe no disco, mas não chega ao ar.
// Foi assim que `public/assets/overview/wp-includes/js/dist/{hooks,i18n}.min.js` sumiram (a regra `dist/` pegava a
// pasta em qualquer profundidade) e o Overview passou a dar "wp is not defined" em produção.
const LIXO_DO_SISTEMA = /(^|\/)(desktop\.ini|Thumbs\.db|\.DS_Store)$/;

test('todo arquivo de public/ é rastreado pelo git (senão não vai para o deploy)', () => {
  const ignorados = execFileSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard', '--', 'public'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((f) => !LIXO_DO_SISTEMA.test(f));
  expect(ignorados).toEqual([]);
});
