/* Napele treatments: the one list behind every treatment card on the Home and the single treatment page (tratamento.html?t=<slug>).
   Fields (all but slug, name, group and photo are optional; what is missing falls back to the page's placeholder text):
     slug     id used in the URL (?t=...) and in the catalog route (#tratamentos/<slug>)
     name     title of the card and h1 of the page
     group    'facial' | 'corporal' (decides the chip above the title)
     photo    file in assets/treatments/ (720x950, the card ratio): card photo and the "Conheça o procedimento" image
     intro    hero paragraph
     about    { title, text }   "Conheça o procedimento" section (text: one paragraph, or an array of them)
     forWhom  [{ title, text } x 4]   the four cards of "Para quem é" (a plain string sets only the text)
   All thirteen have their copy: it lives in COPY, below the list, by slug.
   The Home cards are static HTML (Swiper needs them at load): when a name, slug or photo changes here, change that card in
   overview/index.html too (one h3, one href, one background-image (url('../treatments/<photo>')) per card, in this order). */
(function (root) {
  var GROUPS = {
    facial: 'Estética facial',
    corporal: 'Estética corporal'
  };

  var DEFAULT_INTRO = 'Conheça o procedimento e agende sua avaliação com a equipe Napele.';

  var LIST = [
    { slug: 'toxina-botulinica',                   name: 'Toxina botulínica',                   group: 'facial',   photo: 'toxina-botulinica.webp' },
    { slug: 'preenchimento-com-acido-hialuronico', name: 'Preenchimento com ácido hialurônico', group: 'facial',   photo: 'preenchimento-acido-hialuronico.webp' },
    { slug: 'fios-de-pdo',                         name: 'Fios de PDO',                         group: 'facial',   photo: 'fios-de-pdo.webp' },
    { slug: 'intradermoterapia',                   name: 'Intradermoterapia',                   group: 'facial',   photo: 'intradermoterapia.webp' },
    { slug: 'bioestimuladores',                    name: 'Bioestimuladores',                    group: 'facial',   photo: 'bioestimuladores.webp' },
    { slug: 'tratamento-de-microvasos',            name: 'Tratamento de microvasos',            group: 'facial',   photo: 'tratamento-de-microvasos.webp' },
    { slug: 'lipoenzimatica-de-papada',            name: 'Lipoenzimática de papada',            group: 'facial',   photo: 'lipoenzimatica-de-papada.webp' },
    { slug: 'limpeza-de-pele',                     name: 'Limpeza de pele',                     group: 'facial',   photo: 'limpeza-de-pele.webp' },
    { slug: 'microagulhamento',                    name: 'Microagulhamento',                    group: 'facial',   photo: 'microagulhamento.webp' },
    { slug: 'skinbooster',                         name: 'Skinbooster',                         group: 'facial',   photo: 'skinbooster.webp' },
    { slug: 'drenagem-linfatica',                  name: 'Drenagem linfática',                  group: 'corporal', photo: 'drenagem-linfatica.webp' },
    { slug: 'massagem-modeladora',                 name: 'Massagem modeladora',                 group: 'corporal', photo: 'massagem-modeladora.webp' },
    { slug: 'hidratacao-e-regeneracao-labial',     name: 'Hidratação e regeneração labial',     group: 'facial',   photo: 'hidratacao-regeneracao-labial.webp' }
  ];

  // The page copy, by slug: intro (hero), about { title, text: [paragraph, paragraph] } and forWhom (four { title, text } cards).
  // Written to inform, not to promise: no brand, price, duration or number of sessions (only the clinic can confirm those: the
  // evaluation sets them), and every injectable or technique ends on "results vary". Keep a card's title under ~40 characters
  // and its text under ~135 (it is three lines in the card).
  var COPY = {
    'toxina-botulinica': {
      intro: 'Suaviza de forma temporária as linhas de expressão do rosto, com a dose e os pontos de aplicação definidos pela equipe a partir da sua avaliação.',
      about: {
        title: 'Como a toxina botulínica atua nas linhas de expressão',
        text: [
          'A toxina botulínica é aplicada em pequenas quantidades nos músculos responsáveis por marcas como as da testa, as de entre as sobrancelhas e as ao redor dos olhos. Ela reduz a força dessas contrações e, com isso, a pele da região tende a ficar mais lisa. O efeito é temporário e vai diminuindo com o tempo.',
          'Na Napele, tudo começa por uma avaliação do seu rosto em repouso e em movimento. A equipe indica a região, a quantidade e o intervalo entre as aplicações e explica cada etapa antes de começar. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Linhas de expressão', text: 'Para quem percebe marcas na testa, entre as sobrancelhas ou ao redor dos olhos quando sorri ou franze o rosto.' },
        { title: 'Cuidado preventivo', text: 'Para quem quer acompanhar a pele desde cedo, antes de as linhas ficarem marcadas, com indicação feita caso a caso.' },
        { title: 'Aparência de cansaço', text: 'Para quem sente que a testa ou o olhar passam uma expressão de tensão ou de cansaço que não combina com o seu dia a dia.' },
        { title: 'Quem já fez e quer manter', text: 'Para quem já realizou o procedimento e deseja dar continuidade ao cuidado, com uma nova avaliação do que ainda faz sentido.' }
      ]
    },
    'preenchimento-com-acido-hialuronico': {
      intro: 'Repõe volume e define contornos em áreas como lábios, bochechas, queixo e mandíbula, com ácido hialurônico aplicado conforme a anatomia do seu rosto.',
      about: {
        title: 'Volume e contorno com ácido hialurônico',
        text: [
          'O ácido hialurônico é uma substância presente naturalmente na pele, onde ajuda a reter água. No preenchimento, ele é aplicado em pontos estratégicos para repor volume perdido, definir contornos e valorizar as proporções do rosto. Com o tempo, o organismo vai absorvendo o produto.',
          'A escolha do produto, da quantidade e dos pontos de aplicação depende do que você quer mudar e da sua anatomia. Por isso, a Napele começa pela avaliação e conversa com você sobre o que é possível fazer, sem exageros. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Perda de volume', text: 'Para quem nota o rosto mais fundo ou com menos sustentação em regiões como bochechas, têmporas ou ao redor da boca.' },
        { title: 'Lábios', text: 'Para quem deseja mais contorno, simetria ou hidratação nos lábios, respeitando as proporções do rosto.' },
        { title: 'Contorno do rosto', text: 'Para quem quer definir melhor o queixo, a mandíbula ou o perfil, com um desenho que acompanha a sua anatomia.' },
        { title: 'Sulcos e marcas', text: 'Para quem quer suavizar sulcos, como o que vai do nariz até a boca, com indicação definida na avaliação.' }
      ]
    },
    'fios-de-pdo': {
      intro: 'Fios finos e absorvíveis de polidioxanona dão sustentação à pele e estimulam a produção de colágeno, com indicação definida na avaliação.',
      about: {
        title: 'Sustentação e estímulo de colágeno com fios absorvíveis',
        text: [
          'Os fios de PDO (polidioxanona) são finos, biocompatíveis e absorvíveis. Inseridos sob a pele, eles oferecem sustentação às camadas do tecido e estimulam o organismo a produzir colágeno de forma gradual. Com o tempo, o próprio corpo absorve o fio.',
          'Existem fios com finalidades diferentes, como sustentação e melhora da qualidade da pele, e a escolha depende do seu caso. A avaliação define se o procedimento é indicado e qual é o plano mais adequado para você. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Flacidez leve a moderada', text: 'Para quem percebe a pele do rosto perdendo firmeza e busca sustentação sem recorrer a uma cirurgia.' },
        { title: 'Contorno menos definido', text: 'Para quem sente que a linha da mandíbula e a região do pescoço perderam definição ao longo do tempo.' },
        { title: 'Qualidade da pele', text: 'Para quem quer estimular o colágeno e melhorar a textura em áreas como as bochechas e o pescoço.' },
        { title: 'Procedimento menos invasivo', text: 'Para quem prefere uma técnica minimamente invasiva, com acompanhamento da equipe e indicação feita na avaliação.' }
      ]
    },
    'intradermoterapia': {
      intro: 'Aplicação de ativos em microdoses na pele, com formulações escolhidas conforme a sua necessidade, como hidratação, manchas, viço e firmeza.',
      about: {
        title: 'Ativos aplicados diretamente na pele',
        text: [
          'Na intradermoterapia, substâncias como vitaminas, antioxidantes e ácido hialurônico são aplicadas em pequenas quantidades na camada superficial da pele. Isso leva os ativos direto à região que precisa de cuidado e permite combinar a formulação ao objetivo de cada pessoa.',
          'A equipe avalia a sua pele, define as formulações e o número de sessões e acompanha a evolução ao longo do tratamento. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Pele sem viço', text: 'Para quem sente a pele opaca, cansada ou com aspecto de desidratação.' },
        { title: 'Manchas e uniformidade', text: 'Para quem quer melhorar o aspecto de manchas e deixar o tom da pele mais uniforme, com formulação indicada na avaliação.' },
        { title: 'Textura e poros', text: 'Para quem busca melhorar a textura da pele e o aspecto de poros dilatados.' },
        { title: 'Cuidado complementar', text: 'Para quem já faz outros tratamentos e quer um reforço para manter a pele saudável entre eles.' }
      ]
    },
    'bioestimuladores': {
      intro: 'Substâncias injetáveis que estimulam o organismo a produzir colágeno, melhorando de forma gradual a firmeza e a qualidade da pele.',
      about: {
        title: 'Estímulo de colágeno, no ritmo do seu organismo',
        text: [
          'Os bioestimuladores são substâncias injetáveis que levam a pele a produzir mais colágeno, a proteína que dá firmeza e sustentação. O efeito não é imediato: ele aparece de forma gradual, conforme o organismo responde ao estímulo.',
          'Existem diferentes tipos de bioestimulador, e a escolha depende da região, da qualidade da pele e do seu objetivo. A Napele começa pela avaliação e explica o plano e o número de sessões indicados para o seu caso. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Perda de firmeza', text: 'Para quem percebe a pele do rosto, do pescoço ou do colo menos firme e busca um cuidado gradual.' },
        { title: 'Pele mais fina', text: 'Para quem sente a pele mais fina ou com menos sustentação e quer estimular a produção de colágeno.' },
        { title: 'Contorno do rosto', text: 'Para quem quer apoio na definição do rosto, com um planejamento feito caso a caso.' },
        { title: 'Quem prefere efeito gradual', text: 'Para quem gosta de mudanças que aparecem aos poucos, sem o efeito imediato de um preenchimento.' }
      ]
    },
    'tratamento-de-microvasos': {
      intro: 'Cuidado com os vasinhos finos que aparecem no rosto, com a técnica escolhida pela equipe de acordo com o seu tipo de pele e a região a tratar.',
      about: {
        title: 'Cuidado com os vasinhos do rosto',
        text: [
          'Os microvasos, ou telangiectasias, são pequenos vasos sanguíneos que ficam visíveis na pele, em geral ao redor do nariz e nas bochechas. Eles podem estar ligados à predisposição genética, à exposição ao sol, às variações de temperatura e a outros fatores.',
          'O tratamento depende do calibre do vaso, da região e do seu tipo de pele. Por isso, a Napele começa pela avaliação e indica o que faz sentido para o seu caso. Os resultados variam de pessoa para pessoa e, em alguns casos, são necessárias mais sessões.'
        ]
      },
      forWhom: [
        { title: 'Vasinhos aparentes', text: 'Para quem nota fios avermelhados ou arroxeados ao redor do nariz, nas bochechas ou no queixo.' },
        { title: 'Pele sensível ou avermelhada', text: 'Para quem tem a pele sensível e percebe vermelhidão frequente, com avaliação para entender a causa.' },
        { title: 'Incômodo estético', text: 'Para quem se incomoda com a aparência dos vasos e quer entender quais opções existem para o seu caso.' },
        { title: 'Pele negra ou morena', text: 'Para quem tem pele negra ou morena e precisa de uma técnica escolhida com cuidado para o seu tom.' }
      ]
    },
    'lipoenzimatica-de-papada': {
      intro: 'Aplicação de enzimas para reduzir a gordura localizada sob o queixo e melhorar o contorno do pescoço, com plano de sessões definido na avaliação.',
      about: {
        title: 'Cuidado com a gordura localizada sob o queixo',
        text: [
          'A lipoenzimática consiste na aplicação de enzimas na região da papada, a gordura acumulada sob o queixo. Essas substâncias atuam sobre as células de gordura da área e ajudam o corpo a eliminá-las de forma gradual, o que pode melhorar o contorno entre o rosto e o pescoço.',
          'O número de sessões e o intervalo entre elas variam conforme a quantidade de gordura e a resposta de cada pessoa. A avaliação define se o procedimento é indicado e explica o que esperar nos dias seguintes. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Papada', text: 'Para quem tem acúmulo de gordura sob o queixo e quer um contorno mais definido entre o rosto e o pescoço.' },
        { title: 'Gordura localizada', text: 'Para quem não consegue reduzir a região da papada apenas com alimentação e atividade física.' },
        { title: 'Alternativa à cirurgia', text: 'Para quem busca uma opção menos invasiva do que a cirurgia e está aberto a um plano em sessões.' },
        { title: 'Complemento de outros tratamentos', text: 'Para quem já faz fios ou bioestimuladores e quer cuidar também do contorno do pescoço.' }
      ]
    },
    'limpeza-de-pele': {
      intro: 'Remove impurezas, cravos e células mortas e prepara a pele para outros cuidados, com um protocolo adequado ao seu tipo de pele.',
      about: {
        title: 'Uma limpeza que respeita o seu tipo de pele',
        text: [
          'A limpeza de pele remove impurezas, excesso de oleosidade, cravos e células mortas que se acumulam nos poros. Ela é feita em etapas, que podem incluir higienização, esfoliação, extração, máscara e hidratação.',
          'Cada pele tem uma necessidade: oleosa, seca, sensível, com tendência a acne ou a manchas. Por isso, a equipe avalia o seu caso antes e adapta os produtos e as técnicas, com atenção às particularidades de cada tom de pele, incluindo a pele negra.'
        ]
      },
      forWhom: [
        { title: 'Pele oleosa ou com cravos', text: 'Para quem tem excesso de oleosidade, poros obstruídos e cravos que voltam com frequência.' },
        { title: 'Pele sem viço', text: 'Para quem sente a pele opaca, áspera ou com acúmulo de células mortas.' },
        { title: 'Preparo para outros tratamentos', text: 'Para quem vai fazer outros procedimentos e precisa deixar a pele limpa e preparada, conforme a orientação da equipe.' },
        { title: 'Manutenção periódica', text: 'Para quem quer manter uma rotina de cuidados e acompanhar a saúde da pele ao longo do ano.' }
      ]
    },
    'microagulhamento': {
      intro: 'Microagulhas criam pequenos canais na pele que estimulam a renovação e o colágeno e favorecem a absorção de ativos, com protocolo definido na avaliação.',
      about: {
        title: 'Microagulhas para renovar a textura da pele',
        text: [
          'No microagulhamento, um dispositivo com agulhas muito finas faz microperfurações controladas na pele. Esse estímulo leva o organismo a iniciar um processo de renovação e a produzir colágeno, e os microcanais ajudam a pele a absorver os ativos aplicados em seguida.',
          'É um procedimento usado para cuidar de cicatrizes de acne, poros, textura irregular, manchas e sinais de envelhecimento. A Napele avalia o seu tipo de pele e define a profundidade, o número de sessões e o intervalo entre elas. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Cicatrizes de acne', text: 'Para quem tem marcas de acne e quer melhorar o aspecto e a regularidade da pele.' },
        { title: 'Textura irregular', text: 'Para quem percebe a pele áspera ou com poros mais aparentes.' },
        { title: 'Manchas', text: 'Para quem busca uniformizar o tom da pele, com acompanhamento adequado ao seu tipo de pele.' },
        { title: 'Sinais de envelhecimento', text: 'Para quem quer estimular o colágeno e cuidar de linhas finas e da firmeza da pele.' }
      ]
    },
    'skinbooster': {
      intro: 'Aplicação superficial de ácido hialurônico para hidratar a pele em profundidade e melhorar o viço, a maciez e a elasticidade.',
      about: {
        title: 'Hidratação profunda, de dentro da pele',
        text: [
          'O skinbooster é feito com ácido hialurônico em uma formulação própria para a pele, aplicado de forma superficial em vários pontos do rosto. Diferente do preenchimento, ele não é usado para dar volume: o objetivo é hidratar a pele em profundidade e melhorar a sua qualidade.',
          'É um tratamento voltado ao aspecto da pele: viço, maciez, textura e elasticidade. A equipe avalia o seu caso e indica o número de sessões e o intervalo entre elas. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Pele desidratada', text: 'Para quem sente a pele seca ou opaca, mesmo mantendo uma boa rotina de cuidados em casa.' },
        { title: 'Linhas finas', text: 'Para quem quer cuidar de linhas finas e da perda de elasticidade nas fases iniciais do envelhecimento.' },
        { title: 'Textura e viço', text: 'Para quem busca uma pele mais macia, uniforme e luminosa.' },
        { title: 'Pescoço e colo', text: 'Para quem quer estender o cuidado ao pescoço e ao colo, regiões que também mostram o passar do tempo.' }
      ]
    },
    'drenagem-linfatica': {
      intro: 'Massagem suave e ritmada que estimula a circulação linfática e ajuda a reduzir a sensação de inchaço, com sessões ajustadas às suas necessidades.',
      about: {
        title: 'Uma massagem leve para o fluxo linfático',
        text: [
          'A drenagem linfática manual usa movimentos suaves, lentos e ritmados para estimular o sistema linfático, que recolhe o excesso de líquido dos tecidos e o devolve à circulação. Isso ajuda a diminuir a sensação de inchaço e de peso, principalmente nas pernas.',
          'As sessões são planejadas a partir de uma avaliação, que considera o seu histórico e o que você sente no corpo, e que também identifica situações em que a drenagem não deve ser feita. No pós-operatório, a indicação depende de liberação do médico responsável.'
        ]
      },
      forWhom: [
        { title: 'Retenção de líquidos', text: 'Para quem sente inchaço ou peso nas pernas, principalmente no fim do dia.' },
        { title: 'Pós-operatório', text: 'Para quem está em recuperação de cirurgia plástica e tem liberação do médico para iniciar as sessões.' },
        { title: 'Rotina sentada ou em pé', text: 'Para quem passa muito tempo sentado ou em pé e sente as pernas cansadas ao final do dia.' },
        { title: 'Relaxamento', text: 'Para quem quer um momento de cuidado e bem-estar, com uma massagem calma e confortável.' }
      ]
    },
    'massagem-modeladora': {
      intro: 'Massagem com manobras mais firmes que estimulam a circulação e ajudam a modelar o contorno do corpo, associada a bons hábitos de vida.',
      about: {
        title: 'Manobras firmes para modelar o contorno',
        text: [
          'A massagem modeladora combina manobras mais vigorosas, como deslizamentos, amassamentos e pressões, aplicadas em regiões como abdômen, quadris, coxas e glúteos. Ela estimula a circulação local e pode ajudar a melhorar o aspecto da pele e a definição do contorno.',
          'Não é um método de emagrecimento: os melhores resultados aparecem quando ela é associada à alimentação equilibrada e à atividade física. A equipe avalia o seu corpo, define as regiões e a frequência das sessões e explica cada etapa. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Contorno corporal', text: 'Para quem quer valorizar o contorno de regiões como abdômen, quadris e coxas, aliado a bons hábitos.' },
        { title: 'Aspecto da pele', text: 'Para quem busca melhorar o aspecto da pele em áreas com celulite ou textura irregular.' },
        { title: 'Circulação e bem-estar', text: 'Para quem sente o corpo pesado e quer estimular a circulação com uma massagem personalizada.' },
        { title: 'Complemento de outros cuidados', text: 'Para quem já faz outros tratamentos corporais e quer somar a massagem ao plano, conforme a orientação da equipe.' }
      ]
    },
    'hidratacao-e-regeneracao-labial': {
      intro: 'Cuidado voltado a lábios ressecados, sem viço ou com pequenas fissuras, para favorecer a hidratação, a maciez e um aspecto saudável.',
      about: {
        title: 'Lábios hidratados, com aspecto saudável',
        text: [
          'Os lábios têm a pele mais fina e não contam com glândulas sebáceas como o restante do rosto, o que os deixa mais sujeitos ao ressecamento, ao frio, ao sol e ao desgaste do dia a dia. O tratamento reúne ativos hidratantes e regeneradores para cuidar da textura e da maciez dessa região.',
          'O protocolo é definido na avaliação, de acordo com o estado dos seus lábios e com o que você espera. A equipe explica cada etapa e orienta os cuidados em casa para dar continuidade ao tratamento. Os resultados variam de pessoa para pessoa.'
        ]
      },
      forWhom: [
        { title: 'Lábios ressecados', text: 'Para quem sente os lábios secos ou descamando com frequência, mesmo usando hidratante.' },
        { title: 'Fissuras e rachaduras', text: 'Para quem tem pequenas fissuras ou desconforto nos lábios, com avaliação para entender a causa.' },
        { title: 'Falta de viço', text: 'Para quem percebe os lábios opacos e quer cuidar da textura e da maciez.' },
        { title: 'Antes de outros procedimentos', text: 'Para quem pretende fazer outros procedimentos nos lábios e quer cuidar da base antes, conforme a orientação da equipe.' }
      ]
    }
  };

  LIST.forEach(function (t) {
    var c = COPY[t.slug];
    if (c) { t.intro = c.intro; t.about = c.about; t.forWhom = c.forWhom; }
    t.groupLabel = GROUPS[t.group];
  });

  root.NAPELE_TREATMENTS = {
    list: LIST,
    groups: GROUPS,
    defaultIntro: DEFAULT_INTRO,
    find: function (slug) {
      for (var i = 0; i < LIST.length; i++) if (LIST[i].slug === slug) return LIST[i];
      return null;
    },
    first: LIST[0]
  };
})(window);
