# Pré-loader com entrada da logo — design (curto)

**Status:** aprovado pelo dono em 2026-11-16 (escolha "A": a logo some quando a foto entra; fundo da logo com o véu e o grão do site).

## Intenção

Hoje o pré-loader mostra, desde o primeiro segundo, a foto de fundo, o "Conheça", o "Full Face / Fialho" e o contador 000→100. O dono quer uma abertura em três tempos: **logo Napele → fundo com a foto → textos**. A marca vem primeiro, sozinha; a foto e os textos entram depois.

## Metas

- Sequência sempre nesta ordem: (1) a logo sozinha sobre o fundo do site; (2) a logo some enquanto a foto surge; (3) "Conheça", "Full Face / Fialho" e o contador entram sobre a foto.
- Duração total ≈ **11,25 s** (hoje 10,25 s). Uma constante no topo do arquivo (`LOGO_T.T0`) ajusta.
- Desktop e celular com a mesma sequência (logo menor no celular).
- **O fundo da logo não é preto liso**: é o escuro do véu da hero (`--np-dark-rgb`, 36,35,33) com o grão do site por baixo da logo (o mesmo do `.bg` do kit: `noise-01.webp`, tile repetido, opacidade .4). A cobertura de primeiro desenho e o fundo do `<html>` (faixa da barra de rolagem) têm a mesma cor, para não haver salto quando a cobertura sai.

## Não-metas

- Não mexe nas persianas (fase 2), na entrada da hero (fase 3), no botão "Pular" nem no modo "sem animação" (`prefers-reduced-motion`: continua sem pré-loader).
- Não mexe nas páginas de tratamento (o pré-loader não carrega nelas: `!isTreatment` em `Layout.astro`).
- A duração continua fixa; não acompanha o carregamento real.
- Não troca o arquivo da logo nem o cache de `/logo/` (ver "Em aberto").

## Anti-metas (seria falha mesmo funcionando)

- A página ficar coberta para sempre (se a logo ou qualquer coisa falhar, o pré-loader segue ou sai).
- A logo "pipocar" (aparecer pela metade) ou a foto piscar durante a fase da logo.
- A logo disputar espaço com o "Conheça", o "Pular" ou o rosto: ela **não fica** na cena da foto.
- Um fundo liso, sem véu nem grão, atrás da logo.
- O total passar de 15 s: `tests/behavior/clinic-video.spec.mjs` espera o fim do pré-loader com limite de 15 s.

## Restrições

- **Design system primeiro.** A fonte é `design-sistem-napele/assets/napele-preloader.{js,css}`; o site recebe a cópia com `npm run ds:sync`. `npm run ds:check` tem de ficar sem diferenças.
- Tudo é um único cronograma GSAP em `napele-preloader.js`; a fase da logo entra antes e empurra o resto por `T0`.
- A foto está em escala 1 exatamente quando as persianas abrem (elas são desenhadas em 1x).
- O véu e o grão (`.np-pre__ground`) ficam **sob** a foto e as persianas e saem junto com o fundo do `#np-pre` quando as persianas abrem (senão o grão dobraria sobre a hero, que já tem o próprio `.bg`).
- A cobertura preta de primeira pintura só sai quando fonte, foto **e logo** estão prontas (ou o tempo máximo de 1,2 s).
- `LogoNapele.svg` pesa 468 KB: tem de ser decodificado antes de aparecer.

## Abordagens consideradas

1. **Estender o cronograma atual (escolhida).** Menor mudança; reaproveita bloqueio, cobertura, "Pular" e proteções.
2. Tela de logo separada antes do pré-loader. Rejeitada: duplicaria bloqueio, "Pular" e proteções, e poderia piscar entre as telas.
3. Reescrever o pré-loader. Rejeitada: arrisca a passagem persianas → hero, protegida pelos testes de paridade.

## Decisões

- **Do dono:** a logo some quando a foto entra (A); o fundo da logo leva o véu e o grão.
- **Da implementação:** duração ≈ 11,25 s: logo 0–3,0 s (surge em 0,9 s com fade + leve zoom, some a partir de 2,2 s enquanto a foto surge em 0,8 s); textos e contador a partir de 3,0 s; fase do contador de 6,5 para 4,5 s (o título mantém ≥ 1 s visível antes de sair); persianas e hero como hoje.
- A logo é o `/logo/LogoNapele.svg` do site, centralizada, em `cqw` (26 cqw até 520 px; 58 cqw no celular).
- Se a logo não ficar pronta em 1,2 s ou falhar, o pré-loader pula a fase da logo e vai direto para a foto (total ≈ 9 s).
- O "Pular" funciona desde o primeiro segundo, inclusive durante a logo.

## Em aberto (não fazem parte desta entrega)

- O `LogoNapele.svg` são dois PNGs de 1672×941 embutidos (468 KB) exibidos em até 520 px: numa conexão lenta a logo passa dos 1,2 s e a fase é pulada. Uma versão leve para o pré-loader resolve; `/logo/` também não está na regra de cache do `vercel.json` (hoje `max-age=0, must-revalidate`).
- `img.decode()` em SVG não foi verificado em Safari/iPhone.
