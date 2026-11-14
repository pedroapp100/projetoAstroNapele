import { test, expect } from '@playwright/test';
import { settle } from '../parity/harness.mjs';

// A seção "Protocolo Full Face Fialho" existe no design system (a fonte) e no site Astro (o espelho), com o mesmo contrato.
const TARGETS = [['design system', '/assets/overview/index.html'], ['site', '/']];
const SEC = '#protocolo-full-face';
const DARK = 'rgb(36, 35, 33)';

for (const [name, url] of TARGETS) {
  test.describe(name, () => {
    test.describe('estrutura', () => {
      test.use({ contextOptions: { reducedMotion: 'reduce' } });
      test.beforeEach(async ({ page }) => {
        await page.goto(url);
        await settle(page, { warm: true });
      });

      test('fica entre a faixa dourada e Tratamentos, é escura e está marcada como texto provisório', async ({ page }) => {
        const m = await page.evaluate((sel) => {
          const s = document.querySelector(sel);
          return s && {
            cls: s.className, draft: s.hasAttribute('data-np-draft'), labelledby: s.getAttribute('aria-labelledby'),
            prev: s.previousElementSibling && s.previousElementSibling.className, next: s.nextElementSibling && s.nextElementSibling.id,
            bg: getComputedStyle(s).backgroundColor,
          };
        }, SEC);
        expect(m, 'a seção existe').not.toBeNull();
        expect(m.cls).toContain('np-doctor');
        expect(m.cls).toContain('np-protocol');
        expect(m.prev).toContain('np-marquee');
        expect(m.next).toBe('tratamentos');
        expect(m.draft, 'marcada data-np-draft').toBe(true);
        expect(m.labelledby).toBe('np-protocol-title');
        expect(m.bg).toBe(DARK);
      });

      test('título: um só h2, em degradê dourado', async ({ page }) => {
        const m = await page.evaluate((sel) => {
          const hs = document.querySelectorAll(`${sel} h2`);
          const h = document.getElementById('np-protocol-title');
          return { count: hs.length, text: h && h.textContent.trim(), same: h === hs[0], clip: h && getComputedStyle(h).backgroundClip };
        }, SEC);
        expect(m.count).toBe(1);
        expect(m.same).toBe(true);
        expect(m.text).toBe('Protocolo Full Face Fialho');
        expect(m.clip).toBe('text');
      });

      test('bloco 1: foto 4:5 carregada e dois chips flutuantes dentro da tela', async ({ page }) => {
        const m = await page.evaluate((sel) => {
          const img = document.querySelector(`${sel} .elementor-element-25971ad5 img`);
          const chips = [...document.querySelectorAll(`${sel} .flutua`)].map((c) => {
            const r = c.getBoundingClientRect();
            return { text: c.textContent.trim(), left: r.left, right: r.right };
          });
          return { w: img.naturalWidth, h: img.naturalHeight, done: img.complete, alt: img.alt, chips, vw: window.innerWidth };
        }, SEC);
        // naturalWidth já vem ajustado pela densidade do srcset/sizes (480w em 480px = 480; em 360px = 360): só importa carregar e a proporção
        expect(m.done && m.w > 0, 'foto carregada').toBe(true);
        expect(m.w / m.h).toBeCloseTo(0.8, 2);
        expect(m.alt.length).toBeGreaterThan(10);
        expect(m.chips.map((c) => c.text)).toEqual(['Full Face Fialho', 'Napele Clínica']);
        for (const c of m.chips) { expect(c.left, `${c.text} sai pela esquerda`).toBeGreaterThanOrEqual(0); expect(c.right, `${c.text} sai pela direita`).toBeLessThanOrEqual(m.vw); }
      });

      // O texto do protocolo é curto: centralizado na altura da foto, o título caía no meio dela (211px abaixo do topo, numa foto de 600px).
      // Pedido do usuário: o título tem de ficar no alto da foto (no máximo 60px abaixo do topo dela), não no meio.
      test('o título fica no alto da foto, não no meio dela (desktop)', async ({ page }) => {
        const m = await page.evaluate((sel) => {
          const img = document.querySelector(`${sel} .elementor-element-25971ad5 img`).getBoundingClientRect();
          return { off: Math.round(document.getElementById('np-protocol-title').getBoundingClientRect().top - img.top), photoH: Math.round(img.height), vw: window.innerWidth };
        }, SEC);
        test.skip(m.vw <= 1024, 'empilhado: o texto vem depois da foto');
        expect(m.off, `título ${m.off}px abaixo do topo da foto (foto de ${m.photoH}px)`).toBeGreaterThanOrEqual(0);
        expect(m.off, `título ${m.off}px abaixo do topo da foto (foto de ${m.photoH}px)`).toBeLessThanOrEqual(60);
      });

      test('bloco 2: título, dois parágrafos e dois cards 3:4 (Antes e Depois), o segundo mais baixo no desktop', async ({ page }) => {
        const m = await page.evaluate((sel) => {
          const ev = document.querySelector(`${sel} .np-doctor__evolve`);
          const figs = [...ev.querySelectorAll('.np-doctor__photo')];
          return {
            h3: ev.querySelector('h3').textContent.trim(), ps: ev.querySelectorAll('.np-doctor__evolve-text p').length,
            figs: figs.map((f) => { const i = f.querySelector('img'); const r = f.getBoundingClientRect(); return { who: f.querySelector('.np-doctor__who').textContent.trim(), role: f.querySelector('.np-doctor__role').textContent.trim(), ok: i.complete && i.naturalWidth > 0, ratio: r.width / r.height, top: r.top + window.scrollY }; }),
            cols: getComputedStyle(ev).gridTemplateColumns.trim().split(/\s+/).length, vw: window.innerWidth,
          };
        }, SEC);
        expect(m.h3).toBe('O protocolo na prática');
        expect(m.ps).toBe(2);
        expect(m.figs.map((f) => f.who)).toEqual(['Antes', 'Depois']);
        for (const f of m.figs) { expect(f.role.length).toBeGreaterThan(3); expect(f.ok, `${f.who} carregada`).toBe(true); expect(f.ratio).toBeCloseTo(0.75, 1); }
        if (m.vw > 1024) { expect(m.cols).toBe(2); expect(m.figs[1].top - m.figs[0].top).toBeGreaterThan(30); } else expect(m.cols).toBe(1);
      });

      test('sem rolagem horizontal', async ({ page }) => {
        const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
        expect(m.scroll, `scrollWidth ${m.scroll} > ${m.inner}`).toBeLessThanOrEqual(m.inner);
      });

      test('a seção da doutora segue intacta', async ({ page }) => {
        const m = await page.evaluate(() => {
          const h = document.getElementById('np-doctor-title');
          return { text: h && h.textContent.trim(), clip: h && getComputedStyle(h).backgroundClip, bg: getComputedStyle(document.getElementById('quem-sou')).backgroundColor, chips: [...document.querySelectorAll('#quem-sou .flutua')].map((c) => c.textContent.trim()) };
        });
        expect(m.text).toBe('Nayana Fialho, à frente da Napele em Anápolis');
        expect(m.clip).toBe('text');
        expect(m.bg).toBe(DARK);
        expect(m.chips).toEqual(['Napele Clínica', 'Anápolis, GO']);
      });
    });

    test.describe('movimento', () => {
      test.use({ contextOptions: { reducedMotion: 'no-preference' } });
      test('cada .np-doctor anima só os seus elementos, quando aparece na tela', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', 'o pré-loader leva ~10 s: só no desktop');
        test.setTimeout(90_000);
        await page.goto(url);
        await settle(page);
        // O reveal marca cada peça com .np-rv e a tira quando ela termina de entrar: "pendentes" = peças que ainda esperam aparecer.
        const pending = (sel) => page.evaluate((s) => document.querySelectorAll(`${s} .np-rv`).length, sel);
        const goTo = async (sel) => { await page.evaluate((s) => document.querySelector(s).scrollIntoView(), sel); await page.waitForTimeout(3500); };
        const [p0, d0] = [await pending(SEC), await pending('#quem-sou')];
        expect(p0, 'o reveal montou as peças da seção nova').toBeGreaterThan(4);
        expect(d0, 'e as da doutora').toBeGreaterThan(4);
        await goTo(SEC);
        expect(await pending(SEC), 'ao chegar na seção nova, as peças dela entram').toBeLessThan(p0);
        expect(await pending('#quem-sou'), 'a doutora, longe da tela, continua esperando').toBe(d0);
        await goTo('#quem-sou');
        expect(await pending('#quem-sou'), 'ao chegar na doutora, as peças dela entram').toBeLessThan(d0);
      });
    });
  });
}
