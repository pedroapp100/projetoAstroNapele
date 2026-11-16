# Ícones no rodapé + versão nos arquivos do site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar Instagram, WhatsApp e Localização no rodapé (home e tratamentos), iguais aos do topo, e fazer todo CSS/JS `napele*` sair com `?v=<hash do conteúdo>` para o cache de 1 ano não prender versões antigas.

**Architecture:** O rodapé é editado no design system (`overview/index.html`, `overview/tratamento.html`, `napele.css`), sincronizado para `public/` e regerado nos dois componentes Astro. A versão por conteúdo é calculada no `Layout.astro` (SHA-1 de `public/assets/<arquivo>`).

**Tech Stack:** Astro 7, Playwright (Chrome), Node (`node:crypto`).

**Spec:** `docs/superpowers/specs/2026-11-16-rodape-icones-design.md`

## Global Constraints

- Design system primeiro: editar `design-sistem-napele/`, depois `npm run ds:sync`; `npm run ds:check` termina com "OK: public/ espelha o design system."
- Ícones, nesta ordem: Instagram, WhatsApp, Localização. **Sem** TikTok e sem YouTube.
- Instagram sem endereço = sem `href` e `aria-disabled="true"` (nunca `href="#"`). WhatsApp abre `https://wa.me/<número>` (o de `napele-contact.js`). Localização: `https://www.google.com/maps/dir/?api=1&destination=Napele%20Cl%C3%ADnica%20An%C3%A1polis`, `target="_blank"`.
- `napele-contact.js` não muda. Hash = SHA-1 hexadecimal, 8 primeiros caracteres, de `public/assets/<arquivo>`.
- `vercel.json`, `vendor/gsap.min.js` e `overview/wp-*` não mudam.

## Review Focus

- Visitante com cache antigo: a URL do arquivo muda quando o conteúdo muda (teste compara o `?v=` com o hash do arquivo em disco).
- Rodapé da página de tratamento (o `Layout` é o mesmo, o componente não): os 3 ícones aparecem lá também.
- Instagram sem endereço: aparece, sem link, sem `href="#"`.
- Celular de 390 px: os 3 ícones cabem numa linha e a página não ganha rolagem horizontal.
- Scripts que leem `script.src` (preloader, tiles, contact) continuam funcionando com `?v=`: roda-se `preloader-logo.spec.mjs` e `clinic-video.spec.mjs`.

---

### Task 1: Versão por conteúdo nos arquivos `napele*`

**Files:**
- Modify: `src/layouts/Layout.astro` (frontmatter + linhas 142–146 e 173)
- Modify: `tests/behavior/foundation.spec.mjs:59-63` (seletor `src$=` → `src*=`)
- Test: `tests/behavior/asset-version.spec.mjs` (novo)

**Interfaces:**
- Produces: `ver(file: string): string` no frontmatter do `Layout.astro`: lê `public/assets/<file>` e devolve `?v=<8 hex>`.

- [ ] **Step 1: Escrever o teste que falha** — `asset-version.spec.mjs`, para `/` e `/tratamentos/toxina-botulinica/` (com `reducedMotion: 'reduce'`): todo `link[rel=stylesheet]` e `script[src]` cujo caminho começa por `/assets/napele` tem `?v=` igual a `createHash('sha1').update(readFileSync('public/assets/<nome>')).digest('hex').slice(0, 8)`; a lista não é vazia (≥ 4 itens na home).
- [ ] **Step 2: Rodar e ver falhar** — `npx playwright test tests/behavior/asset-version.spec.mjs --project=desktop`. Esperado: FAIL (sem `?v=`).
- [ ] **Step 3: Implementar `ver()` e usá-la** em `napele.css`, `napele-preloader.css`, `napele-site.js`, `napele-preloader.js` e nos dois `.map()` de `napeleScripts`/`treatmentScripts`. Sem cache em memória (o `dev` lê o arquivo a cada render).
- [ ] **Step 4: Ajustar `foundation.spec.mjs`** para `script[src*="/assets/${n}"]` (a contagem continua 1 por script).
- [ ] **Step 5: Rodar** `asset-version`, `foundation`, `preloader-logo`, `clinic-video` em `desktop` e `mobile`. Esperado: tudo passa.
- [ ] **Step 6: Commit** — `git add src/layouts/Layout.astro tests/behavior/asset-version.spec.mjs tests/behavior/foundation.spec.mjs && git commit -m "Cache: arquivos napele* saem com ?v=<hash do conteúdo>"`

### Task 2: Ícones no rodapé (design system → site)

**Files:**
- Modify: `design-sistem-napele/assets/overview/index.html:894-~912`, `design-sistem-napele/assets/overview/tratamento.html:437-~455` (trocar `.elementor-social-icons-wrapper` por `.np-foot-social`)
- Modify: `design-sistem-napele/assets/napele.css:1117-1151` (bloco "Footer social icons" → regra de `.np-foot-social`)
- Regenerate: `src/components/Footer.astro`, `src/components/TreatmentFooter.astro`; sincronizar `public/` com `npm run ds:sync`
- Test: `tests/behavior/footer-icons.spec.mjs` (novo)

**Interfaces:**
- Produces: `<div class="np-foot-social">` com 3 `<a class="np-icon">` (`data-np-icon="instagram"`, `data-np-icon="whatsapp"`, e a localização com `href`/`target`/`rel`), cada um com `aria-label` ("Instagram da Napele Clínica", "WhatsApp da Napele Clínica", "Como chegar à Napele Clínica") e o `<svg viewBox="0 0 24 24" aria-hidden="true">` inteiro, copiado do sprite do `Layout.astro` (linha 156).

- [ ] **Step 1: Escrever o teste que falha** — `footer-icons.spec.mjs`, em `/` e `/tratamentos/toxina-botulinica/`, desktop e mobile, `reducedMotion: 'reduce'`: (a) `footer[data-elementor-type="footer"] a.np-icon` são exatamente 3, visíveis (caixa ≥ 16 px), com `aria-label` na ordem Instagram, WhatsApp, Como chegar; (b) nenhum `[data-np-contact="tiktok"]`, `[data-np-contact="youtube"]` nem `.elementor-social-icon` no rodapé; (c) WhatsApp: `href` casa `^https://wa\.me/\d+\?text=`, `target=_blank`; (d) localização: `href` contém `google.com/maps/dir`; (e) Instagram: sem `href` e `aria-disabled="true"`, ou `href` começando por `https://`, nunca `#`; (f) cor computada do ícone do rodapé = cor computada do ícone `.np-nav-social a.np-icon` do topo; (g) no celular, `document.documentElement.scrollWidth <= window.innerWidth`.
- [ ] **Step 2: Rodar e ver falhar** — esperado: FAIL (0 ícones `.np-icon` no rodapé).
- [ ] **Step 3: Editar os dois HTMLs do design system** e **`napele.css`** (a nova regra: `display:flex; align-items:center`, espaçamento e alinhamento pela margem negativa que `.np-icon` pede para alinhar o desenho com o texto; sem tocar no resto do rodapé). Ajustar a olho num screenshot de desktop e de celular.
- [ ] **Step 4: Sincronizar e regerar** — `npm run ds:sync`, `node scripts/extract-overview.mjs footer src/components/Footer.astro`, `node scripts/extract-treatment.mjs footer src/components/TreatmentFooter.astro`; conferir com `git diff --stat` que só o bloco social mudou nos dois componentes.
- [ ] **Step 5: Rodar** `footer-icons` + `asset-version` + `foundation` em `desktop` e `mobile`, mais `tests/parity/section.spec.mjs -g footer` e `npm run ds:check`. Esperado: tudo passa (a paridade `clinica` no celular já falhava antes e não entra).
- [ ] **Step 6: Commit** — `git add design-sistem-napele public src tests docs && git commit -m "Rodapé: ícones de Instagram, WhatsApp e localização, iguais aos do topo"`

### Task 3: Verificação final e sincronização com o GitHub

- [ ] **Step 1:** rodar a suíte de comportamento inteira e a paridade em `desktop` e `mobile`; comparar com a linha de base (só `paridade: clinica` no celular falha). `npm run build` termina sem erro.
- [ ] **Step 2:** `git pull` (esperado: sem conflito). **Não** fazer `git push` sem o dono confirmar: é o que publica em produção.

### Task 4 (acrescentada): erros de chunk do Elementor

O dono pediu para acabar com os ~150 erros do console (3 módulos do Elementor que o export não traz: `background-video`, `background-slideshow`, `text-editor`; 403 na Vercel) e depois "aplicar a correção e publicar". O Elementor consulta `window.__elementorChunks[nome]` antes de ir à rede e espera `{ default: ClasseDoHandler }`; `public/assets/napele-site.js` (o adaptador do site, carregado antes do Elementor) registra os três como um handler que não faz nada. A página não usa vídeo/slideshow de fundo nem capitular (medido). Teste: `tests/behavior/elementor-chunks.spec.mjs` (zero pedidos a `/js/chunks/`, zero erros de chunk, o módulo é instanciável, o carrossel Swiper continua inicializado), visto falhar antes e passar depois.
