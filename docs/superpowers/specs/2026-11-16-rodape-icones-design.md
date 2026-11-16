# Ícones no rodapé + versão nos arquivos do site — design (curto)

**Status:** aprovado pelo dono em 2026-11-16 ("pode fazer"), sobre a proposta feita em conversa: ícones do topo no rodapé, sem TikTok, e a correção do cache no mesmo push.

## Intenção

O dono quer no rodapé os mesmos três ícones que já estão na barra do topo: **Instagram, WhatsApp e Localização** (nessa ordem, sem TikTok e sem YouTube). Hoje o rodapé tem um bloco social (Instagram, YouTube, TikTok) que fica escondido, porque nenhum endereço de perfil está preenchido.

Junto vai a correção do cache: tudo em `/assets/` sai da Vercel com `max-age=31536000, immutable` e sem versão na URL, então quem já visitou o site continua com o CSS e o JS antigos (visto em 2026-11-16: o preloader novo estava no ar e o Chrome mostrava o velho). Esta mudança mexe em `napele.css`, então o rodapé novo apareceria com estilo antigo para esses visitantes.

## Metas

- O rodapé da home e o das páginas de tratamento mostram 3 ícones, sempre visíveis: Instagram, WhatsApp, Localização. Mesmo desenho e mesmo código (`.np-icon`, `data-np-icon`) dos ícones do topo.
- WhatsApp abre `wa.me/<número cadastrado>`; Localização abre a rota no Google Maps (o mesmo link do topo). Instagram fica como no topo hoje: ícone sem link até haver endereço. Quando `CONTACT.instagram` for preenchido em `napele-contact.js`, topo e rodapé passam a abrir o perfil, sem mexer em mais nada.
- Todo `<link>`/`<script>` de `/assets/napele*` (CSS e JS do design system) sai com `?v=<hash do conteúdo>`: o endereço muda quando o arquivo muda, então qualquer visitante, mesmo com cache antigo, baixa a versão nova na visita seguinte.

## Não-metas

- Não mexe no ícone do topo, no botão flutuante do WhatsApp nem nos botões "Agendar Avaliação".
- Não preenche Instagram, YouTube, TikTok nem telefone (o dono não passou os endereços; nada aqui aponta para outra clínica).
- Não mexe no cabeçalho de cache da Vercel (`vercel.json`): a versão na URL resolve, e sozinho o cabeçalho não ajudaria quem já tem o arquivo guardado.
- Não versiona `vendor/gsap.min.js` nem os arquivos de `overview/wp-*` (não mudam).

## Anti-metas (seria falha mesmo funcionando)

- Os ícones aparecerem só em uma das páginas (home ou tratamento).
- O rodapé do site e o do design system ficarem diferentes (a paridade do rodapé compara os dois).
- Um ícone com `href="#"` ou apontando para qualquer lugar que não seja a clínica.
- Um script do design system carregado duas vezes, ou um que deixe de carregar por causa do `?v=`.

## Restrições

- **Design system primeiro.** Edita-se `design-sistem-napele/assets/overview/index.html` e `tratamento.html` e `napele.css`; `npm run ds:sync` leva a cópia para `public/`; `Footer.astro` e `TreatmentFooter.astro` são regerados por `scripts/extract-overview.mjs footer` e `scripts/extract-treatment.mjs footer`. `ds:check` tem de ficar sem diferenças.
- O sprite `#np-i-*` só existe dentro do `Layout.astro` e do catálogo, **não** nos HTMLs do design system: no rodapé o SVG vai por inteiro em cada ícone (sem `<use>`), copiado do sprite.
- `napele-contact.js` não muda: seu laço `a[data-np-icon]` varre o documento inteiro e já cuida dos ícones do rodapé.
- `napele-preloader.js`, `napele-tiles.js` e `napele-contact.js` leem `script.src`: com `?v=` na URL continuam certos (`new URL(relativo, src)` ignora a query; o `replace(/napele-contact\.js.*$/)` já a descarta).
- `tests/behavior/foundation.spec.mjs` procura os scripts por `src$="/assets/nome.js"`: com `?v=` esse seletor deixa de achar, então passa a `src*=`.
- Em `napele.css` o bloco do rodapé atual (botões redondos dourados do widget `a4412bd`) fica sem uso e é trocado pela regra dos novos ícones.

## Abordagens consideradas

1. **Ícones do topo no rodapé, com o código do topo (escolhida).** Mesmo visual que o dono mostrou; `napele-contact.js` já os alimenta; um único lugar para o Instagram.
2. Reaproveitar o bloco social escondido do rodapé, trocando só os desenhos. Rejeitada: o estilo dele é outro (botões redondos de 44 px, desenhos cheios) e o mecanismo `data-np-contact` esconde o ícone sem endereço, então o Instagram não apareceria.
3. Usar `<use href="#np-i-…">` do sprite. Rejeitada: os HTMLs do design system não têm o sprite, e o rodapé de lá ficaria sem ícones.

Para o cache: (a) só trocar o cabeçalho no `vercel.json`: não alcança quem já guardou o arquivo; (b) renomear os arquivos a cada mudança (`napele.3.css`): quebra a regra de que o site é cópia do design system. Escolhida a versão por conteúdo na URL, calculada no `Layout.astro`.

## Decisões

- **Do dono:** os três ícones, a ordem, sem TikTok e sem YouTube, e a correção do cache no mesmo push.
- **Da implementação:** os ícones ficam no lugar do bloco antigo (primeiro filho da barra de baixo do rodapé, à esquerda do copyright); tamanho e cor são os de `.np-icon` (26 px, creme, dourado ao passar o mouse); o hash é o SHA-1 do conteúdo, 8 primeiros caracteres hexadecimais, calculado no build (e no `dev`) a partir de `public/assets/<arquivo>`.

## Em aberto (não fazem parte desta entrega)

- O endereço do Instagram (e se a clínica tem YouTube/TikTok: os campos continuam em `napele-contact.js`, mas nada no rodapé os lê).
- O cabeçalho de cache de `/assets/` na Vercel continua de 1 ano; sem versão na URL, qualquer arquivo novo em `/assets/` fora de `napele*` ainda sofre do mesmo problema.
