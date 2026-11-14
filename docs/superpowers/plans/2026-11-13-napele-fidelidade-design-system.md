# Napele Astro — Fidelidade ao Design System: Plano de Correção e Implementação

> **Para agentes de execução:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:executing-plans` (recomendado, ver "Execução") ou `superpowers:subagent-driven-development`. Os passos usam checkbox (`- [ ]`). **Uma seção por vez: ao fim de cada tarefa, PARE e peça a aprovação do usuário antes de começar a próxima.**

**Objetivo:** fazer o site Astro (`http://localhost:4321/`) ficar idêntico à aba **Overview** do design system, respeitando tudo o que a aba **Sistema** documenta (texturas, grão, animações, tamanhos), seção por seção.

**Arquitetura:** o design system (DS) é a fonte da verdade e é somente leitura. A aba Overview do DS é um `<iframe>` de `design-sistem-napele/assets/overview/index.html`; é essa página que o Astro deve reproduzir. Cada componente Astro vira uma cópia literal do trecho correspondente do `index.html` (só os caminhos mudam), `public/assets` vira um espelho byte a byte de `design-sistem-napele/assets`, e um teste de paridade compara, no navegador, o original (`/assets/overview/index.html`, servido pelo próprio Astro, mesma origem) com a página Astro.

**Stack:** Astro 7, `napele.css` e scripts `napele-*.js` do DS (sem alterá-los), GSAP (pré-loader), Swiper + Elementor frontend (carrossel, como no original), Playwright para a paridade (ver decisão 1).

**Spec:** `design-sistem-napele/design-sistem-napele.html` (aba **Overview** = `design-sistem-napele/assets/overview/index.html`; aba **Sistema** = tokens, textura, movimento, arco narrativo, seções da home, tamanho das seções).

---

## 1. Diagnóstico (o que está errado hoje, com evidência)

O HTML das seções do Astro já é quase idêntico ao do Overview (comparei tag a tag; só diferem caminhos, atributos de lazy-load e os itens abaixo). O problema está em **CSS, scripts e ambiente**: a versão atual é uma recriação com CSS/JS improvisado, não uma cópia do DS.

| # | Causa-raiz | Evidência medida |
|---|---|---|
| C1 | `Layout.astro` injeta reset global com `overflow-x:hidden !important` em `html`, `body` e `main.elementor-11`, e fundo `!important` | Ancestrais do `.np-clinic` têm `overflow: hidden/auto` no Astro e `visible` no Overview. Isso **quebra `position: sticky`**, que é o passeio da clínica |
| C2 | `Hero.astro` tem ~120 linhas de CSS próprio com `!important` (altura, margem, véu, retrato `img.np-person` fixo, descrição 18px) e adiciona classes `np-hero`/`np-hero__inner` | Hero Astro × Overview: `margin-top` 0 × −120px; `padding-top` 144px × 80px; descrição 18px/32px × 24,3px/43px; altura do bloco 410 × 476px. (Nos seus prints o título e o botão parecem mais "chapados" que no Overview, mas o estilo computado atual de `h1` e botão é igual nas duas páginas: a Tarefa 3 precisa confirmar isso à vista, não presumi) |
| C3 | `public/assets/napele-tiles.js`, `napele-preloader.js` e `napele-preloader.css` foram editados e **divergem do DS** (hero via `.np-hero`, retrato `HeroNayana.webp` em vez do `srcset` 900/1600) | `diff` entre `public/assets` e `design-sistem-napele/assets` |
| C4 | Navbar: script próprio no `Header.astro` no lugar do `napele-nav.js`; `np-pre-hold` não existe no `<body>`, então a barra não espera o pré-loader | Leitura de `napele-nav.js` e `napele.css` (linhas 774–925) |
| C5 | Carrossel de tratamentos: Swiper escrito à mão, sem Elementor | Overview: `elementorFrontend` presente, breakpoints `{0:1, 767:2, 1024:3.001}`, classe `offset-right`, 27 slides. Astro: `elementorFrontend` ausente, breakpoints `{768:2, 1025:3}`, sem `offset-right`, 25 slides |
| C6 | Rodapé sem o `<div class="bg">` (grão global do DS: `noise-01.webp`, opacidade .4, `position: fixed`); `<footer>` virou `<div>`; falta o menu dropdown mobile | `grep class="bg"`: 1 ocorrência no Overview, 0 no Astro |
| C7 | Markup "corrigido": o original tem a classe colada `elementor-element-b2491c2elementor-widget__width-initial` (galeria da clínica); o Astro separou com espaço, o que muda o layout. `data-settings` e `data-e-type` do Elementor foram removidos | Diff normalizado do HTML |
| C8 | Cabeçalho do Layout carrega CSS de outras páginas (`post-724/760/127/825`), fontes com `font-display: swap` (DS usa `auto`) e `napele-contact.js` duas vezes | `Layout.astro`, `Footer.astro` |

**Nota de honestidade:** nos meus testes o `html.np-pre-on` (trava de rolagem do pré-loader) continuou ativo após 9 s, tanto no Overview quanto no Astro. A aba estava em segundo plano (GSAP pausa), então não conclui que o pré-loader trava. A Tarefa 1 precisa verificar isso com a aba em foco.

## 2. Decisões já tomadas (minhas, para você corrigir se discordar)

- **D1 — Elementor frontend como no original.** Carrego a mesma cadeia de scripts do `index.html` (linhas 926–981: jQuery, webpack runtime, frontend, swiper, elementor-pro), trocando `rocketlazyloadscript` por `<script defer src>`. É a forma de o carrossel, o sticky e as classes `e-lazyloaded` se comportarem como no DS, e os arquivos já estão em `public/assets/overview/wp-content`.
- **D2 — Pré-loader e navbar sem alterar nenhum script do DS.** No DS, navbar (shell) e página (iframe) são dois documentos que conversam por `postMessage`. Em um site de um documento só, um adaptador novo e pequeno, `public/assets/napele-site.js`, faz `window.parent` reentregar as mensagens à própria janela (testei no Chrome: `Object.defineProperty(window,'parent',…)` funciona) e replica o `report()` do lado "iframe" do `napele-nav.js`.
- **D3 — Fora do escopo:** a página modelo `tratamento.html?t=<slug>` (aba Tratamentos do DS). Os cards continuam com os links-âncora atuais. *(Superada em 2026-11-14: as 13 páginas `/tratamentos/<slug>/` foram feitas, ver `2026-11-14-paginas-tratamentos.md`; os cards e o rodapé da home já levam a elas.)*
- **D4 — Ordem das tarefas = ordem da página**, com a fundação (Tarefa 0) primeiro porque C1, C3, C5 e C8 afetam todas as seções.

## Global Constraints

Valores copiados do DS (aba Sistema). Todas as tarefas os herdam.

- `design-sistem-napele/` é **somente leitura**. `public/assets` espelha `design-sistem-napele/assets`; `public/logo` espelha `design-sistem-napele/logo`.
- Nenhum CSS/JS do site pode sobrescrever `napele.css` com `!important`. O único CSS novo permitido é o bloco "shell" da navbar (Tarefa 2, ≤ 8 linhas).
- Fonte: **Aeonik** em toda a página; **Bodoni Moda só no pré-loader** (o "FULL FACE").
- Cores: `--np-gold-100 #EAD6A8`, `--np-gold-300 #D9BE8F`, `--np-gold-500 #C9A868`, `--np-gold-700 #7A5C14`, `--np-dark #242321`, `--np-black #1B1A18`, `--np-cream #F3EFEC`, `--np-ink #3F3726`. Ouro só como acento.
- Movimento: `--np-ease-out: cubic-bezier(.16,1,.3,1)`; hover `.35s`; **um momento de assinatura por seção e mais nada se mexe sozinho** (tabela da Tarefa 12). Com `prefers-reduced-motion`, pré-loader e passeio viram versões estáticas.
- Container `--np-container` máx. 1140px; breakpoints do Elementor **1024px e 767px** (não 1025/768).
- Texturas: grão global `.bg` (`noise-01.webp`, tile 250px, `repeat`, `opacity .4`, `position:fixed; z-index:100; inset:-50%; width:150%; height:200vh; pointer-events:none`) vem do widget HTML do rodapé; grão branco `.np-grain-white` (`texture/noise-white.png`, `opacity: var(--np-grain-opacity,1)`) na seção Tratamentos.
- Um só nome de botão: **Agendar Avaliação**.
- `AGENTS.md`: subir o servidor com `astro dev --background`; gerenciar com `astro dev status|logs|stop`.
- Comandos de verificação usam o servidor em `http://localhost:4321`.

## Review Focus

Entradas que o spec implica e nenhum teste de aparência cobre. Cada linha tem um teste na tarefa dona.

1. **Breakpoints exatos** (1023/1024/1025 e 766/767/768 de largura): o carrossel e o layout do hero/clínica não podem trocar de modo no pixel errado. → Tarefas 5 e 6.
2. **Pré-loader que não solta a página**: rolagem travada depois do fim, falha de script (fail-safe de 20 s) e `prefers-reduced-motion`. → Tarefa 1.
3. **Âncoras** `#tratamentos`, `#sobre-a-clinica`, `#como-chegar` com navbar fixa e seção `sticky` no meio: o destino precisa ficar visível, e recarregar com `#hash` no meio da página não pode quebrar a medição. → Tarefas 2 e 6.
4. **Redimensionar/rotacionar com a página já rolada**: `napele-procedures.js`, `napele-clinic.js` e `napele-tiles.js` medem no `resize`; não pode sobrar faixa vazia nem salto. → Tarefas 3, 5 e 6.
5. **Lightbox** (Resultados e Galeria): abre/fecha por clique, `Esc` e swipe, a navbar sai da frente (`np-nav-away`), o foco volta ao item e a rolagem do fundo não anda. → Tarefas 6 e 7.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `scripts/sync-ds.mjs` (novo) | Copia `design-sistem-napele/assets/**` → `public/assets/**` e `design-sistem-napele/logo/**` → `public/logo/**` |
| `scripts/check-ds-drift.mjs` (novo) | Sai com código 1 e lista arquivos que diferem do DS ou que existem só em `public/assets` |
| `tests/parity/harness.mjs` (novo) | Pareia original × Astro e devolve as diferenças de estilo |
| `tests/parity/sections.mjs` (novo) | Mapa das 10 seções (índice, propriedades ignoradas) |
| `tests/parity/section.spec.mjs` (novo) | Paridade por seção × viewport |
| `tests/behavior/*.spec.mjs` (novos) | Um arquivo por seção: movimento, estados, lightbox |
| `playwright.config.mjs` (novo) | `baseURL` `http://localhost:4321`, projetos 1440×900, 1024×768, 768×1024, 390×844 |
| `public/assets/napele-site.js` (novo) | Adaptador D2 (único JS novo do site) |
| `src/layouts/Layout.astro` | `<head>` e scripts na mesma ordem do `index.html`; sem reset global |
| `src/components/*.astro` | Cópias literais dos trechos do `index.html` |
| `src/pages/index.astro` | Ordem das seções (já correta) |

### Contrato do harness (usado por todas as tarefas)

```js
// tests/parity/harness.mjs
export const PROPS: string[]        // whitelist de propriedades computadas (display, position, width, height, margin*, padding*, fontSize,
                                    // fontFamily, fontWeight, lineHeight, letterSpacing, color, backgroundColor, backgroundImage, backgroundClip,
                                    // borderRadius, opacity, transform, filter, boxShadow, textShadow, zIndex, overflow, textAlign, flexDirection,
                                    // gap, gridTemplateColumns, animationName, top, left, objectFit, mixBlendMode, maskImage, backdropFilter, visibility)
export async function diffSection(page: Page, section: SectionSpec, viewport: {width:number,height:number}): Promise<string[]>
// [] = paridade. Cada linha: "<caminho> <tag.classe> prop: valorOriginal => valorAstro"
```

Algoritmo (validado hoje no navegador): abrir o original em `/assets/overview/index.html` e a página em `/`, mesmo viewport, `prefers-reduced-motion: reduce` (pula o pré-loader). Pegar os filhos de primeiro nível de `div.elementor-11` (original) e `main.elementor-11` (Astro), ignorando `img.np-person`, `script`, `style`, `link` e **`noscript`** (o original traz fallbacks `noscript` que não existem no Astro). Parear por caminho estrutural (índice entre irmãos) e comparar `PROPS` mais `::before`/`::after` (`content`, `backgroundImage`, `opacity`, `mixBlendMode`, `position`). Largura/altura com tolerância de ±1px. Pareamento por classe **não funciona** (o hero do Astro tem classes extras): usei os dois hoje e só o por caminho dá resultado limpo.

```js
// tests/parity/sections.mjs  (índice = posição entre os filhos de primeiro nível; conferida nas duas páginas)
export const SECTIONS: { id: string; index: number; ignore: string[] }[] = [
  { id: 'hero', index: 0, ignore: ['transform', 'opacity'] },          // fade por rolagem
  { id: 'marquee', index: 1, ignore: ['transform'] },                  // faixa animada
  { id: 'tratamentos', index: 2, ignore: ['transform'] },              // wrapper do Swiper
  { id: 'clinica', index: 3, ignore: ['transform', 'opacity'] },       // passeio guiado pela rolagem
  { id: 'galeria', index: 4, ignore: [] },
  { id: 'resultados', index: 5, ignore: ['transform'] },               // deriva da faixa
  { id: 'doutora', index: 6, ignore: ['transform'] },                 // chips flutuantes
  { id: 'faq', index: 7, ignore: [] },
  { id: 'visita', index: 8, ignore: [] },
  { id: 'cta', index: 9, ignore: [] },
];
```

---

## Tarefa 0: Fundação (espelho do DS, Layout, adaptador, harness)

**Files:**
- Create: `scripts/sync-ds.mjs`, `scripts/check-ds-drift.mjs`, `tests/parity/{harness,sections,section.spec}.mjs`, `tests/behavior/foundation.spec.mjs`, `playwright.config.mjs`, `public/assets/napele-site.js`
- Modify: `package.json` (scripts `ds:sync`, `ds:check`, `test:parity`, `test:behavior`), `src/layouts/Layout.astro`
- Revert (via sync): `public/assets/napele-tiles.js`, `napele-preloader.js`, `napele-preloader.css`

**Interfaces:**
- Produces: `npm run ds:check` (0 = sem desvio), `npm run test:parity -- --grep <id>`, e o contrato do harness acima. `napele-site.js` não exporta nada; define `window.parent` (D2) e `report(): void`.

- [ ] **Step 1: Teste de desvio (falha primeiro).** Escrever `scripts/check-ds-drift.mjs`. Rodar `node scripts/check-ds-drift.mjs`. Esperado: **FALHA** listando `napele-preloader.css`, `napele-preloader.js`, `napele-tiles.js` e os extras `public/assets/scratch/*`, `slogan*.svg`.
- [ ] **Step 2: Sincronizar.** Escrever `scripts/sync-ds.mjs` (copia, não apaga extras) e rodar `npm run ds:sync`. Rodar `npm run ds:check`. Esperado: só os extras restantes (`scratch/`, `slogan*.svg`) aparecem como "só no site"; **nenhum arquivo difere**. As edições manuais feitas nesses 3 arquivos são descartadas de propósito (C3).
- [ ] **Step 3: Harness e baseline.** Escrever `tests/parity/*` e `playwright.config.mjs`. Rodar `npm run test:parity`. Esperado: **FALHA** nas seções `hero`, `tratamentos`, `clinica`, `doutora`, `cta` e `marquee`. Medi hoje, num viewport de 3413×1694 a 75%: hero 10 diferenças, tratamentos 99, clínica 8, doutora 3, cta 1, marquee 1; faq, visita, galeria e resultados 0. Esses números ainda contam os fallbacks `noscript`, que o harness novo ignora, então os reais serão menores. Anexar a saída em `docs/superpowers/plans/baseline-paridade.txt`.
- [ ] **Step 4: Reescrever `Layout.astro`.** `<head>` na ordem exata das linhas 51–96 do `index.html`: os 21 `<link rel=stylesheet>` (widget CSS, `post-6`, swiper, `post-11`, `post-14`, `post-28`), depois o bloco de fontes `aeonik` (400/500/700, `font-display: auto`), depois `napele.css`, depois `napele-preloader.css`. **Remover** `post-724/760/127/825`, o reset global `!important` e a regra `main.elementor-11{overflow-x:hidden}`. `<body>` com as classes do `index.html` (linha 136) mais `data-view="overview"` e **`np-pre-hold`**; manter o sprite SVG de ícones. Favicons: os 3 do `index.html` (32/192/180). Sem `title`/OG duplicados.
- [ ] **Step 5: Scripts.** No `<head>`, nesta ordem: `napele-site.js`, `vendor/gsap.min.js`, `napele-preloader.js`. No fim do `<body>`: `elementorFrontendConfig` e `ElementorProFrontendConfig` copiados literalmente das linhas ≈933–936 e ≈954–957 (trocando só as URLs relativas por `/assets/overview/…`), depois a cadeia das linhas 926–958 como `<script defer src>`, depois `napele-nav.js`, `napele-marquee.js`, `napele-procedures.js`, `napele-results.js`, `napele-faq.js`, `napele-contact.js`, `napele-clinic.js`, `napele-clinic-gallery.js`, `napele-reveal.js` (cada um **uma vez**; remover os `<script>` duplicados dos componentes quando cada seção for tratada). O `napele-tiles.js` entra com o hero (Tarefa 3).
- [x] **Step 6: Adaptador `napele-site.js`.** *(Feito na execução só a parte (a); a parte (b) foi movida para a Tarefa 2, porque o `Header.astro` ainda tem um script próprio que faz o mesmo e o teste não ficaria vermelho antes.)* Faz duas coisas e nada mais: (a) `Object.defineProperty(window,'parent',{configurable:true,get:()=>({postMessage:d=>window.dispatchEvent(new MessageEvent('message',{data:d}))})})`, para que `npPre`, `npLightbox` e `npNavScrolled` cheguem ao ramo "shell" do `napele-nav.js` sem alterá-lo; (b) `report(): void`, a réplica do ramo "iframe" do `napele-nav.js` (linhas 80–105): em `scroll` e `resize`, aplica o fade do conteúdo do hero (`opacity` 1→0 e `translateY` até −60px com `p = scrollY / (alturaDoHero*0.5)` suavizado `p*p*(3-2p)`) e emite `{npNavScrolled:boolean}` quando `scrollY > 0.7 × alturaDoHero` muda.
- [ ] **Step 7: Teste da fundação.** `tests/behavior/foundation.spec.mjs` com estas asserções: `typeof elementorFrontend === 'object'`; nenhum `pageerror`/`console.error`; nenhuma resposta 404 em `network`; nenhum ancestral de `.np-clinic` com `overflow` diferente de `visible`; `document.querySelectorAll('script[src*="napele-contact"]').length === 1`. Rodar `npx playwright test tests/behavior/foundation.spec.mjs`. Esperado: **PASSA**.
- [ ] **Step 8: Commit** (só com o seu OK; o repositório ainda não tem nenhum commit): `git add scripts tests playwright.config.mjs package.json public/assets src/layouts docs && git commit -m "fix: espelho do DS, layout fiel ao Overview e harness de paridade"`.

**PARE.** Mostre o resultado ao usuário e peça aprovação.

---

## Tarefa 1: Pré-loader

**Referência:** `index.html` linhas 132–134 (`napele-preloader.css/js`, `vendor/gsap.min.js`); aba Sistema → *Movimento* ("a revelação do pré-loader") e *Arco narrativo* (Bodoni Moda só aqui).

**Files:** Modify `src/components/Preloader.astro` (deixar só o que o `<head>` do Layout ainda não cobre, ou remover o componente e a linha em `index.astro`); Test `tests/behavior/preloader.spec.mjs`.

**Interfaces:** Consumes `napele-site.js` (D2). O pré-loader emite `npPre` = `'on'` → `'nav'` (fase 3) → `'off'`.

- [ ] **Step 1: Escrever `tests/behavior/preloader.spec.mjs` (com movimento, aba em foco).** Asserções: em t≈0,3 s `html.np-pre-on` existe e a rolagem está travada; `body.np-pre-hold` existe e a navbar está invisível; ao chegar em `'nav'` a navbar aparece; ao fim `html.np-pre-on` some, `scrollTo(0,500)` rola de fato e `.np-pre` sai do DOM. Contador usa Bodoni Moda (`getComputedStyle(...).fontFamily` contém `Bodoni`).
- [ ] **Step 2: Teste de fail-safe e reduced motion.** `reducedMotion:'reduce'`: sem `html.np-pre-on`, navbar visível de imediato. Bloqueando `napele-preloader.js` na rede: `np-pre-hold` cai em ≤ 20,5 s e a página rola.
- [ ] **Step 3: Rodar.** `npx playwright test tests/behavior/preloader.spec.mjs`. Se falhar, a causa está no Layout (Tarefa 0) ou no adaptador; corrigir lá, nunca editando `napele-preloader.*`.
- [ ] **Step 4: Verificação visual.** Com `claude-in-chrome`: gravar o pré-loader do início ao fim (cortinas `BgNayanaPreloader`/`bgpreloader-nayana.webp`, contador, revelação do hero) e comparar com o mesmo trecho em `/assets/overview/index.html`.
- [ ] **Step 5: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 2: Header (navbar)

**Referência:** navbar do shell do DS (`design-sistem-napele.html` linhas 247–270, estilos em `napele.css` 774–925) com os itens de menu do header do Overview: **Início, Tratamentos (#tratamentos), A Clínica (#sobre-a-clinica), Como chegar (#como-chegar)**. Sistema → *Tamanho das seções*: logo **161px | 161px | 125px**.

**Files:** Modify `src/components/Header.astro` (remover o `<style is:global>` e o `<script>` próprios); Test `tests/behavior/header.spec.mjs`.

**Interfaces:** Consumes `napele-nav.js` (ramo shell) + `napele-site.js`. Bloco "shell" permitido (≤ 8 linhas, em `Header.astro`): `.ds-nav{position:fixed;top:0;left:0;right:0;z-index:30;pointer-events:none}` e `.ds-nav .elementor-element-ac70087{pointer-events:auto}`, equivalente às linhas 92–93 do DS com `position:fixed`.

- [ ] **Step 1: Teste `header.spec.mjs`.** Asserções: `.ds-nav` com `position: fixed`; altura do logo 161px (≥1024), 125px (≤767); no topo da página `np-nav-scrolled` **ausente** e a barra transparente; após rolar `0.71 × alturaDoHero` presente (vidro escuro); em 390px o `.np-burger` abre o overlay (`np-nav-open`, `aria-expanded="true"`), `Esc` fecha e devolve o foco; clicar num item fecha; ícones Instagram/WhatsApp/Pin com `href` corretos e `data-np-contact="whatsapp"` tratado pelo `napele-contact.js`; clicar em "Tratamentos" leva a `#tratamentos` com o título visível abaixo da barra.
- [ ] **Step 2: Rodar (espera FALHA)** em `np-nav-scrolled`/`np-pre-hold` enquanto o script próprio ainda existe.
- [ ] **Step 3: Remover o CSS/JS próprio** do `Header.astro`; manter só o markup (logo, menu, `np-burger`, `np-nav-social`).
- [ ] **Step 4: Rodar.** Esperado: **PASSA**. Conferir a olho em 1440, 1024, 768 e 390.
- [ ] **Step 5: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 3: Hero (ato 1 · Promessa)

**Referência:** `index.html` linhas 182–206. Sistema → *Hero · blocos inclinados (desktop)*, *(≤767px)* e *brilho do título*.

**Spec que o resultado precisa cumprir (do DS):**
- Parede `.np-tiles`: `perspective 1600px`, `rotateX(40deg) rotateY(16deg) rotateZ(-20deg)`, plano 260% × 240% do hero, blocos quadrados raio 14px, gap 8px, rolagem infinita `translateY(0 → −50%)` a **52px/s**, colunas pares invertidas, 8 fotos de tratamento + 2 da Dra. Parallax do mouse **desligado** (`PARALLAX = 0`).
- Véu escuro `rgba(36,35,33,·)`: `linear-gradient(90deg, .97 0%, .95 50%, .85 100%)`.
- ≤767px: bloco de 150px, véu embaixo `linear-gradient(0deg, .97 0%, .94 42%, .5 100%)`, retrato centralizado sob a navbar (top 140px) com máscara; some quando sobram < 140px de altura.
- `h1`: `animation: np-h1shine 5s ease-in-out 1.4s infinite`, `background-clip:text`, faixa `rgba(253,187,2,.95)`.
- Texto máx. 47%, hero mín. `100svh`. Botão dourado "Agendar Avaliação" (`#botao_wpp`).

**Files:** Modify `src/components/Hero.astro` (markup literal das linhas 182–206: **sem** `np-hero`, `np-hero__inner`, `data-np-veil`, `img.np-person`; **apagar** o `<style is:global>`); Test `tests/behavior/hero.spec.mjs`.

**Interfaces:** Consumes `napele-tiles.js` (já sincronizado, cria `.np-tiles` e o retrato via `srcset` `hero-nayana-900.webp 900w, hero-nayana-1600.webp 1600w`).

- [ ] **Step 1: Teste de paridade (falha primeiro).** `npm run test:parity -- --grep hero`. Esperado: **FALHA** (margem, padding, descrição, alturas, como na tabela C2).
- [ ] **Step 2: Teste de comportamento.** `hero.spec.mjs`: existe `.np-tiles` com `transform` 3D (`matrix3d`); `getComputedStyle('h1').animationName === 'np-h1shine'` e `backgroundClip === 'text'`; o `src` do retrato termina em `hero-nayana-1600.webp` (≥768) e a escolha muda para `-900` abaixo disso; em 390px `[data-layout="stacked"]` e véu embaixo; redimensionar 1440→390→1440 sem sobra de faixa nem erro (Review Focus 4).
- [ ] **Step 3: Substituir o markup e apagar o CSS próprio**; mover o `<script src="…napele-tiles.js">` para o fim do `<body>` do Layout se ainda não estiver.
- [ ] **Step 4: Rodar paridade e comportamento.** Esperado: **PASSA** nos 4 viewports.
- [ ] **Step 5: Verificação visual.** Screenshots 1440 e 390 lado a lado com `/assets/overview/index.html`; conferir degradê do título com o brilho passando, botão com o gradiente dourado, parede inclinada se movendo devagar.
- [ ] **Step 6: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 4: Faixa de tratamentos (marquee)

**Referência:** `index.html` linhas 208–226. Sistema → *Faixa e passagem* e *Tamanho*: `.np-marquee` com **56px | 56px | 46px** de altura, logo abaixo do hero; passagem do escuro para o creme na borda (ato 1 → 2). Momento de assinatura: **a rolagem da própria faixa**.

**Files:** Modify `src/components/Marquee.astro` (markup literal; o `<script>` sai, o Layout já carrega `napele-marquee.js`); Test `tests/behavior/marquee.spec.mjs`.

- [ ] **Step 1: Paridade (`--grep marquee`).** Hoje só difere o `transform` da trilha (dependente do tempo) → o harness ignora `transform`; esperado **PASSA**.
- [ ] **Step 2: Comportamento.** Altura 56px (≥768) e 46px (≤767); o `transform` de `.np-marquee__track` muda em 1 s; com `reducedMotion` a faixa fica parada; os 13 itens existem na ordem do original (Toxina botulínica … Hidratação e regeneração labial).
- [ ] **Step 3: Rodar. Conferir a olho** a borda dourada/escuro→creme com o hero.
- [ ] **Step 4: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 5: Tratamentos (ato 2 · Oferta)

**Referência:** `index.html` linhas 228–601. Sistema → *Tamanho das seções* (Tratamentos) e *Textura* (grão branco).

**Spec do DS:** cabeçalho 55% | 48%; seção `100svh`; espaços de 64px (faixa→título e título→cards); cards com **75% da altura que preencheria a tela**, de 475 a 720px, **largura = altura × 0,758** (foto 720×950), 370px no celular; carrossel centralizado (3 cards no centro, vizinhos iguais), setas centralizadas 24px abaixo dos cards; grão branco `.np-grain-white` sobre o creme (`::after` com `texture/noise-white.png`, `opacity: 1`). Momento de assinatura: o carrossel, movido pelo visitante.

**Files:** Modify `src/components/Treatments.astro` (markup literal **com** `data-settings` e `data-e-type`; **apagar** o `<script>` do Swiper manual e o `<script src=swiper>` duplicado); Test `tests/behavior/treatments.spec.mjs`.

**Interfaces:** Consumes Elementor frontend (D1) + `napele-procedures.js`. Os links dos cards ficam como estão hoje (D3).

- [ ] **Step 1: Paridade (`--grep tratamentos`).** Esperado: **FALHA** (99 diferenças hoje, quase todas de largura de card por causa do Swiper manual).
- [ ] **Step 2: Teste do carrossel.** Ler `carousel.swiper.params` e esperar: `slidesPerView` 3.001 em ≥1024px, 2 entre 767 e 1023, 1 abaixo; breakpoints `{0:1, 767:2, 1024:3.001}`; `loop: true`; `speed: 600`; `spaceBetween: 15`; `autoplay.delay: 3000` com pausa no hover/interação; classe `offset-right`; 27 slides contando os clones; larguras 1023/1024/1025 e 766/767/768 trocam de modo no pixel certo (Review Focus 1).
- [ ] **Step 3: Teste de tamanhos e textura.** Altura do card dentro de 475–720px e `largura/altura ≈ 0,758`; `.np-fit` presente (aplicado por `napele-procedures.js`); `getComputedStyle(secao,'::after')` com `backgroundImage` contendo `noise-white.png`; setas clicam e o carrossel anda; sem faixa vazia ao redimensionar rolado.
- [ ] **Step 4: Substituir markup, restaurar atributos, apagar o Swiper manual.**
- [ ] **Step 5: Rodar tudo.** Esperado: **PASSA** em 1440 e 1024; conferir 768 e 390 à vista.
- [ ] **Step 6: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 6: A clínica — passeio e galeria (ato 3 · Imersão)

**Referência:** bloco `.np-clinic` (entre o fim de `#tratamentos` e `.np-gallery`, linhas ≈519–602) e `index.html` 603–616 (`.np-gallery`). Sistema → *Clínica*, *A clínica · passeio ao rolar*, *Galeria · tablet e celular*.

**Spec do DS:**
- Fundo `--np-dark` + `bg_about.svg` (cover, center), `border-top: 1px #AB905426` + grão `.bg`; título em degradê dourado **sem** brilho; texto creme `rgba(243,239,236,.86)`; chip claro (fundo `rgba(243,239,236,.08)`, borda .24, texto `--np-gold-300`).
- Passeio (`napele-clinic.js`): seção `position: sticky` por **45vh** de crescimento + passeio (`data-pace`) + **30vh** de pausa; moldura 16:9 centralizada, 60% da largura (máx. 1120px); o card cresce e vira moldura de vídeo; `passeio.mp4` (1280×720) / `passeio-m.mp4` (854×480, até 899px); legendas 0:00 Chegada, 0:04 Letreiro, 0:11 Recepção, 0:19 Sala de espera, 0:24 Corredor, 0:29 Sala 1, 0:35 Sala 2, 0:41 Venha conhecer; "Pular passeio". Momento de assinatura: **o passeio guiado pela rolagem**.
- ≤1024px: a grade some e entra `.np-gallery` (8 fotos 16:9, 2 colunas, raio 16px, vão 12px), `--np-tail` medido por `napele-clinic.js`; tocar numa foto abre o lightbox.
- `prefers-reduced-motion`: versão estática.

**Files:** Modify `src/components/Clinic.astro` (markup literal, **preservando a classe colada** `elementor-element-b2491c2elementor-widget__width-initial` e `…dac6c1d elementor-widget__width-initialelementor-hidden-tablet`: **não "corrigir"**, C7; o Layout já carrega os scripts; remover os `<script>` duplicados); Test `tests/behavior/clinic.spec.mjs`.

- [ ] **Step 1: Paridade (`--grep clinica`, `--grep galeria`).** Medi 8 diferenças hoje, parte delas fallbacks `noscript` que o harness ignora. O que sobrar deve ser explicado pelo markup (C7) ou pelo overflow (C1); se sobrar algo sem explicação, investigar antes de seguir.
- [ ] **Step 2: Teste do sticky.** Com o pré-loader encerrado, rolar para 10%, 40% e 70% da altura da seção: o palco fixado fica com `getBoundingClientRect().top === 0` nos três; `video.currentTime` cresce monotonicamente com a rolagem; no fim a moldura volta ao fluxo normal. Repetir com `reducedMotion`: sem vídeo "scrubado", versão estática.
- [ ] **Step 3: Teste de galeria/lightbox (Review Focus 5).** Em 1024px: 8 fotos em 2 colunas; clicar abre `.np-lb`; `Esc` fecha e o foco volta à foto; setas e swipe de 55px navegam; `np-nav-away` na navbar enquanto aberto; "Pular passeio" termina no começo da galeria.
- [ ] **Step 4: Âncora (Review Focus 3).** Ir a `/#sobre-a-clinica` direto: a seção aparece abaixo da navbar, sem salto.
- [ ] **Step 5: Substituir o markup e remover scripts duplicados.**
- [ ] **Step 6: Rodar tudo.** Esperado: **PASSA**. Conferir o passeio inteiro à vista, 1440 e 390.
- [ ] **Step 7: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 7: Resultados (ato 4 · Prova)

**Referência:** `index.html` linhas 618–647. Sistema → *Resultados*: fundo creme (registro clínico), faixa de fotos de **260×u** de altura, título com destaque em **ouro 700**, deriva lenta da faixa (**pausa no hover e no toque**, é o movimento de assinatura), lightbox escuro.

**Files:** Modify `src/components/Results.astro` (markup literal, 20 fotos com `data-full="…-lg.webp"`; remover o `<script>`); Test `tests/behavior/results.spec.mjs`.

- [ ] **Step 1: Paridade (`--grep resultados`).** Hoje 0 diferenças; esperado **PASSA** (mantém o piso).
- [ ] **Step 2: Comportamento.** O `transform` da faixa muda com o tempo; fica parado com o mouse em cima; clicar numa foto abre `.np-lb` (escuro) com a versão `-lg`; `Esc`/clique fora/swipe fecham; `np-nav-away` enquanto aberto; o fundo não rola (Review Focus 5).
- [ ] **Step 3: Rodar. Conferir a olho** em 1440 e 390.
- [ ] **Step 4: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 8: Doutora (ato 4 · Prova)

**Referência:** `index.html` linhas 649–705. Sistema → *Card da doutora + chips flutuantes*: imagem com raio 20px, chips absolutos sobre a imagem com animação `.flutua` (momento de assinatura), coluna da imagem **47% | 70%**; texturas do creme (`background-min`, opacidade .2, `multiply`, e o grão).

**Files:** Modify `src/components/Doctor.astro` (markup literal; `loading="lazy"` do Astro **sai** onde o original não tem); Test `tests/behavior/doctor.spec.mjs`.

- [ ] **Step 1: Paridade (`--grep doutora`).** Medi 3 diferenças hoje (um fallback `noscript` e a fase da animação dos chips; o harness ignora os dois); esperado **PASSA**.
- [ ] **Step 2: Comportamento.** Os dois chips têm `animationName` `flutua` e `transform` muda entre dois instantes; `::before` da seção traz `background-min` com `opacity .2` e `mix-blend-mode: multiply`; colunas 47% (≥1025) e 70% (tablet).
- [ ] **Step 3: Rodar. Conferir a olho.**
- [ ] **Step 4: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 9: Dúvidas frequentes (ato 4 · Prova)

**Referência:** `index.html` linhas 707–728. Sistema → *Dúvidas frequentes*: cabeçalho (chip + título 45px) e **4 cartões brancos numa coluna de 860px**; fio dourado a 20% no começo; fechado: contorno 1px ouro a 22% e `+` em ouro 700; aberto (um por vez): contorno ouro, pergunta em ouro 700, `+` gira 90° até virar ×; painel abre animando `grid-template-rows` de `0fr` a `1fr` em **0,45s**; sem o script todas as respostas ficam abertas; no celular respiro de 18px e pergunta em 16px.

**Files:** Modify `src/components/Faq.astro` (markup literal; remover `<script>`); Test `tests/behavior/faq.spec.mjs`.

- [ ] **Step 1: Paridade (`--grep faq`).** Hoje 0; esperado **PASSA**.
- [ ] **Step 2: Comportamento.** `.is-js` na seção; abrir uma resposta fecha a anterior; `transition-duration` do painel `0.45s`; `aria-expanded` correto; teclado (Enter/Espaço) abre; bloqueando `napele-faq.js` todas as respostas aparecem abertas.
- [ ] **Step 3: Rodar. Conferir a olho** em 1440 e 390.
- [ ] **Step 4: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 10: Como chegar (ato 5 · Convite)

**Referência:** `index.html` linhas 730–755. Sistema → *Como chegar*: fundo escuro, cartão com o endereço à esquerda e o mapa à direita; o cartão "sobe um degrau do escuro" (creme a 6%) com filete de ouro a 16%; o painel de ouro atrás do terço direito do mapa vem do botão primário; **sem movimento**.

**Files:** Modify `src/components/Visit.astro` (markup literal com o `<iframe>` do Google Maps do original e o link "Como chegar"); Test `tests/behavior/visit.spec.mjs`.

- [ ] **Step 1: Paridade (`--grep visita`).** Hoje 0; esperado **PASSA**.
- [ ] **Step 2: Comportamento.** Nenhuma animação em execução na seção (`getAnimations()` vazio); `iframe` do mapa presente e com `title`; o botão abre `https://www.google.com/maps/dir/?api=1&destination=Napele%20Cl%C3%ADnica%20An%C3%A1polis` em nova aba (`rel="noopener"`); `/#como-chegar` direto leva à seção abaixo da navbar (Review Focus 3).
- [ ] **Step 3: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 11: Chamada final e Rodapé (ato 5 · Convite)

**Referência:** `index.html` linhas 757–873. Sistema → *Chamada final* e *Rodapé*.

**Spec do DS:** CTA com foto `backound-sessions/recepcao-clinica-napele-panoramica.webp` + véu `--np-dark` a **62%** (`--np-cta-veil`); cartão `--np-dark` a **93%**, raio 20px, 620px; H2 Aeonik 500 em degradê dourado; linha em creme a 78%; botão dourado, **o único que pulsa** (brilho e halo). Rodapé: fundo `--np-dark` + grão `.bg`; colunas **23% | 17% | 17%**; menu de tratamentos e menu mobile (dropdown).

**Files:** Modify `src/components/Footer.astro` (markup literal, incluindo o widget HTML `fa83a6e` com `<div class="bg"></div>`, o elemento `<footer>` e o menu dropdown; **remover** `napele-contact.js`/`napele-reveal.js` duplicados), `src/pages/index.astro` se a ordem mudar; Test `tests/behavior/footer.spec.mjs`.

- [ ] **Step 1: Paridade (`--grep cta`) e teste do grão.** Medi 1 diferença no CTA hoje (ainda não investiguei qual) e o `.bg` ausente. Esperado: **FALHA** — `document.querySelector('.bg')` nulo no Astro.
- [ ] **Step 2: Teste do grão (rodapé e site todo).** `.bg` existe uma vez; `position: fixed`, `zIndex 100`, `opacity 0.4`, `pointerEvents none`, `backgroundImage` contendo `noise-01.webp`, `width` 150% da janela; o grão aparece sobre as seções (screenshot de uma região escura, como na aba Sistema → *Textura e grão*: ruído ±1,3 níveis sobre o escuro).
- [ ] **Step 3: Comportamento do CTA.** O botão do CTA tem animação em execução (`getAnimations().length > 0`) e é o **único** botão da página com isso; com `reducedMotion` fica parado; foto e véu: `background-image` contém `recepcao-clinica-napele-panoramica.webp`.
- [ ] **Step 4: Rodapé.** `footer[data-elementor-type="footer"]` presente; menu mobile abre em ≤767px; os links de WhatsApp, Instagram e mapa batem com o original.
- [ ] **Step 5: Substituir markup, rodar tudo.** Esperado: **PASSA**.
- [ ] **Step 6: Commit** (com OK).

**PARE** e peça aprovação.

---

## Tarefa 12: Verificação final e limpeza

**Files:** Delete (com seu OK): `src/components/Welcome.astro`, `src/assets/astro.svg`, `src/assets/background.svg`, `public/assets/scratch/`, `public/assets/slogan.svg`, `public/assets/slogan-mobile.svg` se nada os referenciar; Modify `README.md` (seção "Como manter a paridade com o DS": `npm run ds:sync`, `ds:check`, `test:parity`).

**Orçamento de movimento (Sistema → Movimento), conferir uma linha por seção:**

| Seção | Momento de assinatura | Ambiente (não conta) |
|---|---|---|
| Pré-loader e hero | revelação do pré-loader e depois o brilho do título | parede de fotos inclinada |
| Faixa | rolagem da própria faixa | — |
| Tratamentos | carrossel movido pelo visitante | — |
| Clínica | passeio guiado pela rolagem | — |
| Resultados | deriva lenta da faixa (pausa no hover/toque) | — |
| Doutora | os dois chips flutuantes | — |
| Chamada final | brilho e halo do botão dourado (o único que pulsa) | — |

- [ ] **Step 1: Paridade total.** `npm run test:parity` nos 4 viewports. Esperado: **PASSA** em todas as 10 seções.
- [ ] **Step 2: Comportamento total.** `npm run test:behavior`. Esperado: **PASSA**.
- [ ] **Step 3: Desvio.** `npm run ds:check`. Esperado: sem arquivos diferentes; extras só os já aprovados.
- [ ] **Step 4: Build.** `npm run build` e `npx astro preview`; repetir a paridade contra o `preview` (scripts `is:inline`/`defer` se comportam igual fora do `dev`).
- [ ] **Step 5: Movimento.** Com `claude-in-chrome`, percorrer a página inteira rolando e conferir a tabela acima; nada além disso se mexe sozinho. Repetir com `prefers-reduced-motion`.
- [ ] **Step 6: Rede.** Playwright: zero 404 e zero erro de console além dos que o Overview original já tem. **Remover o filtro temporário de "chunks do Elementor"** em `tests/behavior/foundation.spec.mjs` (ele existe só até todas as seções voltarem a ter `data-e-type`/`data-settings`).
- [ ] **Step 7: Entrega.** Mostrar os screenshots finais (1440 e 390) lado a lado com o Overview e fechar a tabela de aprovações.

---

## Registro de aprovações (uma seção por vez)

| Tarefa | Seção | Paridade | Comportamento | Visual | Aprovada pelo usuário |
|---|---|---|---|---|---|
| 0 | Fundação | ☐ | ☐ | — | ☐ |
| 1 | Pré-loader | — | ☐ | ☐ | ☐ |
| 2 | Header | ☐ | ☐ | ☐ | ☐ |
| 3 | Hero | ☐ | ☐ | ☐ | ☐ |
| 4 | Faixa | ☐ | ☐ | ☐ | ☐ |
| 5 | Tratamentos | ☐ | ☐ | ☐ | ☐ |
| 6 | A clínica + galeria | ☐ | ☐ | ☐ | ☐ |
| 7 | Resultados | ☐ | ☐ | ☐ | ☐ |
| 8 | Doutora | ☐ | ☐ | ☐ | ☐ |
| 9 | FAQ | ☐ | ☐ | ☐ | ☐ |
| 10 | Como chegar | ☐ | ☐ | ☐ | ☐ |
| 11 | CTA + Rodapé | ☐ | ☐ | ☐ | ☐ |
| 12 | Final | ☐ | ☐ | ☐ | ☐ |

## Decisões que preciso de você

1. **Playwright para os testes de paridade.** Recomendo: `@playwright/test` como devDependency e `npx playwright install chromium` (download de ~150 MB do site da Playwright). A alternativa é verificar tudo manualmente com o Chrome (mais lento e sem regressão automática).
2. **Links dos cards de tratamento** (D3): manter os `#…` atuais por enquanto, ou já planejar a página modelo `tratamento.html`?
3. **Limpeza** (Tarefa 12): posso apagar os arquivos de template do Astro e `public/assets/scratch/` (screenshots de uma sessão anterior)?

## Estado da execução (atualizado em 2026-11-13)

| Tarefa | Situação |
|---|---|
| 0 Fundação | Concluída. |
| 3 Hero | Concluída: markup literal (`node scripts/extract-overview.mjs hero src/components/Hero.astro`), sem CSS próprio, retrato por `srcset` 900/1600 via `napele-tiles.js`; header original oculto como espaçador (o hero tem `margin-top:-120px`). Paridade do hero verde nos 4 tamanhos de tela. O véu do hero já era idêntico ao do design system. |
| 5 Tratamentos | Concluída: markup literal com `data-settings`; o carrossel tem a mesma configuração do Overview (testada); `#tratamentos` com `scroll-margin-top: var(--np-nav-h-scrolled)`. |
| 2 Header | Concluída: sem script próprio, `ul#ds-tabs`, ícones sem URL (o `napele-contact.js` é o único dono de WhatsApp/telefone/redes e está vazio no design system), `report()` no `napele-site.js`. Navbar idêntica à do design system no topo, rolada e no menu do celular (oráculo: `design-sistem-napele.html`). |
| Elementor | Scripts síncronos e em ordem no fim do `<body>`: com `defer`, o carrossel de tratamentos deixava de inicializar quando um script do Elementor Pro demorava (card gigante). Coberto por 4 testes que atrasam cada script. |
| 11 Rodapé | Rodapé concluído (cópia fiel, inclui o grão global `.bg`). Falta a chamada final (CTA). |
| 1, 2, 4, 6, 7, 8, 9, 10, 12 | Pendentes. A paridade de `clinica` em ≤1024px falha por causa da classe colada `elementor-widget__width-initial` (Tarefa 6). |

Ferramentas novas: `scripts/extract-overview.mjs` (gera os componentes a partir do `index.html` do design system), `tests/behavior/{hero,grain,treatments}.spec.mjs`, paridade do rodapé e "aquecimento" das páginas no harness (o original só troca os placeholders do lazy-load ao rolar).
