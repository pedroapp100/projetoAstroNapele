// Paridade e comportamento do site Astro contra o design system.
// Requer o servidor em http://localhost:4321  (AGENTS.md: `astro dev --background`).
import { defineConfig, devices } from '@playwright/test';

// usa o Google Chrome já instalado: nenhum navegador é baixado (o `channel` só existe para o Chromium, por isso não fica no `use` global)
const viewport = (name, width, height) => ({ name, use: { channel: 'chrome', viewport: { width, height } } });

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    headless: true,
  },
  projects: [
    viewport('desktop', 1440, 900),
    viewport('tablet-l', 1024, 768),
    viewport('tablet', 768, 1024),
    viewport('mobile', 390, 844),
    // iPhone: o WebKit do Playwright (o mesmo motor do Safari). Só roda os testes `ios-*` e `celular-*`: os outros foram escritos contra o Chrome.
    // Precisa de um download único: `npx playwright install webkit`.
    { name: 'iphone', testMatch: /(ios|celular)-.*\.spec\.mjs$/, use: { ...devices['iPhone 13'] } },
  ],
});
