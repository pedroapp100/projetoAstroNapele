# Páginas de tratamento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 13 páginas `/tratamentos/<slug>/` idênticas ao modelo do design system (`tratamento.html?t=<slug>`), e os cards da home levando até elas.

**Architecture:** O modelo do design system vira dois componentes Astro gerados por script (`TreatmentHero`, `TreatmentSections`), com o texto de cada tratamento entrando por expressões `{t.…}` no build. Os dados vêm de `public/assets/treatments.js` (fonte única, lida no build via `node:vm`). `Layout.astro` ganha a variante `treatment` (sem pré-loader, só os scripts do modelo). Um componente `Rebase` reescreve as âncoras `#x` para `/#x`, para navbar, botões e rodapé levarem à home.

**Tech Stack:** Astro 7 (`getStaticPaths`), Playwright (`channel: 'chrome'`), `napele.css` e `napele-*.js` do design system (sem alterá-los).

**Spec:** `docs/superpowers/specs/2026-11-14-paginas-tratamentos-design.md`. Complementa `docs/superpowers/plans/2026-11-13-napele-fidelidade-design-system.md` (o harness de paridade e o Layout vêm dele).

## Global Constraints

- `design-sistem-napele/` é somente leitura; `public/assets` espelha `design-sistem-napele/assets` (`npm run ds:check` continua limpo; nada novo em `public/assets`).
- Nenhum CSS/JS novo sobrescreve `napele.css`; sem `!important` novo.
- Rota `/tratamentos/<slug>/`; slug inexistente = 404 (o modelo cai no primeiro tratamento; o site não).
- `<title>` = `<name> · Napele Clínica` (igual ao `napele-treatment.js`); `<meta description>` = `intro` do tratamento; `<h1>` = `name`; `<body data-treatment="<slug>">`.
- Hero da página: `h1` = `name`, `p` = `intro`. "Conheça o procedimento": `h2` = `about.title`, parágrafos de `about.text` separados por `<br><br>`, foto `/assets/treatments/<photo>`, `alt` = `name`. "Para quem é": `h2` = `<name>: para quem é indicado`, 4 cards `{title, text}`.
- Nenhum texto lorem do modelo pode chegar ao site; um tratamento sem `about` ou sem 4 cards derruba o build.
- Body: classe `np-treatment` (sem `home`, sem `np-pre-hold`), `data-view="tratamentos"` (a navbar fica sempre escura, como no design system). Sem pré-loader.
- Scripts da variante `treatment`: `napele-site.js` (head), cadeia do Elementor, e `napele-tiles.js`, `napele-nav.js`, `napele-contact.js` (só esses três do design system).
- Botão: **Agendar Avaliação**. Servidor: `astro dev --background`, `http://localhost:4321`.
- Sem commits neste plano: o repositório não tem nenhum commit e o commit inicial fica para o OK do usuário.

## Review Focus

1. `/tratamentos/nao-existe/` devolve 404 (não cai em outro tratamento). → Task 3.
2. Sem JavaScript o texto já está no HTML (título, `h1`, descrição, 4 cards): é o motivo de não usar `?t=`. → Task 3.
3. Nenhum link da página de tratamento fica como âncora morta: logo, menu, botões "Agendar Avaliação" e rodapé levam a `/` ou `/#…`; "Tratamentos" aparece ativo no menu. → Task 3.
4. Títulos longos em 390px ("Hidratação e regeneração labial", cards de até ~40 caracteres) sem rolagem horizontal nas 13 páginas. → Task 5.
5. `/tratamentos/<slug>` sem a barra final também abre (200), e todo card da home leva a uma página que existe. → Tasks 3 e 4.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/treatments.mjs` (novo) | `loadTreatments()`: lê e valida `public/assets/treatments.js` |
| `src/lib/rebase.mjs` (novo) | `rebaseAnchors(html, base)` |
| `src/components/Rebase.astro` (novo) | Renderiza o slot e aplica `rebaseAnchors` |
| `scripts/extract-treatment.mjs` (novo) | Extrai hero e seções do modelo e troca o texto por slots `{t.…}` |
| `src/components/TreatmentHero.astro`, `TreatmentSections.astro` (gerados) | Markup do modelo com slots |
| `src/pages/tratamentos/[slug].astro` (novo) | Rota estática das 13 páginas |
| `src/layouts/Layout.astro` | Prop `variant` (`'home'` padrão, `'treatment'`) e `treatment` |
| `src/components/Header.astro` | Prop `current` (`'home'` padrão, `'tratamentos'`) |
| `scripts/extract-overview.mjs`, `src/components/Treatments.astro` | Links dos cards: `#tratamento-<slug>` → `/tratamentos/<slug>/` |
| `tests/unit/*.spec.mjs`, `tests/behavior/treatment-pages.spec.mjs`, `tests/parity/treatment.spec.mjs` (novos) | Testes |
| `tests/parity/harness.mjs` | Exporta `collectInPage`; novo `diffTreatment` |

---

## Task 1: Dados dos tratamentos

**Files:** Create `src/lib/treatments.mjs`; Test `tests/unit/treatments.unit.spec.mjs`

**Interfaces:**
- Produces: `loadTreatments(file?: string): { list: Treatment[]; find(slug: string): Treatment | null }` com `Treatment = { slug, name, group, groupLabel, photo, intro: string, about: { title: string, text: string[] }, forWhom: { title: string, text: string }[] }`. `file` padrão: `public/assets/treatments.js` a partir de `process.cwd()`. Executa o script em `node:vm` com `{ window: {} }` e lê `window.NAPELE_TREATMENTS`. Normaliza `about.text` string para array, card string para `{ title: '', text }`, `intro` ausente para `defaultIntro`. Lança `Error('tratamento <slug>: <campo> ausente')` se faltar `about.title`, `about.text` ou menos de 4 cards.

- [ ] **Step 1: Escrever o teste.** `treatments.unit.spec.mjs`: (a) `list.length === 13` e o primeiro slug é `toxina-botulinica`; (b) todo item tem `intro`, `about.title`, `about.text` (array não vazio) e `forWhom.length === 4` com `title` e `text` preenchidos; (c) `find('preenchimento-com-acido-hialuronico').about.title === 'Volume e contorno com ácido hialurônico'`; (d) `find('nao-existe') === null`; (e) com um arquivo temporário cujo único tratamento não tem `about`, `loadTreatments(tmp)` lança uma mensagem contendo `about`.
- [ ] **Step 2: Rodar** `npx playwright test tests/unit/treatments.unit.spec.mjs --project=desktop`. Esperado: FALHA (módulo não existe).
- [ ] **Step 3: Implementar** `loadTreatments` em `src/lib/treatments.mjs` como descrito acima.
- [ ] **Step 4: Rodar o mesmo comando.** Esperado: PASSA.

## Task 2: Extração do modelo com slots

**Files:** Create `scripts/extract-treatment.mjs`, `src/components/TreatmentHero.astro`, `src/components/TreatmentSections.astro` (gerados); Modify `scripts/extract-overview.mjs`, `tests/parity/extract.unit.spec.mjs`; Test `tests/unit/extract-treatment.unit.spec.mjs`

**Interfaces:**
- Consumes: `extractBlock`, `transformMarkup` de `scripts/extract-overview.mjs`.
- Produces: `extractTreatmentToAstro(key: 'hero' | 'sections'): string` (componente Astro cujo frontmatter faz `const { t } = Astro.props;`) e CLI `node scripts/extract-treatment.mjs <hero|sections> <arquivo.astro>`. Origem: `design-sistem-napele/assets/overview/tratamento.html`; `hero` = marcador `data-elementor-id="11"` (wrapper `div.elementor-11` com o hero), `sections` = marcador `data-elementor-id="825"` (wrapper `div.elementor-825`). Slots (mesmos seletores do `napele-treatment.js`): `hero`: `h1` → `{t.name}`, `p.elementor-image-box-description` → `{t.intro}`; `sections`: widget `9a98fab` (`h2` → `{t.about.title}`, `p` → parágrafos de `t.about.text` com `<br /><br />` entre eles), `img` do widget `af0503e` (`src={`/assets/treatments/${t.photo}`}`, `alt={t.name}`, sem `srcset`/`sizes`), widget `10edd60` (`h2` → `{t.name}: para quem é indicado`), cards `11a5e25`, `809394d`, `2195691`, `a9914de` na ordem (`.elementor-icon-box-title span` → `{t.forWhom[i].title}`, `p` → `{t.forWhom[i].text}`). Cada slot tem de casar exatamente uma vez, senão lança `Error('slot não encontrado: <nome>')`.
- Altera `transformMarkup`: `tratamento.html?t=<slug>` vira `/tratamentos/<slug>/` (antes `#tratamento-<slug>`).

- [ ] **Step 1: Escrever os testes.** Em `extract-overview`'s spec, trocar o teste "links de tratamento viram âncoras" para esperar `href="/tratamentos/fios-de-pdo/"` (decisão anterior do usuário superada pela criação das páginas). Em `extract-treatment.unit.spec.mjs`: `extractTreatmentToAstro('hero')` contém `{t.name}` e `{t.intro}` e não contém `Referência em estética facial e corporal em Anápolis`; `'sections'` contém `{t.about.title}`, `{t.forWhom[3].text}`, `alt={t.name}`, e não contém `Velit esse`, `Excepteur sint`, `Quis nostrud`, `sala-de-rpp`, `srcset`; ambos não contêm `noscript` nem `data-rocket-location-hash`.
- [ ] **Step 2: Rodar** `npx playwright test tests/unit/extract-treatment.unit.spec.mjs tests/parity/extract.unit.spec.mjs --project=desktop`. Esperado: FALHA.
- [ ] **Step 3: Implementar** `scripts/extract-treatment.mjs` e a mudança em `transformMarkup`. Os slots usam um auxiliar `replaceOnce(markup, escopoMarcador, regex, novo)` que procura a partir do marcador do widget e falha se não casar.
- [ ] **Step 4: Gerar os componentes.** `node scripts/extract-treatment.mjs hero src/components/TreatmentHero.astro` e `node scripts/extract-treatment.mjs sections src/components/TreatmentSections.astro`. Rodar os testes do Step 2. Esperado: PASSAM.

## Task 3: Layout, Header, Rebase e a rota

**Files:** Create `src/lib/rebase.mjs`, `src/components/Rebase.astro`, `src/pages/tratamentos/[slug].astro`; Modify `src/layouts/Layout.astro`, `src/components/Header.astro`; Test `tests/unit/rebase.unit.spec.mjs`, `tests/behavior/treatment-pages.spec.mjs`

**Interfaces:**
- Consumes: `loadTreatments` (Task 1); `TreatmentHero`/`TreatmentSections` com prop `t` (Task 2).
- Produces: `rebaseAnchors(html: string, base = '/'): string`: só em tags `<a>`, `href="#"` → `href="<base>"` e `href="#x"` → `href="<base>#x"`; `<use href="#np-i-…">` e demais atributos ficam intactos. `Layout` aceita `variant?: 'home' | 'treatment'` e `treatment?: string` (vai para `data-treatment`). `Header` aceita `current?: 'home' | 'tratamentos'`: em `'tratamentos'`, o item "Tratamentos" recebe `current-menu-item`/`elementor-item-active`/`aria-current="page"` no lugar de "Início". A home não muda.

- [ ] **Step 1: Escrever os testes.** `rebase.unit.spec.mjs`: `<a href="#">`→`<a href="/">`, `<a class="x" href="#tratamentos">`→`href="/#tratamentos"`, `<use href="#np-i-pin">` intacto, `<a href="https://x">` intacto. `treatment-pages.spec.mjs` (com `reducedMotion: 'reduce'`, lê os dados com `loadTreatments()`), para cada tratamento: `page.goto('/tratamentos/<slug>/')` responde 200; `title === '<name> · Napele Clínica'`; `meta[name=description]` = `intro`; `h1` = `name`; `h2` de "Conheça" = `about.title`; imagem `.elementor-element-af0503e img` termina em `<photo>`; 4 títulos e 4 textos dos cards; corpo sem `/Velit esse|Excepteur sint|Quis nostrud|Aliquip ex/`; `body[data-treatment]` = slug; `html.np-pre-on`, `body.np-pre-hold` e `.np-pre` ausentes; sem `pageerror`, sem `console.error`, sem resposta 404. Mais: (i) `request.get('/tratamentos/fios-de-pdo/')` já traz no HTML bruto o `<h1…>Fios de PDO</h1>` e o título dos 4 cards; (ii) `/tratamentos/nao-existe/` responde 404; (iii) `/tratamentos/fios-de-pdo` (sem barra) responde 200; (iv) menu principal: hrefs `['/|Início', '/#tratamentos|Tratamentos', '/#sobre-a-clinica|A Clínica', '/#como-chegar|Como chegar']`, só "Tratamentos" com `aria-current="page"`; nenhum `a[href^="#"]` fora do sprite na página (`document.querySelectorAll('a[href^="#"]').length === 0`); (v) `.ds-nav` tem `np-nav-scrolled` no topo (navbar escura).
- [ ] **Step 2: Rodar** `npx playwright test tests/unit/rebase.unit.spec.mjs tests/behavior/treatment-pages.spec.mjs --project=desktop`. Esperado: FALHA.
- [ ] **Step 3: Implementar `rebase.mjs` e `Rebase.astro`** (`const html = await Astro.slots.render('default')`, saída `<Fragment set:html={rebaseAnchors(html)} />`).
- [ ] **Step 4: `Header.astro`:** prop `current` aplicada só nos 4 itens do `#ds-tabs` (linhas 59–72). Rodar `npx playwright test tests/behavior/header.spec.mjs --project=desktop` (a home segue passando).
- [ ] **Step 5: `Layout.astro`:** `variant`. Em `treatment`: lista de estilos do modelo (a de home sem swiper, `e-animation-float`, `e-swiper`, `nested-carousel`, `video`, `star-rating`, e com `widget-icon-box`, `widget-nested-accordion` depois de `post-6` e `post-825` depois de `post-11`, nessa ordem; os arquivos já existem em `public/assets/overview/wp-content`), sem `napele-preloader.css`/`gsap`/`napele-preloader.js`, classes do body do modelo (`np-treatment … page-id-825 … elementor-page-825`), `data-view="tratamentos"`, `data-treatment`, scripts do design system `['napele-tiles.js','napele-nav.js','napele-contact.js']`.
- [ ] **Step 6: Rota.** `src/pages/tratamentos/[slug].astro`: `getStaticPaths` mapeia `loadTreatments().list` para `{ params: { slug }, props: { t } }`; corpo: `Layout` (`variant="treatment"`, `title`, `description`, `treatment`) > `Rebase` > `Header current="tratamentos"`, `<main>` com `TreatmentHero t` e `TreatmentSections t`, `Footer`.
- [ ] **Step 7: Rodar os testes do Step 2 e `header.spec.mjs`.** Esperado: PASSAM. Conferir com `astro dev logs` que não há erro.

## Task 4: Cards da home levam às páginas

**Files:** Modify `src/components/Treatments.astro`; Test `tests/behavior/treatments.spec.mjs` (acrescentar)

- [ ] **Step 1: Escrever o teste.** Em `treatments.spec.mjs`: os cards de `#tratamentos .swiper-slide:not(.swiper-slide-duplicate) a` têm `href` igual ao conjunto `/tratamentos/<slug>/` dos 13 slugs de `loadTreatments()`, sem repetição e sem `#tratamento-`; clicar o card "Fios de PDO" chega em `/tratamentos/fios-de-pdo/` com `h1` "Fios de PDO".
- [ ] **Step 2: Rodar** `npx playwright test tests/behavior/treatments.spec.mjs --project=desktop -g "cards"`. Esperado: FALHA.
- [ ] **Step 3: Implementar.** Regenerar só os `href` de `Treatments.astro`: `node scripts/extract-overview.mjs tratamentos src/components/Treatments.astro` e conferir com `git diff --no-index` (ou `diff`) que só os 13 `href` mudaram; se algo além disso mudar, reverter e trocar `#tratamento-<slug>` por `/tratamentos/<slug>/` direto no arquivo.
- [ ] **Step 4: Rodar o teste do Step 2 e o arquivo inteiro** `tests/behavior/treatments.spec.mjs --project=desktop`. Esperado: PASSAM.

## Task 5: Paridade com o modelo e verificação final

**Files:** Modify `tests/parity/harness.mjs`; Create `tests/parity/treatment.spec.mjs`

**Interfaces:**
- Produces: `diffTreatment(page: Page, slug: string, viewport?: {width,height}): Promise<string[]>` (mesmo formato de `diffSection`): abre `/tratamentos/<slug>/` e `/assets/overview/tratamento.html?t=<slug>` com `settle(..., { warm: true })`, compara por caminho estrutural (`collectInPage`, agora exportado) os blocos `div.elementor-11`, `div.elementor-825` e `footer[data-elementor-type="footer"]`; prefixa cada linha com o bloco. `[]` = paridade. `ignore`: `transform` e `opacity` (fade do hero e deriva por rolagem).

- [ ] **Step 1: Escrever `treatment.spec.mjs` (com `reducedMotion: 'reduce'`).** Um teste de paridade por slug (`expect(diff).toEqual([])`), rodando todos os 13 em `desktop` e `mobile` e só `preenchimento-com-acido-hialuronico` e `hidratacao-e-regeneracao-labial` em `tablet-l` e `tablet` (`test.skip` pelo nome do projeto). Mais, por slug em `mobile`: `document.documentElement.scrollWidth <= window.innerWidth`.
- [ ] **Step 2: Rodar** `npx playwright test tests/parity/treatment.spec.mjs --project=desktop -g preenchimento`. Esperado: FALHA ou PASSA; se houver diferenças, o diff lista as propriedades.
- [ ] **Step 3: Zerar as diferenças** corrigindo a causa no Layout/componentes (nunca em `napele.css`/`napele-*.js`). Causas prováveis: regras `e-lazyloaded` do Elementor para a seção da Nayana, `<main>` extra, altura do hero antes do `napele-tiles.js`.
- [ ] **Step 4: Rodar** `npx playwright test tests/parity/treatment.spec.mjs`. Esperado: PASSA.
- [ ] **Step 5: Regressão e build.** `npx playwright test` (tudo) e `npm run ds:check` e `npm run build`. Esperado: testes verdes (ou as mesmas falhas anteriores já conhecidas, listadas na resposta), `ds:check` sem diferenças, build gera 14 páginas (`/` e `/tratamentos/<slug>/` × 13).
- [ ] **Step 6: Verificação visual.** Com `claude-in-chrome`: abrir `/tratamentos/preenchimento-com-acido-hialuronico/` a 1419px de largura e comparar com o print do usuário (hero escuro com a parede de rostos, título dourado, "Volume e contorno com ácido hialurônico" com a foto à esquerda); conferir também uma página em 390px.
