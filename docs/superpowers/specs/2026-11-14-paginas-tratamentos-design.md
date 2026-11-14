# Páginas de tratamento — design (curto)

Data: 2026-11-14 · Status: aprovado pelo usuário na conversa ("Já pode implementar!")

## Intenção e porquê
O gabarito (design system, aba **Tratamentos**) tem uma página-modelo por tratamento, `design-sistem-napele/assets/overview/tratamento.html?t=<slug>`, preenchida a partir de `assets/treatments.js` (13 tratamentos, todos com texto pronto). O site Astro só tem `/` e os cards da home apontam para âncoras mortas (`#tratamento-<slug>`). Objetivo: completar o site com as 13 páginas, idênticas ao gabarito. O plano anterior (`2026-11-13-napele-fidelidade-design-system.md`, decisão D3) deixou isso de fora; agora entra.

## Objetivos
- 13 páginas estáticas em `/tratamentos/<slug>/`, visualmente idênticas ao modelo do gabarito (hero só com texto, "Conheça o procedimento", "Para quem é indicado", seção da Nayana, rodapé).
- Cada página com `<title>`, descrição e `<h1>` próprios no HTML (SEO local), sem depender de JavaScript para o texto.
- Cards da home levam à página do tratamento; a navbar da página volta à home (`/`, `/#tratamentos`, `/#sobre-a-clinica`).

## Não objetivos / anti-objetivos
- Sem conteúdo novo (antes/depois, FAQ por tratamento). Sem a faixa final "Agende sua avaliação" (retirada do modelo a pedido; arquivada em `_arquivo/`). Sem a aba Sistema.
- Não alterar `design-sistem-napele/` (somente leitura) nem `napele.css`/`napele-*.js` espelhados. Sem `!important` novo.
- Anti-objetivo: 13 URLs que só diferem por JS no navegador (o texto sumiria para buscadores).

## Restrições
- `public/assets` espelha o design system; o texto dos tratamentos tem uma única fonte: `public/assets/treatments.js`, lido no build (mesmo padrão do `Layout.astro` lendo o `index.html`).
- Markup do modelo copiado literalmente (como `scripts/extract-overview.mjs` faz para a home); só mudam caminhos e o texto de cada tratamento.
- O modelo não tem pré-loader; o body é `np-treatment`. O Layout ganha uma variante para essas páginas.
- Servidor: `astro dev --background`, `http://localhost:4321`.

## Abordagens consideradas
1. **Páginas estáticas por slug (escolhida):** `getStaticPaths` sobre a lista do `treatments.js`; texto preenchido no build. Trade-off: precisa de um componente do modelo e de uma leitura do `treatments.js` no build; ganha URL, título e texto por tratamento.
2. **Copiar `tratamento.html` e manter `?t=` com `napele-treatment.js`:** mais rápido e 1:1, mas uma URL só para 13 tratamentos e texto preenchido por JS. Descartada.
3. **Reescrever o texto em dados TypeScript próprios:** duplica a fonte e se desatualiza quando o design system mudar. Descartada.

## Decisões minhas (a conferir)
- Rota `/tratamentos/<slug>/` (espelha `#tratamentos/<slug>` do design system).
- Verificação: paridade das 13 páginas × viewports 1440/1024/768/390 contra `/assets/overview/tratamento.html?t=<slug>`, mais testes de comportamento (links, título, ausência de erros/404).

## O que fica para o construtor
Estrutura exata do componente do modelo, extração do markup, forma de importar o `treatments.js` no build, ajustes do Layout (scripts da variante) e do harness de paridade.
