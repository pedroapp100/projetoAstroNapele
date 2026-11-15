// Passeio da clínica (napele-clinic.js): ciclo de vida do vídeo no celular.
//
// O iOS só pinta um vídeo mudo depois de um play() aceito. Fora do Low Power Mode o play() mudo passa sem gesto; no Low Power Mode ele é
// recusado e só vale dentro de um gesto (touchend conta, touchstart não). O Chrome headless não reproduz isso, então o teste MODELA a regra:
// o play() é recusado até o teste liberar, e enquanto o clipe nunca tocou o `currentTime = x` é ignorado (a imagem fica parada).
//
// Roda só no projeto "mobile": a regra vale em qualquer tela, mas o clipe leve (passeio-m.mp4) e o fluxo de toque são os do celular.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'ciclo de vida do vídeo: só no viewport de celular');
});

const VIDEO = '.np-clinic__video';

// Modelo do iOS: `mode` = 'reject' (recusa) | 'hang' (a promessa nunca resolve) | 'allow'.
async function fakeIos(page, mode) {
  await page.addInitScript((initial) => {
    const proto = HTMLMediaElement.prototype;
    const realPlay = proto.play;
    const time = Object.getOwnPropertyDescriptor(proto, 'currentTime');
    const isTour = (el) => el.classList && el.classList.contains('np-clinic__video');
    const S = (window.__ios = { mode: initial, playCalls: 0, primed: false, ignoredSeeks: 0, honoredSeeks: 0 });
    proto.play = function () {
      if (!isTour(this)) return realPlay.call(this);
      S.playCalls++;
      if (S.mode === 'reject') return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      if (S.mode === 'hang') { S.mode = 'allow'; return new Promise(() => {}); }   // só a 1ª chamada trava; as seguintes passam
      S.primed = true;
      return realPlay.call(this);
    };
    Object.defineProperty(proto, 'currentTime', {
      configurable: true,
      get() { return time.get.call(this); },
      set(v) {
        if (isTour(this) && !S.primed) { S.ignoredSeeks++; return; }
        if (isTour(this)) S.honoredSeeks++;
        time.set.call(this, v);
      },
    });
  }, mode);
}

// abre a home, pula o preloader (o "Pular" do próprio site) e devolve a geometria da seção
async function openTour(page) {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.documentElement.classList.contains('np-pre-on'), null, { timeout: 15000 });
  return page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';   // o Elementor liga o scroll suave: o teste precisa pular para a posição
    const r = document.getElementById('np-clinic').getBoundingClientRect();
    return { top: r.top + scrollY, h: r.height, vh: innerHeight, pinned: document.getElementById('np-clinic').classList.contains('is-js') };
  });
}
const scrollFrac = (page, g, f) => page.evaluate(({ g, f }) => scrollTo({ top: g.top + (g.h - g.vh) * f, behavior: 'instant' }), { g, f });
const gesture = (page) => page.evaluate(() => window.dispatchEvent(new Event('touchend')));
const state = (page) => page.evaluate((sel) => ({ ...window.__ios, t: document.querySelector(sel).currentTime, src: document.querySelector(sel).currentSrc }), VIDEO);

test('o clipe é guardado na memória (blob): o seek não depende da rede', async ({ page }) => {
  await fakeIos(page, 'allow');
  const g = await openTour(page);
  expect(g.pinned, 'o passeio deveria estar ativo (is-js)').toBe(true);
  await scrollFrac(page, g, 0.0);                       // a 2 telas do passeio: é quando o clipe começa a carregar
  await page.waitForFunction((sel) => document.querySelector(sel).readyState >= 2, VIDEO, { timeout: 30000 });
  expect((await state(page)).src).toMatch(/^blob:/);
});

test('iOS recusa o play() sem gesto (Low Power Mode): um toque prepara o vídeo e ele volta a seguir o scroll', async ({ page }) => {
  await fakeIos(page, 'reject');
  const g = await openTour(page);
  await scrollFrac(page, g, 0.0);
  await page.waitForFunction((sel) => document.querySelector(sel).readyState >= 2, VIDEO, { timeout: 30000 }).catch(() => {});
  await scrollFrac(page, g, 0.55);
  await page.waitForTimeout(1200);

  const frozen = await state(page);
  expect(frozen.playCalls, 'o site deveria ter tentado preparar o vídeo sozinho').toBeGreaterThan(0);
  expect(frozen.primed).toBe(false);
  expect(frozen.honoredSeeks, 'sem play() aceito a imagem não anda').toBe(0);

  await page.evaluate(() => { window.__ios.mode = 'allow'; });   // o dedo levantou: agora o play() vale
  await gesture(page);
  await page.waitForFunction(() => window.__ios.primed, null, { timeout: 5000 });

  await scrollFrac(page, g, 0.6);
  await page.waitForTimeout(1200);
  const mid = await state(page);
  await scrollFrac(page, g, 0.9);
  await page.waitForTimeout(1200);
  const late = await state(page);
  expect(mid.honoredSeeks).toBeGreaterThan(0);
  expect(late.t, 'rolar mais deveria levar o vídeo mais para a frente').toBeGreaterThan(mid.t + 1);
});

test('play() que nunca resolve não trava o ciclo: a tentativa seguinte (um toque) é aceita', async ({ page }) => {
  await fakeIos(page, 'hang');
  const g = await openTour(page);
  await scrollFrac(page, g, 0.0);
  await page.waitForFunction((sel) => document.querySelector(sel).readyState >= 2, VIDEO, { timeout: 30000 }).catch(() => {});
  await scrollFrac(page, g, 0.55);
  await page.waitForTimeout(2600);                       // o site solta a trava de "preparando" depois de 2 s

  await gesture(page);
  await page.waitForFunction(() => window.__ios.primed, null, { timeout: 5000 });
  expect((await state(page)).playCalls).toBeGreaterThanOrEqual(2);
});
