# Seção "Protocolo Full Face Fialho" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma seção "Protocolo Full Face Fialho" entre a faixa dourada e Tratamentos, no molde da "Quem sou eu": primeiro no design system, depois idêntica no site Astro.

**Architecture:** A seção é `section.np-doctor.np-protocol#protocolo-full-face`: reaproveita o CSS e o reveal da `.np-doctor` (regras de `#quem-sou` viram `:is(#quem-sou, #protocolo-full-face)`; o reveal percorre todas as `.np-doctor`). O design system é editado e documentado primeiro; `npm run ds:sync` o espelha em `public/assets`; um bloco novo do `extract-overview.mjs` gera `src/components/Protocol.astro`.

**Tech Stack:** HTML/CSS/JS do design system (`napele.css`, `napele-reveal.js`), Python + Pillow (imagens), Astro 7, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-14-protocolo-full-face-design.md`.

## Global Constraints

- Desta vez `design-sistem-napele/` é editado (pedido do usuário); `public/assets` segue espelho (`npm run ds:sync`; `npm run ds:check` termina com "OK").
- Seção: `id="protocolo-full-face"`, `aria-labelledby="np-protocol-title"`, `class="np-doctor np-protocol"`, atributo `data-np-draft` (texto provisório). Fundo `--np-dark` (`rgb(36, 35, 33)`), `h2#np-protocol-title` "Protocolo Full Face Fialho" em degradê dourado (`background-clip: text`).
- Bloco 1: foto 4:5 (480×600) + 2 chips `.flutua` ("Full Face Fialho", "Napele Clínica") + título + texto. Bloco 2 (`.np-doctor__evolve`): h3 "O protocolo na prática", 2 `p`, 2 `figure.np-doctor__photo` 3:4 com legenda ("Antes" / "Depois"), a segunda 48px mais baixa.
- Texto provisório: sem etapas, resultado, prazo, nº de sessões, "criadora", "exclusivo"; termina em "Os resultados variam de pessoa para pessoa." Não pode ir ao ar com `data-np-draft`.
- Movimento: um momento de assinatura por seção (a foto abre, os chips surgem, o texto segue); com `prefers-reduced-motion` tudo estático.
- Breakpoints 1024px e 767px; Aeonik; ouro só como acento; sem `!important` novo.
- Servidor `astro dev --background`, `http://localhost:4321`. Sem commits (o repositório não tem nenhum).

## Review Focus

1. A seção da doutora (`#quem-sou`) não pode mudar: mesmo CSS e mesmo reveal depois da generalização. → Tasks 2 e 4 (paridade `doutora`, reveal nas duas seções).
2. Duas `.np-doctor` na página: cada uma anima os seus elementos (o reveal não pega o primeiro da página). → Task 2.
3. Celular (390px) sem rolagem horizontal, com a foto 4:5 e os chips flutuantes dentro da tela. → Task 2.
4. O texto provisório nunca vai para produção sem aviso: `data-np-draft` presente e `npm run check:drafts` falha enquanto existir no `dist/`. → Task 4.
5. Imagens carregam (sem 404) em 480 e 960 e têm a proporção declarada (sem esticar). → Tasks 1 e 2.

---

## Task 1: Imagens da seção

**Files:** Create `design-sistem-napele/tools/prep-full-face.py`, `design-sistem-napele/assets/fullface/{protocolo,antes,depois}-{480,960}.webp`

**Interfaces:**
- Produces: `/assets/fullface/protocolo-{480,960}.webp` (4:5: 480×600, 960×1200), `/assets/fullface/antes-{480,960}.webp` e `depois-{480,960}.webp` (3:4: 480×640, 960×1280). Fontes: `assets/results/Clínica harmonização protocolp full face.webp` (metade direita, "depois", para `protocolo`) e `assets/results/Full Face Anapolis.webp` (metade esquerda = `antes`, direita = `depois`). Os originais nunca são alterados. Uso: `python -I tools/prep-full-face.py [out_dir]` (padrão `assets/fullface`).

- [ ] **Step 1: Escrever `prep-full-face.py`** (Pillow, no estilo de `prep-quem-sou-eu.py`: constantes no topo com a caixa de recorte de cada imagem, redução LANCZOS, unsharp leve por tamanho, WebP qualidade 88). Recortes: `protocolo` = metade direita (x 3200–6400) do par de 6400×5408, faixa vertical de 4000 px a partir de y≈250; `antes`/`depois` = metades do par de 6400×4720 (x 0–3200 e 3200–6400), faixa de 4267 px a partir de y≈250. Docstring com a mesma ressalva dos outros scripts (PNG/originais intocados).
- [ ] **Step 2: Rodar** `cd design-sistem-napele && python -I tools/prep-full-face.py`. Esperado: 6 arquivos em `assets/fullface/`, cada um com a largura e a altura acima (conferir com `python -c "from PIL import Image; …"`).
- [ ] **Step 3: Conferir à vista** (Read em `protocolo-960.webp`, `antes-960.webp`, `depois-960.webp`): rosto inteiro dentro do quadro, olhos no terço superior; ajustar o `y` do recorte se cortar testa ou queixo.

## Task 2: A seção no design system (marcação, CSS e reveal)

**Files:** Modify `design-sistem-napele/assets/overview/index.html`, `design-sistem-napele/assets/napele.css`, `design-sistem-napele/assets/napele-reveal.js`; Create `tests/behavior/protocol.spec.mjs`

**Interfaces:**
- Consumes: imagens da Task 1. Produces: a seção no Overview do design system (`/assets/overview/index.html` depois do `ds:sync`) e o contrato que o site Astro tem de repetir (Task 4).

- [ ] **Step 1: Escrever `protocol.spec.mjs`** (com `reducedMotion: 'reduce'`, parametrizado por alvo: `['design system', '/assets/overview/index.html']` e `['site', '/']`; o alvo "site" só passa na Task 4). Testes, por alvo: (a) `#protocolo-full-face` é `.np-doctor.np-protocol`, o irmão anterior é `.np-marquee` e o seguinte é `#tratamentos`, e tem `data-np-draft`; (b) `getComputedStyle(section).backgroundColor === 'rgb(36, 35, 33)'`; (c) um único `h2#np-protocol-title` com o texto "Protocolo Full Face Fialho", `aria-labelledby` apontando para ele e `backgroundClip` `text`; (d) 2 `.flutua` com os textos "Full Face Fialho" e "Napele Clínica", dentro da foto (right/left da caixa do chip dentro do viewport em 390px); (e) foto do bloco 1 carregada (`naturalWidth ≥ 480`) com proporção 0,8 ±0,01; (f) bloco 2: `h3` "O protocolo na prática", 2 `p`, 2 `figure.np-doctor__photo` com imagens carregadas, proporção exibida 0,75 ±0,02, legendas `.np-doctor__who` "Antes" e "Depois", a segunda figura com `top` maior que a primeira (só ≥1025px); (g) abaixo de 1025px `.np-doctor__evolve` tem 1 coluna (`gridTemplateColumns` sem espaço); (h) rolagem horizontal: `scrollWidth ≤ innerWidth`; (i) a seção da doutora segue intacta: `#quem-sou` existe, `h2#np-doctor-title` com "Nayana Fialho, à frente da Napele em Anápolis" e `backgroundClip` `text`. Um teste **com movimento** (`reducedMotion: 'no-preference'`, só no desktop, pula o pré-loader com `?` não: espera `html.np-pre-on` sumir no site e usa o DS direto): rolar até cada uma das duas `.np-doctor` e esperar que `.np-rv` do título e da foto dela tenham `.is-rv`, e que os do outro continuem sem `.is-rv` enquanto não são vistos.
- [ ] **Step 2: Rodar** `npx playwright test tests/behavior/protocol.spec.mjs --project=desktop -g "design system"`. Esperado: FALHA (seção ausente; depois do `ds:sync` o DS ainda não tem a seção).
- [ ] **Step 3: Marcação.** Em `index.html`, entre o `</section>` da `.np-marquee` e a seção `#tratamentos`, inserir `section.np-doctor.np-protocol` copiando a estrutura da `#quem-sou` (mesmos `elementor-element-<id>`, `flutua`, SVGs dos chips), com `<img>` simples (`loading="lazy"`, `srcset` 480/960 de `../fullface/…`), `alt` descritivo, texto provisório e `data-np-draft`. Textos: chips acima; h2 "Protocolo Full Face Fialho"; parágrafos: "O Full Face Fialho é o protocolo da Napele que olha o rosto inteiro, e não uma região de cada vez." e "Tudo começa por uma avaliação: você conta o que quer mudar, e a equipe indica o que faz sentido para o seu caso e em que ordem."; h3 "O protocolo na prática"; "Estes são casos atendidos na Napele. Cada rosto responde de um jeito, e o plano é definido na avaliação." e "Os resultados variam de pessoa para pessoa."; legendas "Antes · Avaliação inicial" e "Depois · Após o protocolo" (`.np-doctor__who` = Antes/Depois, `.np-doctor__role` = o resto).
- [ ] **Step 4: CSS.** Em `napele.css`: `#np-doctor-title` e as 5 regras `#quem-sou …` passam a `:is(…)` com a seção nova (`.np-doctor :is(#np-doctor-title,#np-protocol-title)`; `:is(#quem-sou,#protocolo-full-face) …`). Atualizar os comentários do bloco ("Quem sou" e "Protocolo Full Face Fialho"). Nada de regra duplicada.
- [ ] **Step 5: Reveal.** Em `napele-reveal.js`, o bloco "Doctor" vira `$$('.np-doctor').forEach(function (sec) { … })` com os seletores escopados em `sec` (título = `.elementor-image-box-title` do texto, em vez de `#np-doctor-title`); comportamento da doutora inalterado.
- [ ] **Step 6: Sincronizar e rodar.** `npm run ds:sync` e `npx playwright test tests/behavior/protocol.spec.mjs tests/parity/section.spec.mjs --project=desktop -g "design system|doutora"`. Esperado: PASSA (a paridade da doutora com o design system continua sem diferenças). Repetir `--project=mobile` e `--project=tablet`.
- [ ] **Step 7: Verificação visual** (claude-in-chrome): abrir `/assets/overview/index.html`, rolar até a seção em 1440px e em 390px; comparar com a "Quem sou eu" (mesma geometria, chips dentro da foto, legendas legíveis).

## Task 3: Documentação na aba Sistema

**Files:** Modify `design-sistem-napele/design-sistem-napele.html`; Test `tests/unit/protocol-docs.unit.spec.mjs`

- [ ] **Step 1: Teste (lê o HTML como texto).** O arquivo contém: na tabela "Arco narrativo", a linha do ato 1 citando "Protocolo Full Face Fialho"; um `dsc-spec-name` "Protocolo Full Face Fialho · seção" com `data-np-draft` explicado ("texto provisório"); em "Tamanho das seções", uma linha "Protocolo Full Face Fialho" entre "Marquee" e "Tratamentos".
- [ ] **Step 2: Rodar** `npx playwright test tests/unit/protocol-docs.unit.spec.mjs --project=desktop`. Esperado: FALHA.
- [ ] **Step 3: Implementar** as três edições em `design-sistem-napele.html`: ato 1 "Promessa" passa a "Pré-loader, hero, faixa dourada e protocolo Full Face Fialho" com a pergunta "Existe um método?"; nova `figure.dsc-spec` depois de "Card da doutora + chips flutuantes" (código/medidas: `.np-doctor.np-protocol`, ids do kit, `:is()` no CSS, fotos 4:5 e 3:4 de `assets/fullface/`, reveal igual ao da doutora, texto provisório); nova linha na tabela de tamanhos (largura 100% · coluna da imagem como a da doutora; altura auto, mesmo padding).
- [ ] **Step 4: Rodar o teste.** Esperado: PASSA.

## Task 4: Site Astro e proteção do texto provisório

**Files:** Modify `scripts/extract-overview.mjs`, `src/pages/index.astro`, `tests/parity/sections.mjs`, `package.json`; Create `src/components/Protocol.astro` (gerado), `scripts/check-drafts.mjs`, `tests/unit/check-drafts.unit.spec.mjs`

**Interfaces:**
- Consumes: a seção do design system (Task 2). Produces: `BLOCKS.protocolo = 'class="np-doctor np-protocol"'` em `extract-overview.mjs`; `SECTIONS` com `{ id: 'protocolo', index: 2, ignore: ['transform','opacity'] }` e os índices seguintes +1; `findDrafts(dir: string): string[]` em `scripts/check-drafts.mjs` (caminhos dos `.html` com `data-np-draft`) e `npm run check:drafts` (sai com 1 se houver).

- [ ] **Step 1: Testes.** `check-drafts.unit.spec.mjs`: `findDrafts` numa pasta temporária com um `.html` com `data-np-draft` e outro sem devolve só o primeiro; pasta limpa devolve `[]`. Em `protocol.spec.mjs` o alvo "site" já está escrito (Task 2). Em `sections.mjs`, `protocolo` no índice 2 e `tratamentos` 3, `clinica` 4, `galeria` 5, `resultados` 6, `doutora` 7, `faq` 8, `visita` 9, `cta` 10.
- [ ] **Step 2: Rodar** `npx playwright test tests/unit/check-drafts.unit.spec.mjs tests/behavior/protocol.spec.mjs --project=desktop -g "site|findDrafts"`. Esperado: FALHA.
- [ ] **Step 3: Implementar.** `findDrafts` e `check-drafts.mjs` (CLI: varre `dist/`, imprime os arquivos e `process.exit(1)`); script `"check:drafts"`; `BLOCKS.protocolo`; `node scripts/extract-overview.mjs protocolo src/components/Protocol.astro`; `<Protocol />` entre `<Marquee />` e `<Treatments />` em `index.astro`.
- [ ] **Step 4: Rodar** os testes do Step 2 e `npx playwright test tests/parity/section.spec.mjs` (todas as seções, com os índices novos, nos 4 viewports). Esperado: PASSAM (menos a pendência conhecida `clinica` em ≤1024px, que já falhava).
- [ ] **Step 5: Suíte e build.** `npx playwright test`, `npm run ds:check`, `npm run build`, e `npm run check:drafts` (esperado: FALHA com `dist/index.html`, que é o comportamento desejado enquanto o texto for provisório).
- [ ] **Step 6: Verificação visual** no site (`/`): a seção entre a faixa dourada e Tratamentos em 1440px e 390px.
