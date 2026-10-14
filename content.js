/*
  APAGA — CONTEÚDOS
  Técnicas reutilizáveis (sessões em áudio guiado) e programas.
  Quando houver áudios gravados, acrescenta  audio: "audio/nome.mp3"  a uma técnica
  e a app passa a tocar o ficheiro em vez da voz do telemóvel.
*/
(function () {

  /* Palavras para o jogo das palavras (imagens neutras e fáceis de visualizar) */
  const PALAVRAS = ["farol","maçã","ponte","lã","barco","folha","pão quente","cobertor","areia","chávena",
    "nuvem","janela","vela","pinheiro","laranja","lápis","cesto","gato","rio","sino","chapéu","escada",
    "mel","pedra lisa","bicicleta","girassol","lanterna","concha","casaco","telhado","caracol","trigo",
    "manta","moinho","oliveira","bolo","guarda-chuva","pena","colina","vaso","baloiço","pássaro","limão",
    "tapete","fogueira","canoa","dedal","novelo","azulejo","cereja","rede de pesca","bule","poça de água",
    "cadeira de vime","farol ao longe","papagaio de papel","ameixa","musgo","barco à vela","campo de trigo"];

  /*
    Tipos de passo:
      say      { t:"say", txt, dur }                   fala a frase e espera dur segundos
      breath   { t:"breath", ins, hold, out, ciclos }  respiração com o círculo
      words    { t:"words", n, dur }                   jogo das palavras
      silence  { t:"silence", txt, dur }               pausa sem voz
  */
  const TECNICAS = {
    abertura: { nome: "Abertura", fixa: true, passos: [
      { t: "say", txt: "Deita-te... Fecha os olhos.", dur: 7 },
      { t: "say", txt: "Deixa o corpo pesar no colchão.", dur: 8 }
    ]},
    fecho: { nome: "Fecho", fixa: true, passos: [
      { t: "say", txt: "Fica assim... Boa noite.", dur: 8 }
    ]},
    resp46: { nome: "Respiração lenta", passos: [
      { t: "say", txt: "Respira devagar... pelo nariz.", dur: 5 },
      { t: "breath", ins: 4, hold: 0, out: 6, ciclos: 6 }
    ]},
    resp478: { nome: "Respiração 4-7-8", passos: [
      { t: "say", txt: "Inspira em quatro... segura em sete... solta em oito.", dur: 6 },
      { t: "breath", ins: 4, hold: 7, out: 8, ciclos: 4 }
    ]},
    pmr: { nome: "Relaxamento muscular", passos: [
      { t: "say", txt: "Fecha as mãos.", dur: 6 }, { t: "say", txt: "E solta...", dur: 9 },
      { t: "say", txt: "Sobe os ombros.", dur: 6 }, { t: "say", txt: "E solta...", dur: 9 },
      { t: "say", txt: "Aperta a cara.", dur: 6 }, { t: "say", txt: "E solta...", dur: 9 },
      { t: "say", txt: "Aperta a barriga.", dur: 6 }, { t: "say", txt: "E solta...", dur: 9 },
      { t: "say", txt: "Estica os pés.", dur: 6 }, { t: "say", txt: "E solta... Sente o peso.", dur: 10 }
    ]},
    bodyscan: { nome: "Corpo pesado", passos: [
      { t: "say", txt: "Repara nos pés... Deixa-os pesados.", dur: 12 },
      { t: "say", txt: "As pernas... afundam.", dur: 12 },
      { t: "say", txt: "A barriga sobe... e desce.", dur: 12 },
      { t: "say", txt: "O peito... calmo.", dur: 12 },
      { t: "say", txt: "Os ombros... descem.", dur: 12 },
      { t: "say", txt: "Os braços... pesados.", dur: 12 },
      { t: "say", txt: "O rosto... solto. O maxilar... solto.", dur: 14 }
    ]},
    palavras: { nome: "Jogo das palavras", passos: [
      { t: "say", txt: "Imagina cada palavra... sem pressa.", dur: 6 },
      { t: "words", n: 12, dur: 10 }
    ]},
    lugar: { nome: "Um lugar calmo", passos: [
      { t: "say", txt: "Imagina um lugar... onde estás em paz.", dur: 12 },
      { t: "say", txt: "O que vês... à tua volta?", dur: 14 },
      { t: "say", txt: "Que sons... há aí?", dur: 14 },
      { t: "say", txt: "O ar... é fresco ou morno?", dur: 14 },
      { t: "say", txt: "Que cheiro... tem este lugar?", dur: 14 },
      { t: "say", txt: "Fica aí... o tempo que quiseres.", dur: 20 }
    ]},
    nuvens: { nome: "Pensamentos como nuvens", passos: [
      { t: "say", txt: "Repara na respiração... sem a mudar.", dur: 12 },
      { t: "say", txt: "Quando vier um pensamento... diz baixinho: pensamento.", dur: 12 },
      { t: "say", txt: "E volta à respiração.", dur: 20 },
      { t: "say", txt: "Os pensamentos passam... como nuvens.", dur: 20 },
      { t: "say", txt: "Não precisas de os seguir.", dur: 25 }
    ]},
    naotentar: { nome: "Deixar de tentar", passos: [
      { t: "say", txt: "Hoje... não tens de adormecer.", dur: 9 },
      { t: "say", txt: "Fica só a descansar... de olhos fechados.", dur: 14 },
      { t: "say", txt: "Se a cabeça disser: ainda estou acordado... responde: tudo bem.", dur: 18 },
      { t: "say", txt: "Descansar também conta.", dur: 25 }
    ]},
    acordei: { nome: "Voltar a adormecer", passos: [
      { t: "say", txt: "Não vejas as horas... Fecha os olhos.", dur: 8 },
      { t: "breath", ins: 4, hold: 0, out: 7, ciclos: 5 },
      { t: "say", txt: "Agora... imagina cada palavra.", dur: 6 },
      { t: "words", n: 10, dur: 12 },
      { t: "say", txt: "Ainda acordado? Tudo bem... Se a cabeça não abrandar, levanta-te um pouco. Volta quando tiveres sono.", dur: 12 }
    ]}
  };

  const PROGRAMAS = {
    mente: {
      nome: "A mente não desliga",
      unidade: "noite", total: 7,
      paraQuem: "Para quem se deita cansado e a cabeça começa a rever o dia, o trabalho e o que falta fazer.",
      inclui: ["7 noites com uma técnica nova por noite", "Fechar o dia antes de deitar", "Ritual final com as técnicas que mais te ajudaram"],
      ciencia: "Usa técnicas de relaxamento, imagética guiada, escrita antes de deitar e gestão de preocupações, presentes em programas de sono baseados em terapia cognitivo-comportamental.",
      refs: ["Edinger et al., 2021 — Journal of Clinical Sleep Medicine (diretriz AASM)", "Harvey & Payne, 2002 — Behaviour Research and Therapy (imagética)", "Scullin et al., 2018 — Journal of Experimental Psychology: General (lista de tarefas antes de deitar)", "Jansson-Fröjmark et al., 2022 — revisão sobre intenção paradoxal"],
      unidades: [
        { titulo: "Dar um lugar às preocupações",
          licao: ["Quando te deitas, a cabeça aproveita o silêncio para ensaiar problemas.", "Hoje vais arrumar o dia antes de ir para a cama. Escrever o que falta fazer ajuda a cabeça a largar."],
          tarefa: "Faz o Fechar o dia 1 hora antes de deitar.", sessao: ["resp46", "bodyscan"] },
        { titulo: "O jogo das palavras",
          licao: ["Uma cabeça acelerada salta de problema em problema. Imagens soltas e sem ligação dão-lhe algo leve para fazer.", "É parecido com o que a mente faz sozinha quando já está a adormecer."],
          sessao: ["resp46", "palavras"] },
        { titulo: "Um lugar calmo",
          licao: ["Imaginar um lugar com detalhe ocupa a atenção melhor do que tentar não pensar.", "Escolhe um lugar real ou inventado. Vais visitá-lo com os sentidos."],
          sessao: ["resp46", "lugar"] },
        { titulo: "Pensamentos como nuvens",
          licao: ["Lutar contra um pensamento dá-lhe mais força.", "Hoje vais apenas reparar nele, dar-lhe um nome e voltar à respiração."],
          sessao: ["nuvens", "palavras"] },
        { titulo: "A hora das preocupações",
          licao: ["Ao fim da tarde, reserva 15 minutos para as preocupações. Escreve cada uma e o próximo passo possível.", "Se à noite elas voltarem, já tens resposta: estão tratadas, amanhã continuas."],
          tarefa: "Ao fim da tarde: escreve 3 preocupações e o próximo passo de cada uma.",
          escrita: "Preocupação → próximo passo", sessao: ["resp478", "lugar"] },
        { titulo: "Deixar de tentar",
          licao: ["Tentar adormecer é como tentar ter fome: quanto mais forças, mais longe fica.", "Hoje o objetivo é só descansar de olhos fechados. Se o sono vier, ótimo."],
          sessao: ["resp46", "naotentar"] },
        { titulo: "O teu ritual",
          licao: ["Nas últimas noites experimentaste várias técnicas.", "Esta noite a sessão junta as que marcaste como úteis. Este é o teu ritual, para usares sempre que precisares."],
          sessao: ["@favoritas"] }
      ]
    },

    noite: {
      nome: "Acordei a meio da noite",
      unidade: "noite", total: 7,
      paraQuem: "Para quem adormece, mas acorda de madrugada e fica a pensar se vai conseguir voltar a dormir.",
      inclui: ["Botão Acordei às 3h, só em áudio e com o ecrã apagado", "7 noites de técnicas e hábitos", "Registo dos despertares no diário"],
      ciencia: "Combina controlo de estímulos, redução da monitorização do relógio, relaxamento e distração cognitiva, componentes usados em intervenções comportamentais para o sono.",
      refs: ["Edinger et al., 2021 — Journal of Clinical Sleep Medicine (diretriz AASM)", "Tang, Schmidt & Harvey, 2007 — efeito de ver as horas no adormecer", "Soh et al., 2020 — Sleep Medicine (programas digitais)"],
      unidades: [
        { titulo: "Esconder o relógio",
          licao: ["Ver as horas a meio da noite liga um cálculo: quanto falta, quanto já perdi. Isso acorda mais.", "Hoje vira o relógio para a parede e deixa o telemóvel com o ecrã para baixo."],
          tarefa: "Vira o relógio e põe o telemóvel em modo noturno.", sessao: ["resp46", "bodyscan"] },
        { titulo: "O corpo pesado",
          licao: ["Quando acordas, o corpo costuma ficar em alerta.", "Percorrer o corpo devagar, parte a parte, ajuda a baixar esse alerta."],
          sessao: ["bodyscan", "resp46"] },
        { titulo: "Quando a cabeça arranca às 3h",
          licao: ["De madrugada, os problemas parecem maiores do que de dia. A cabeça cansada exagera.", "Não é hora de resolver nada. Dá-lhe imagens leves em vez de problemas."],
          sessao: ["resp46", "palavras"] },
        { titulo: "A regra do quarto de hora",
          licao: ["Se sentires que estás acordado há muito tempo, sem ver as horas, levanta-te.", "Vai para outra divisão com luz baixa, faz algo calmo e volta só quando tiveres sono. A cama volta a ser lugar de dormir, não de lutar."],
          tarefa: "Prepara uma manta e um livro calmo noutra divisão.", sessao: ["resp478", "lugar"] },
        { titulo: "A cama é para dormir",
          licao: ["Se usas a cama para trabalhar, ver séries ou fazer scroll, a cabeça associa-a a estar acordado.", "Durante esta semana, a cama é só para dormir e para a intimidade."],
          sessao: ["resp46", "lugar"] },
        { titulo: "Aceitar estar acordado",
          licao: ["Ficar deitado tranquilo, de olhos fechados, também descansa.", "Quando deixas de ter medo de estar acordado, voltar a adormecer fica mais fácil."],
          sessao: ["naotentar", "resp46"] },
        { titulo: "Ler os teus padrões",
          licao: ["Olha para o teu diário desta semana: em que noites acordaste menos? O que foi diferente nesse dia?", "A sessão desta noite junta as técnicas que marcaste como úteis."],
          sessao: ["@favoritas"] }
      ]
    },

    horario: {
      nome: "Regularizar o horário",
      unidade: "dia", total: 14,
      paraQuem: "Para quem se deita e acorda a horas muito diferentes e anda sempre cansado.",
      inclui: ["14 dias com um hábito por dia", "Registo das horas de deitar e acordar", "Revisão da regularidade a cada semana"],
      ciencia: "Baseia-se na regularidade dos horários, na exposição à luz da manhã e em hábitos de preparação para dormir, usados como parte de programas comportamentais de sono.",
      refs: ["Edinger et al., 2021 — Journal of Clinical Sleep Medicine (diretriz AASM)", "Soh et al., 2020 — Sleep Medicine (programas digitais)"],
      unidades: [
        { titulo: "A hora de acordar", licao: ["O ponto de partida não é a hora de deitar: é a hora de acordar.", "Escolhe uma hora que consigas cumprir todos os dias, incluindo o fim de semana."], tarefa: "Escolhe a tua hora de acordar e põe o despertador para ela, todos os dias.", sessao: ["resp46"] },
        { titulo: "Luz logo de manhã", licao: ["A luz da manhã acerta o relógio interno.", "Nos primeiros momentos do dia, vai à janela ou dá uma volta curta lá fora."], tarefa: "Apanha luz natural até 1 hora depois de acordar.", sessao: ["resp46"] },
        { titulo: "A hora de abrandar", licao: ["O corpo não desliga de repente.", "Reserva 30 a 60 minutos antes de deitar com luz baixa e atividades calmas."], tarefa: "Define a hora a que começa o teu abrandar.", sessao: ["resp46", "bodyscan"] },
        { titulo: "Só deitar com sono", licao: ["Deitar cedo demais para \"apanhar\" sono costuma dar o contrário: horas acordado na cama.", "Deita-te quando sentires sono, não só cansaço."], sessao: ["resp46", "palavras"] },
        { titulo: "Cafeína com hora marcada", licao: ["A cafeína fica no corpo muitas horas.", "Experimenta deixar o café, o chá preto e as bebidas energéticas para a manhã."], tarefa: "Último café antes do almoço.", sessao: ["resp46"] },
        { titulo: "Sestas curtas", licao: ["Uma sesta longa ou tardia rouba sono à noite.", "Se precisares, faz uma sesta curta, de 20 a 30 minutos, e antes do meio da tarde."], sessao: ["resp46", "bodyscan"] },
        { titulo: "Primeira semana", licao: ["Olha para o teu registo: os teus horários estão mais próximos?", "Não precisa de ser perfeito. Uma diferença menor entre os dias já conta."], revisao: true, sessao: ["resp46", "lugar"] },
        { titulo: "Fim de semana sem desacertos", licao: ["Dormir até muito tarde ao fim de semana é como mudar de fuso horário.", "Tenta acordar até 1 hora depois do habitual."], sessao: ["resp46"] },
        { titulo: "Jantar e álcool", licao: ["Refeições pesadas e álcool perto de deitar tornam o sono mais leve e partido.", "Experimenta jantar mais cedo e deixar o álcool longe da hora de deitar."], sessao: ["resp46", "bodyscan"] },
        { titulo: "Mexer o corpo", licao: ["O exercício regular ajuda a dormir.", "Prefere fazê-lo durante o dia e deixa o esforço intenso longe da hora de deitar."], sessao: ["pmr"] },
        { titulo: "Ecrãs em modo noite", licao: ["Notificações e conteúdos que prendem a atenção atrasam o sono.", "Liga o modo de foco à hora de abrandar."], tarefa: "Programa o modo noturno do telemóvel.", sessao: ["resp46", "palavras"] },
        { titulo: "O quarto", licao: ["Escuro, silencioso e fresco.", "Repara no que te incomoda: luz da rua, barulho, calor. Resolve uma coisa esta semana."], sessao: ["resp46", "lugar"] },
        { titulo: "Dias difíceis", licao: ["Jantares, viagens e noites curtas vão acontecer.", "O plano é simples: no dia seguinte, acorda à hora de sempre e retoma."], sessao: ["resp46", "naotentar"] },
        { titulo: "Duas semanas", licao: ["Compara as duas semanas no teu registo.", "Mantém a hora de acordar. É o hábito que segura todos os outros."], revisao: true, sessao: ["@favoritas"] }
      ]
    }
  };

  /* Ferramentas gratuitas */
  const GRATIS = {
    respirar: { nome: "Respirar para adormecer", sessao: ["resp478", "bodyscan"] },
    acordei:  { nome: "Acordei às 3h", sessao: ["acordei"], semAbertura: true, usosGratis: 2 }
  };

  window.APAGA_CONTEUDO = { PALAVRAS, TECNICAS, PROGRAMAS, GRATIS };
})();
