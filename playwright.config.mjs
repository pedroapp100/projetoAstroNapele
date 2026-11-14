// Paridade e comportamento do site Astro contra o design system.
// Requer o servidor em http://localhost:4321  (AGENTS.md: `astro dev --background`).
import { defineConfig } from '@playwright/test';

const viewport = (name, width, height) => ({ name, use: { viewport: { width, height } } });

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    channel: 'chrome', // usa o Google Chrome já instalado: nenhum navegador é baixado
    headless: true,
  },
  projects: [
    viewport('desktop', 1440, 900),
    viewport('tablet-l', 1024, 768),
    viewport('tablet', 768, 1024),
    viewport('mobile', 390, 844),
  ],
});
