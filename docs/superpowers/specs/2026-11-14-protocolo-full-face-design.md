# Seção "Protocolo Full Face Fialho" — design (curto)

Data: 2026-11-14 · Status: aprovado pelo usuário na conversa ("Pode seguir dessa forma")

## Intenção e porquê
O Full Face Fialho é o nome mais próprio da Nayana (bio do Instagram, pré-loader), e o site não o explica. Uma seção nova, acima de Tratamentos, responde "Por que ela? Existe um método?" no ato 1 (Promessa). Vai **primeiro para o design system** (fonte da verdade) e depois para o site Astro, que o espelha.

## Objetivos
- Seção `#protocolo-full-face` entre a faixa dourada (`.np-marquee`) e Tratamentos, no molde da "Quem sou eu" (`.np-doctor`): bloco 1 = foto com 2 chips flutuantes + título + texto; bloco 2 = fio, título, texto e 2 fotos com legenda (a segunda 48px mais baixa).
- Superfície escura (`--np-dark`), título em degradê dourado, texto creme, chips em vidro escuro, mesmo movimento (a foto abre, os chips surgem, o texto segue). O ato 1 continua escuro; a borda escuro→creme continua no topo de Tratamentos.
- Documentada na aba Sistema do design system (arco narrativo, seções da home, tamanho das seções).
- Idêntica no site Astro (paridade com o design system) e em todos os viewports.

## Não objetivos / anti-objetivos
- Texto definitivo: só a Nayana pode descrever o método (o relatório do design system classifica "Full Face Fialho" como risco médio: uma frase escrita por ela, sem adjetivo como "exclusivo", ou omitir). O texto desta entrega é **provisório**, mínimo e sem promessa, e a seção fica marcada `data-np-draft`. **Não pode ir ao ar** com a marca.
- Sem item novo no menu, sem JavaScript novo (só se reaproveita o `napele-reveal.js`), sem CSS copiado do `.np-doctor`.
- Anti-objetivo: texto que invente etapas, resultados, prazo, número de sessões ou "criadora" (autoria exige prova).

## Restrições
- Desta vez o `design-sistem-napele/` **é editado** (o usuário pediu para estruturar lá primeiro); `public/assets` continua espelho dele (`npm run ds:sync`, `npm run ds:check` limpo).
- Aeonik; ouro só como acento; botão único "Agendar Avaliação" (a seção não tem botão); breakpoints 1024 e 767; um momento de assinatura por seção.
- Fotos: as 3 imagens Full Face já existentes em `assets/results/` (antes e depois de pacientes). Confirmar com a clínica o consentimento de uso antes de publicar.

## Abordagens consideradas
1. **Modificador sobre `.np-doctor` (escolhida):** a seção é `class="np-doctor np-protocol"`, com os mesmos ids de container do Elementor (o kit pinta o layout por eles) e id próprio `#protocolo-full-face`. As regras que hoje usam `#quem-sou` passam a `:is(#quem-sou, #protocolo-full-face)`; o reveal passa a percorrer todas as `.np-doctor`. Um só CSS, dois usos.
2. **Seção `.np-protocol` com CSS próprio:** ~110 linhas duplicadas e dois lugares para ajustar. Descartada.
3. **Reaproveitar a seção da doutora duas vezes, só trocando o texto:** os ids e o reveal pegariam o primeiro `.np-doctor` da página. Descartada.

## Decisões minhas (a conferir)
- Foto do bloco 1: metade "depois" do par `Clínica harmonização protocolp full face.webp`, recortada em 4:5. Bloco 2: o par `Full Face Anapolis.webp` cortado ao meio em dois cards 3:4, "Antes" e "Depois". (Gerados por `tools/prep-full-face.py` em `assets/fullface/`.)
- Chips: "Full Face Fialho" e "Napele Clínica". Título: "Protocolo Full Face Fialho". Bloco 2: "O protocolo na prática".
- Página sem seam entre a faixa e a seção nova (a faixa continua colada ao hero e à seção).

## O que fica para o construtor
Recortes exatos das imagens, ajuste fino do CSS dos chips em foto 4:5 com chips do kit, geração do bloco para o Astro e a reindexação do harness de paridade.
