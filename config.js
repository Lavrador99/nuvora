/*
  APAGA — CONFIGURAÇÃO
  Este é o único ficheiro que precisas de editar para lançar.
  Lê o LEIA-ME.md antes de mudar o "modo" para "venda".
*/
window.APAGA_CONFIG = {

  /* "pre-venda": os botões de compra registam o interesse e mostram a lista de espera (não cobra nada).
     "venda": os botões abrem o pagamento Stripe. Só mudar DEPOIS de abrir atividade nas Finanças. */
  modo: "pre-venda",

  /* Endereço onde o site fica publicado (sem barra no fim). Ex.: "https://apaga.pt" */
  urlSite: "https://apaga.pt",

  /* Identificação do vendedor — obrigatória nos termos antes de vender */
  vendedor: {
    nome: "[O TEU NOME COMPLETO]",
    nif: "[NIF]",
    morada: "[MORADA FISCAL]",
    email: "ola@apaga.pt",
    regimeIva: "IVA – regime de isenção (art. 53.º do CIVA)"
  },

  /* Entidade de resolução alternativa de litígios (confirmar em consumidor.gov.pt) */
  ral: {
    nome: "CNIACC – Centro Nacional de Informação e Arbitragem de Conflitos de Consumo",
    site: "https://www.cniacc.pt"
  },

  /* Preços (em euros, IVA incluído) e links de pagamento Stripe (Payment Links).
     No Stripe, em "Após o pagamento", escolhe "Redirecionar" para:
     https://O-TEU-SITE/?compra=ID&sessao={CHECKOUT_SESSION_ID}
     trocando ID por mente, noite, horario ou pack. */
  produtos: {
    mente:   { preco: 9.99,  linkStripe: "" },
    noite:   { preco: 9.99,  linkStripe: "" },
    horario: { preco: 14.99, linkStripe: "" },
    pack:    { preco: 24.99, linkStripe: "" }
  },

  /* Garantia mostrada antes de comprar */
  garantiaDias: 14,

  /* Lista de espera para o modo pré-venda (ex.: link de um Google Form com o email). Vazio = sem botão. */
  listaEsperaUrl: "",
  descontoPreVenda: "30%",

  /* Analítica de adesão — Umami Cloud (gratuito, sem cookies).
     Cria o site em cloud.umami.is e cola aqui o "Website ID". Vazio = desligado. */
  umamiWebsiteId: "",
  umamiScript: "https://cloud.umami.is/script.js",

  /* Envio opcional do diário para um Google Form (para o teste com testadores).
     Deixa url vazio para desligar. Os entry IDs vêm do "link pré-preenchido" do formulário. */
  formularioDiario: {
    url: "",
    campos: { codigo: "", latencia: "", despertares: "", sensacao: "" }
  }
};
