/* APAGA — aplicação (PWA estática, sem servidor) */
(function () {
"use strict";
const CFG = window.APAGA_CONFIG;
const { PALAVRAS, TECNICAS, PROGRAMAS, GRATIS } = window.APAGA_CONTEUDO;
const PROG_IDS = Object.keys(PROGRAMAS);
const $ = s => document.querySelector(s);
const app = $("#app");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = v => v.toFixed(2).replace(".", ",") + " €";
const hoje = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

/* ---------------- Estado (guardado só neste dispositivo) ---------------- */
const KEY = "apaga.v2";
function novoEstado() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "AP-"; for (let i = 0; i < 5; i++) id += abc[Math.floor(Math.random() * abc.length)];
  return { id, perfil: null, consent: false, compras: {}, recibos: [], progresso: {}, ativo: null,
    avaliacoes: {}, diario: [], fechar: null, interesse: {}, usosAcordei: 0,
    prefs: { voz: true, ruido: true, escuro: false, vozNome: "" }, criado: hoje() };
}
let S = novoEstado();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(novoEstado(), JSON.parse(raw)); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------------- Analítica de adesão (Umami, sem cookies) ---------------- */
if (CFG.umamiWebsiteId) {
  const s = document.createElement("script");
  s.defer = true; s.src = CFG.umamiScript; s.setAttribute("data-website-id", CFG.umamiWebsiteId);
  document.head.appendChild(s);
}
function track(nome, dados) {
  try { if (window.umami && typeof window.umami.track === "function") window.umami.track(nome, dados || {}); } catch (e) {}
}

/* ---------------- Utilidades ---------------- */
let toastT;
function toast(msg) {
  let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
}
const possui = id => !!(S.compras[id] || S.compras.pack);
function prog(id) { return PROGRAMAS[id]; }
function feitas(id) { return (S.progresso[id] && S.progresso[id].feitas) || []; }
function proximaUnidade(id) { const f = feitas(id); for (let i = 1; i <= prog(id).total; i++) if (!f.includes(i)) return i; return null; }
function unidadeAberta(id, n) {
  if (n > 1 && !possui(id)) return false;
  const f = feitas(id); return n === 1 || f.includes(n) || f.includes(n - 1);
}
function U(id) { return prog(id).unidade === "dia" ? "Dia" : "Noite"; }

/* ---------------- Navegação ---------------- */
let vista = "home", params = {};
function go(v, p) {
  pararSessao(false);
  vista = v; params = p || {};
  render(); window.scrollTo(0, 0);
}
function cab(voltar) {
  return `<div class="topbar">
    <button class="brand" data-act="home" aria-label="Início"><span class="dot" aria-hidden="true"></span>Apaga</button>
    ${voltar === false ? "" : `<button class="iconbtn" data-act="ajustes">Ajustes</button>`}
  </div>`;
}
function rodape() {
  return `<footer>
    <span>O Apaga é um programa de bem-estar para criar hábitos de relaxamento e rotinas de sono. Não é um dispositivo médico nem substitui aconselhamento médico.</span>
    <div class="row">
      <button data-act="legal" data-p="termos">Termos e condições</button>
      <button data-act="legal" data-p="privacidade">Privacidade</button>
      <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener">Livro de Reclamações</a>
    </div>
  </footer>`;
}

function render() {
  const V = { onb: vOnb, home: vHome, prog: vProg, unidade: vUnidade, sessao: vSessao, avaliar: vAvaliar,
    fechar: vFechar, diario: vDiario, ajustes: vAjustes, legal: vLegal, obrigado: vObrigado };
  app.innerHTML = (V[vista] || vHome)();
  if (vista === "home") desenharGrafico();
  if (vista === "ajustes") carregarVozes();
}

/* ---------------- Diagnóstico ---------------- */
const OBST = [
  ["mente", "A cabeça não desliga quando me deito"],
  ["noite", "Adormeço, mas acordo a meio da noite"],
  ["horario", "Os meus horários de dormir variam muito"],
  ["corpo", "Sinto o corpo tenso ou agitado à noite"]
];
const TRIAGEM = [
  "Ressonas muito alto ou já te disseram que paras de respirar a dormir?",
  "Já adormeceste a conduzir ou em situações perigosas?",
  "Nas últimas semanas tens-te sentido muito em baixo ou sem esperança?",
  "Estás grávida ou trabalhas por turnos noturnos?"
];
let onb = { passo: 0, obst: null, tempo: null };
function recomendar(o) { return o === "corpo" ? "mente" : o; }
function vOnb() {
  const p = onb.passo;
  if (p === 0) return `${cab(false)}
    <div class="stack"><p class="eyebrow">Diagnóstico de hábitos · 1 de 3</p><h1>O que mais te impede de dormir bem?</h1></div>
    <div class="opts">${OBST.map(([v, l]) => `<button class="opt" data-act="onb-obst" data-p="${v}">${l}</button>`).join("")}</div>
    <p class="small muted">Demora 1 minuto. As respostas ficam guardadas só neste telemóvel.</p>${rodape()}`;
  if (p === 1) return `${cab(false)}
    <div class="stack"><p class="eyebrow">Diagnóstico de hábitos · 2 de 3</p><h1>Há quanto tempo dormes assim?</h1></div>
    <div class="opts">${[["<1", "Há menos de um mês"], ["1-3", "Entre 1 e 3 meses"], [">3", "Há mais de 3 meses"]].map(([v, l]) => `<button class="opt" data-act="onb-tempo" data-p="${v}">${l}</button>`).join("")}</div>`;
  if (p === 2) return `${cab(false)}
    <div class="stack"><p class="eyebrow">Diagnóstico de hábitos · 3 de 3</p><h1>Algumas perguntas de segurança</h1>
    <p class="muted">Servem só para saber se te devemos sugerir falar com um médico. Não fazemos diagnósticos clínicos.</p></div>
    <div class="stack">${TRIAGEM.map((t, i) => `<label class="check"><input type="checkbox" id="tri-${i}"><span>${t}</span></label>`).join("")}</div>
    <button class="btn" data-act="onb-tri">Ver o meu resultado</button>`;
  const P = S.perfil, rec = prog(P.recomendado), aviso = P.triagem.some(Boolean);
  return `${cab(false)}
    <div class="stack"><p class="eyebrow">O teu resultado</p><h1>Recomendamos: ${esc(rec.nome)}</h1>
    <p class="note">${esc(rec.paraQuem)}</p></div>
    ${P.obstaculo === "corpo" ? `<p class="small muted">Para o corpo tenso, este programa inclui relaxamento muscular, respiração e o corpo pesado. Tens também a sessão grátis Respirar para adormecer.</p>` : ""}
    ${P.tempo === ">3" ? `<p class="small muted">Como isto dura há mais de 3 meses, vale a pena falar também com o teu médico de família. O Apaga pode ser um apoio, não um substituto.</p>` : ""}
    ${aviso ? `<div class="warn">Pelas tuas respostas, recomendamos que fales com o teu médico de família sobre o teu sono. Podes usar o Apaga como apoio ao relaxamento, mas ele não substitui essa conversa.</div>` : ""}
    <label class="check"><input type="checkbox" id="consent"><span class="small">Aceito que as minhas respostas sobre sono fiquem guardadas neste telemóvel para personalizar o programa. Posso apagá-las a qualquer momento nos Ajustes.</span></label>
    <button class="btn" data-act="onb-fim" id="onb-fim" disabled>Começar a primeira noite grátis</button>
    <button class="link" data-act="onb-fim-cat" id="onb-fim-cat" disabled>Ver todos os programas</button>`;
}

/* ---------------- Início ---------------- */
function saudacao() { const h = new Date().getHours(); return h < 6 ? "Ainda acordado" : h < 13 ? "Bom dia" : h < 20 ? "Boa tarde" : "Boa noite"; }
function vHome() {
  const ativo = S.ativo || (S.perfil && S.perfil.recomendado) || "mente";
  const P = prog(ativo), n = proximaUnidade(ativo), f = feitas(ativo);
  const aberta = n && unidadeAberta(ativo, n);
  const ult = S.diario[S.diario.length - 1];
  let dica = "";
  if (ult && ult.data === hoje() && ult.lat >= 45) {
    const sug = ["resp478", "palavras", "bodyscan"][S.diario.length % 3];
    dica = `<div class="card"><p class="eyebrow">Para esta noite</p><p>A noite passada demoraste a adormecer. Hoje experimenta uma técnica diferente: <b>${esc(TECNICAS[sug].nome)}</b>.</p>
      <button class="btn ghost" data-act="sessao-livre" data-p="${sug}">Experimentar agora</button></div>`;
  }
  const manha = new Date().getHours() >= 5 && new Date().getHours() < 13 && !(ult && ult.data === hoje());
  return `${cab()}
  <div class="stack-s"><p class="eyebrow">${saudacao()}</p>
    <h1>${manha ? "Como foi a noite? Regista no diário." : (new Date().getHours() < 13 && new Date().getHours() >= 5 ? "Noite registada. Até logo à noite." : "Fecha o dia e deixa o telemóvel apagar-se.")}</h1></div>
  ${manha ? `<button class="btn" data-act="diario">Registar a noite (10 segundos)</button>` : ""}
  <div class="card">
    <div class="between"><h3>${esc(P.nome)}</h3>${possui(ativo) ? `<span class="pill own">Teu</span>` : `<span class="pill">1.ª ${U(ativo).toLowerCase()} grátis</span>`}</div>
    <div class="progress" style="grid-template-columns:repeat(${P.total},1fr)" aria-label="${f.length} de ${P.total} feitas">${Array.from({ length: P.total }, (_, i) => `<i class="${f.includes(i + 1) ? "done" : (i + 1 === n ? "now" : "")}"></i>`).join("")}</div>
    ${n ? `<p class="small muted">${U(ativo)} ${n} de ${P.total} · ${esc(P.unidades[n - 1].titulo)}</p>
      ${aberta ? `<button class="btn" data-act="unidade" data-p="${ativo}" data-n="${n}">Abrir ${U(ativo).toLowerCase()} ${n}</button>`
               : `<button class="btn" data-act="comprar" data-p="${ativo}">Continuar o programa · ${eur(CFG.produtos[ativo].preco)}</button>`}`
        : `<p class="small muted">Programa concluído. Podes repetir qualquer ${U(ativo).toLowerCase()} ou experimentar outro programa.</p>
      <button class="btn ghost" data-act="prog" data-p="${ativo}">Ver o programa</button>`}
  </div>
  ${dica}
  <div class="tiles">
    <button class="tile" data-act="fechar"><span class="when">1h antes · grátis</span><b>Fechar o dia</b><span>Arruma a cabeça em 5 minutos</span></button>
    <button class="tile" data-act="sessao-gratis" data-p="respirar"><span class="when">Na cama · grátis</span><b>Respirar para adormecer</b><span>Sessão de 5 minutos</span></button>
    <button class="tile" data-act="sessao-gratis" data-p="acordei"><span class="when">A meio da noite</span><b>Acordei às 3h</b><span>${possui("noite") ? "Ecrã apagado, só voz" : "Experimenta grátis"}</span></button>
    <button class="tile" data-act="diario"><span class="when">De manhã</span><b>Diário</b><span>3 toques</span></button>
  </div>
  <div class="stack">
    <div class="between"><h3>Programas</h3>${!S.compras.pack && !PROG_IDS.every(possui) ? `<button class="link" data-act="comprar" data-p="pack">Os 3 por ${eur(CFG.produtos.pack.preco)}</button>` : ""}</div>
    ${PROG_IDS.map(id => cartaoProg(id)).join("")}
  </div>
  <div class="stack">
    <div class="between"><h3>Tempo para adormecer</h3><span class="small muted" id="chart-tag"></span></div>
    <svg class="chart" id="chart" viewBox="0 0 400 170" role="img" aria-label="Minutos até adormecer por noite"></svg>
    <p class="small muted" id="chart-note"></p>
  </div>
  ${instalarHtml()}
  ${rodape()}`;
}
function cartaoProg(id) {
  const P = prog(id), rec = S.perfil && S.perfil.recomendado === id;
  const estado = possui(id) ? `<span class="pill own">Teu</span>` : rec ? `<span class="pill rec">Recomendado</span>` : `<span class="pill">${eur(CFG.produtos[id].preco)}</span>`;
  return `<button class="prog" data-act="prog" data-p="${id}">
    <div class="between"><b style="font-family:var(--display);font-weight:400;font-size:1.1rem">${esc(P.nome)}</b>${estado}</div>
    <span class="small muted">${esc(P.paraQuem)}</span>
    <div class="meta"><span>${P.total} ${P.unidade === "dia" ? "dias" : "noites"} · ${feitas(id).length} feitas</span><span>${possui(id) ? "" : "1.ª grátis"}</span></div>
  </button>`;
}
function desenharGrafico() {
  const svg = $("#chart"); if (!svg) return;
  const real = S.diario.slice(-14), amostra = [60, 45, 45, 35, 40, 22, 22, 10].map(l => ({ lat: l }));
  const isAm = real.length < 2, data = isAm ? amostra : real;
  $("#chart-tag").textContent = isAm ? "Exemplo" : "Últimas " + data.length + " noites";
  let nota = "Gráfico de exemplo. Os teus números aparecem aqui depois de 2 manhãs no diário.";
  if (!isAm) {
    const h = Math.ceil(data.length / 2), m = x => x.reduce((s, d) => s + d.lat, 0) / x.length;
    const diff = Math.round((1 - m(data.slice(h)) / m(data.slice(0, h))) * 100);
    nota = diff > 0 ? `Nas noites mais recentes adormeceste ${diff}% mais depressa.` : "Ainda sem melhoria visível. É normal nas primeiras noites.";
  }
  $("#chart-note").textContent = nota;
  const W = 400, H = 170, L = 34, B = 24, T = 10, max = 80, y = v => T + (H - T - B) * (1 - v / max), bw = (W - L - 8) / data.length;
  let s = "";
  [0, 20, 40, 60, 80].forEach(v => { s += `<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 4}" fill="var(--muted)" font-size="10" text-anchor="end" font-family="Figtree,sans-serif">${v}</text>`; });
  data.forEach((d, i) => { const x = L + 4 + i * bw, last = i === data.length - 1; s += `<rect x="${x + bw * .18}" y="${y(d.lat)}" width="${bw * .64}" height="${y(0) - y(d.lat)}" rx="3" fill="${last ? "var(--accent)" : "var(--breath)"}" opacity="${isAm ? .45 : last ? 1 : .75}"/>`; });
  s += `<text x="${L}" y="${H - 6}" fill="var(--muted)" font-size="10" font-family="Figtree,sans-serif">minutos até adormecer, por noite</text>`;
  svg.innerHTML = s;
}

/* ---------------- Programa ---------------- */
function vProg() {
  const id = params.p, P = prog(id), f = feitas(id), dono = possui(id);
  return `${cab()}
  <button class="link back" data-act="home">← Início</button>
  <div class="stack"><p class="eyebrow">${P.total} ${P.unidade === "dia" ? "dias" : "noites"}</p><h1>${esc(P.nome)}</h1><p class="muted">${esc(P.paraQuem)}</p></div>
  <ul class="clean small">${P.inclui.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
  ${dono ? "" : `<div class="card"><div class="between"><span class="price">${eur(CFG.produtos[id].preco)}</span><span class="small muted">pagamento único</span></div>
     <button class="btn" data-act="comprar" data-p="${id}">${CFG.modo === "venda" ? "Comprar o programa" : "Reservar o programa"}</button>
     <p class="small muted">A ${U(id).toLowerCase()} 1 é grátis. Experimenta antes de decidir.</p></div>`}
  <ol class="units" aria-label="Unidades do programa">
  ${P.unidades.map((u, i) => {
    const n = i + 1, ok = unidadeAberta(id, n), done = f.includes(n);
    return `<li><button class="unit ${done ? "done" : ""} ${ok ? "" : "locked"}" data-act="${ok ? "unidade" : (dono ? "bloqueada" : "comprar")}" data-p="${id}" data-n="${n}">
      <span class="n">${n}</span><span class="tt">${esc(u.titulo)}</span><span class="st">${done ? "Feita" : ok ? (n === 1 && !dono ? "Grátis" : "Abrir") : (dono ? "Depois da " + (n - 1) : "Bloqueada")}</span></button></li>`;
  }).join("")}
  </ol>
  <details class="small"><summary class="muted">Em que se baseia</summary>
    <div class="stack" style="margin-top:10px"><p>${esc(P.ciencia)}</p><ul class="clean muted">${P.refs.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
    <p class="muted">A combinação usada no Apaga é um programa de bem-estar e não foi avaliada como tratamento.</p></div></details>
  ${rodape()}`;
}

/* ---------------- Unidade (noite / dia) ---------------- */
function vUnidade() {
  const id = params.p, n = +params.n, P = prog(id), u = P.unidades[n - 1], done = feitas(id).includes(n);
  if (S.ativo !== id) { S.ativo = id; save(); }
  return `${cab()}
  <button class="link back" data-act="prog" data-p="${id}">← ${esc(P.nome)}</button>
  <div class="stack"><p class="eyebrow">${U(id)} ${n} de ${P.total}</p><h1>${esc(u.titulo)}</h1></div>
  <div class="stack">${u.licao.map(l => `<p>${esc(l)}</p>`).join("")}</div>
  ${u.tarefa ? `<label class="task"><input type="checkbox" id="tarefa" ${S.progresso[id] && S.progresso[id]["t" + n] ? "checked" : ""}><span><b>Para hoje:</b> ${esc(u.tarefa)}</span></label>` : ""}
  ${u.escrita ? `<div class="stack"><label for="escrita" class="small muted">${esc(u.escrita)}</label>
    <textarea id="escrita" placeholder="Apresentação de quinta → abrir o ficheiro às 9h">${esc((S.progresso[id] && S.progresso[id]["e" + n]) || "")}</textarea></div>` : ""}
  ${u.revisao ? revisaoHorarios() : ""}
  ${id === "horario" ? `<p class="small muted">Regista no diário a que horas te deitaste e acordaste.</p>` : ""}
  <button class="btn" data-act="sessao-unidade" data-p="${id}" data-n="${n}">Começar a sessão na cama</button>
  ${done ? `<p class="small muted">Já fizeste esta ${U(id).toLowerCase()}. Podes repetir a sessão quando quiseres.</p>`
         : `<button class="link" data-act="marcar" data-p="${id}" data-n="${n}">Marcar como feita sem a sessão</button>`}
  ${rodape()}`;
}
function revisaoHorarios() {
  const reg = S.diario.filter(d => d.acordar).slice(-7);
  if (reg.length < 2) return `<p class="note">Ainda não tens horas registadas suficientes. Usa o diário de manhã para registar quando te deitaste e acordaste.</p>`;
  const mins = reg.map(d => { const [h, m] = d.acordar.split(":").map(Number); return h * 60 + m; });
  const var_ = Math.max(...mins) - Math.min(...mins);
  const fmt = m => Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0");
  return `<div class="card"><p class="eyebrow">A tua regularidade</p><p>Nos últimos ${reg.length} registos, a hora de acordar variou <b>${var_} minutos</b> (entre ${fmt(Math.min(...mins))} e ${fmt(Math.max(...mins))}).</p>
    <p class="small muted">${var_ <= 60 ? "Muito bom: menos de 1 hora de diferença." : "O objetivo é aproximar estas horas, pouco a pouco."}</p></div>`;
}

/* ---------------- Fechar o dia ---------------- */
let fd = { passo: 0, itens: [] };
function vFechar() {
  if (fd.passo === 0) return `${cab()}
    <button class="link back" data-act="home">← Início</button>
    <div class="stack"><p class="eyebrow">Fechar o dia · 1 de 3</p><h1>Tira da cabeça tudo o que está a ocupar espaço.</h1>
    <p class="muted">Uma coisa por linha: tarefas, preocupações, conversas pendentes. Não precisas de resolver nada agora.</p></div>
    <label class="small muted" for="despejo">O que tens na cabeça</label>
    <textarea id="despejo" placeholder="Ligar ao contabilista&#10;Apresentação de quinta&#10;A conversa com a Marta">${esc(fd.itens.map(i => i.t).join("\n"))}</textarea>
    <button class="btn" data-act="fd-1">Continuar</button>`;
  if (fd.passo === 1) return `${cab()}
    <div class="stack"><p class="eyebrow">Fechar o dia · 2 de 3</p><h1>O que depende de ti?</h1>
    <p class="muted">Marca as que podes mesmo fazer alguma coisa. As outras ficam escritas aqui, e por hoje chega.</p></div>
    <div class="stack">${fd.itens.map((it, i) => `<label class="check"><input type="checkbox" id="ctl-${i}" ${it.ctl ? "checked" : ""}><span>${esc(it.t)}</span></label>`).join("")}</div>
    <button class="btn" data-act="fd-2">Continuar</button>`;
  if (fd.passo === 2) {
    const ctl = fd.itens.map((it, i) => ({ ...it, i })).filter(it => it.ctl);
    return `${cab()}
    <div class="stack"><p class="eyebrow">Fechar o dia · 3 de 3</p><h1>O primeiro passo de amanhã</h1>
    <p class="muted">Escolhe até 3 prioridades e escreve só o primeiro passo de cada uma.</p></div>
    ${ctl.length ? `<ul class="list">${ctl.slice(0, 3).map(it => `<li><b>${esc(it.t)}</b><input type="text" id="passo-${it.i}" placeholder="Ex.: enviar o email às 9h" value="${esc(it.passo || "")}"></li>`).join("")}</ul>`
                 : `<p class="note">Nada para fazer amanhã a partir desta lista. Boa notícia: podes largar tudo por hoje.</p>`}
    <button class="btn" data-act="fd-3">Está arrumado</button>`;
  }
  return `${cab()}
    <div class="stack"><p class="eyebrow">Dia fechado</p><h1>O resto fica para amanhã.</h1>
    <p class="muted">Se alguma destas coisas voltar quando te deitares, lembra-te: já está escrita e tem um primeiro passo.</p></div>
    <button class="btn" data-act="sessao-gratis" data-p="respirar">Respirar 1 minuto antes de largar o telemóvel</button>
    <button class="btn ghost" data-act="home">Voltar ao início</button>`;
}

/* ---------------- Diário ---------------- */
let dia = {};
function vDiario() {
  const usaHoras = S.ativo === "horario" || possui("horario") && feitas("horario").length;
  const ult = S.diario.find(d => d.data === hoje());
  const q = (k, titulo, ops) => `<div class="stack"><h3>${titulo}</h3><div class="row" data-q="${k}">${ops.map(([v, l]) => `<button class="opt" data-act="dia-op" data-q="${k}" data-p="${v}" aria-pressed="${dia[k] === v}">${l}</button>`).join("")}</div></div>`;
  return `${cab()}
  <button class="link back" data-act="home">← Início</button>
  <div class="stack"><p class="eyebrow">Diário da manhã</p><h2>Como foi a noite?</h2>
  ${ult ? `<p class="small muted">Já registaste hoje. Se gravares outra vez, substitui o registo de hoje.</p>` : ""}</div>
  ${q("lat", "Quanto demoraste a adormecer?", [[10, "&lt; 15 min"], [22, "15–30"], [45, "30–60"], [75, "&gt; 1 h"]])}
  ${q("desp", "Quantas vezes acordaste?", [[0, "0"], [1, "1"], [2, "2"], [3, "3+"]])}
  ${q("sens", "Como te sentes?", [[1, "Pesado"], [2, "Mais ou menos"], [3, "Bem"], [4, "Ótimo"]])}
  ${usaHoras ? `<div class="row"><label class="stack-s" style="flex:1"><span class="small muted">Deitei-me às</span><input type="time" id="h-deitar" value="${esc(dia.deitar || "")}"></label>
    <label class="stack-s" style="flex:1"><span class="small muted">Acordei às</span><input type="time" id="h-acordar" value="${esc(dia.acordar || "")}"></label></div>` : ""}
  <button class="btn" data-act="dia-gravar">Guardar a noite</button>`;
}

/* ---------------- Ajustes ---------------- */
function vAjustes() {
  const P = S.prefs;
  return `${cab(false)}
  <button class="link back" data-act="home">← Início</button>
  <div class="stack"><p class="eyebrow">Ajustes</p><h2>Som, voz e dados</h2></div>
  <div>
    <div class="toggle"><label for="p-voz">Voz guiada<br><span class="small muted">Usa a voz do teu telemóvel até termos as gravações.</span></label><input type="checkbox" class="sw" id="p-voz" data-pref="voz" ${P.voz ? "checked" : ""}></div>
    <div class="toggle"><label for="p-ruido">Ruído castanho de fundo<br><span class="small muted">Som grave e contínuo que se desliga sozinho.</span></label><input type="checkbox" class="sw" id="p-ruido" data-pref="ruido" ${P.ruido ? "checked" : ""}></div>
    <div class="toggle"><label for="p-escuro">Apagar o ecrã ao começar<br><span class="small muted">Recomendado. Menos luz, menos tentação.</span></label><input type="checkbox" class="sw" id="p-escuro" data-pref="escuro" ${P.escuro ? "checked" : ""}></div>
  </div>
  <div class="stack-s"><label for="p-vozNome" class="small muted">A voz mais calma do teu telemóvel</label>
    <select id="p-vozNome"><option value="">Voz padrão</option></select>
    <div class="row"><button class="btn ghost" style="flex:1" data-act="ouvir-voz">Ouvir a voz</button><button class="btn ghost" style="flex:1" data-act="ouvir-ruido">Ouvir o ruído</button></div>
  </div>
  ${instalarHtml(true)}
  <div class="stack-s"><h3>As tuas compras</h3>
    <p class="small muted">${Object.keys(S.compras).length ? "Desbloqueado neste telemóvel: " + Object.keys(S.compras).map(k => k === "pack" ? "os 3 programas" : prog(k).nome).join(", ") + "." : "Ainda não compraste nenhum programa neste telemóvel."}</p>
    <p class="small muted">Mudaste de telemóvel ou apagaste os dados? Escreve para <b>${esc(CFG.vendedor.email)}</b> com o email da compra e enviamos-te o link para recuperar o acesso.</p>
    <p class="small muted">O teu código anónimo: <b>${esc(S.id)}</b></p></div>
  <div class="stack-s"><h3>Os teus dados</h3>
    <p class="small muted">O diário e as respostas ficam guardados só neste telemóvel.</p>
    <button class="link" data-act="apagar">Apagar todos os meus dados</button>
    <div id="apagar-conf" class="warn" hidden><p>Isto apaga o diagnóstico, o progresso e o diário deste telemóvel. As compras também deixam de aparecer aqui.</p>
      <div class="row" style="margin-top:10px"><button class="opt" data-act="apagar-sim">Apagar tudo</button><button class="opt" data-act="apagar-nao">Cancelar</button></div></div>
  </div>
  ${rodape()}`;
}

/* ---------------- Instalar a app ---------------- */
let promptInstalar = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); promptInstalar = e; if (vista === "home" || vista === "ajustes") render(); });
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
function instalarHtml(sempre) {
  if (standalone()) return "";
  if (promptInstalar) return `<button class="btn ghost" data-act="instalar">Instalar o Apaga no ecrã principal</button>`;
  if (ios || sempre) return `<p class="small muted">Para usar como app: no Safari, toca em Partilhar e depois em <b>Adicionar ao ecrã principal</b>. No Android, abre o menu do Chrome e escolhe <b>Instalar app</b>.</p>`;
  return "";
}

/* ---------------- Compra ---------------- */
function abrirFolha(html) { $("#sheet").innerHTML = html; $("#sheet").hidden = false; $("#sheet-bg").hidden = false; }
function fecharFolha() { $("#sheet").hidden = true; $("#sheet-bg").hidden = true; }
function folhaCompra(id) {
  const pack = id === "pack", nome = pack ? "Os 3 programas" : prog(id).nome, pr = CFG.produtos[id];
  track("compra_vista", { produto: id, modo: CFG.modo });
  if (CFG.modo !== "venda") {
    S.interesse[id] = true; save(); track("pre_reserva", { produto: id });
    return abrirFolha(`<p class="eyebrow">Pré-lançamento</p><h2>${esc(nome)}</h2>
      <p>Os programas completos abrem em breve, por <b>${eur(pr.preco)}</b>, em pagamento único.</p>
      <p class="muted">Quem reservar agora fica com ${esc(CFG.descontoPreVenda)} de desconto no lançamento. Enquanto isso, a primeira ${pack ? "noite de cada programa é" : U(id).toLowerCase() + " é"} grátis.</p>
      ${CFG.listaEsperaUrl ? `<a class="btn" href="${esc(CFG.listaEsperaUrl)}" target="_blank" rel="noopener" data-act="lista-espera" data-p="${id}">Reservar com desconto</a>` : `<p class="note">Registámos o teu interesse neste telemóvel.</p>`}
      <button class="btn ghost" data-act="fechar-folha">Voltar</button>`);
  }
  const inclui = pack ? ["A mente não desliga · 7 noites", "Acordei a meio da noite · 7 noites", "Regularizar o horário · 14 dias"] : prog(id).inclui;
  const poupa = pack ? PROG_IDS.reduce((s, k) => s + CFG.produtos[k].preco, 0) - pr.preco : 0;
  abrirFolha(`<p class="eyebrow">Pagamento único · sem subscrição</p><h2>${esc(nome)}</h2>
    <div class="between"><span class="price">${eur(pr.preco)}</span>${pack ? `<span class="pill rec">Poupas ${eur(poupa)}</span>` : ""}</div>
    <ul class="clean small">${inclui.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
    <p class="small muted">Preço final. ${esc(CFG.vendedor.regimeIva)}. Garantia: se o programa não for para ti, devolvemos o valor até ${CFG.garantiaDias} dias após a compra, bastando escrever para ${esc(CFG.vendedor.email)}.</p>
    <label class="check"><input type="checkbox" id="c-termos"><span class="small">Li e aceito os <button class="link" style="padding:0" data-act="legal" data-p="termos">termos e condições</button> e a <button class="link" style="padding:0" data-act="legal" data-p="privacidade">política de privacidade</button>.</span></label>
    <label class="check"><input type="checkbox" id="c-acesso"><span class="small">Peço acesso imediato ao conteúdo digital e reconheço que, ao começar, perco o direito de livre resolução de 14 dias. A garantia de ${CFG.garantiaDias} dias mantém-se.</span></label>
    <button class="btn" id="b-pagar" data-act="pagar" data-p="${id}" disabled>Pagar ${eur(pr.preco)}</button>
    ${!pack && !S.compras.pack ? `<button class="link" data-act="comprar" data-p="pack">Ou os 3 programas por ${eur(CFG.produtos.pack.preco)}</button>` : ""}
    <p class="small muted">O pagamento é feito na página segura da Stripe. Depois voltas automaticamente para aqui.</p>
    <button class="btn ghost" data-act="fechar-folha">Agora não</button>`);
}
function pagar(id) {
  const link = CFG.produtos[id] && CFG.produtos[id].linkStripe;
  if (!link) { toast("O pagamento ainda não está configurado."); return; }
  track("compra_clicada", { produto: id });
  S.pendente = { id, data: Date.now() }; save();
  const sep = link.includes("?") ? "&" : "?";
  window.location.href = link + sep + "client_reference_id=" + encodeURIComponent(S.id) + "&locale=pt";
}
function verificarRegresso() {
  let q; try { q = new URLSearchParams(window.location.search); } catch (e) { return false; }
  const id = q.get("compra");
  if (!id || !(id === "pack" || PROGRAMAS[id])) return false;
  const sessao = q.get("sessao") || "";
  const ja = S.recibos.some(r => r.sessao && r.sessao === sessao);
  if (id === "pack") S.compras.pack = true; else S.compras[id] = true;
  if (!ja) { S.recibos.push({ id, sessao, data: hoje() }); track("compra_concluida", { produto: id }); }
  if (id !== "pack") S.ativo = id;
  delete S.pendente; save();
  try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
  vista = "obrigado"; params = { p: id };
  return true;
}
function vObrigado() {
  const id = params.p, pack = id === "pack", alvo = pack ? (S.ativo || "mente") : id;
  return `${cab()}
  <div class="stack"><p class="eyebrow">Compra concluída</p><h1>Obrigado. ${pack ? "Os 3 programas estão" : "O programa está"} desbloqueado${pack ? "s" : ""}.</h1>
  <p class="muted">Vais receber o recibo da Stripe por email. Guarda-o: é com ele que recuperas o acesso se mudares de telemóvel.</p></div>
  <button class="btn" data-act="prog" data-p="${alvo}">Ir para ${esc(prog(alvo).nome)}</button>
  ${instalarHtml(true)}
  ${rodape()}`;
}

/* ---------------- Páginas legais ---------------- */
function vLegal() {
  const V = CFG.vendedor, pre = CFG.modo !== "venda";
  const id = `<p><b>${esc(V.nome)}</b>, NIF ${esc(V.nif)}, ${esc(V.morada)}. Contacto: ${esc(V.email)}.</p>`;
  const corpo = params.p === "privacidade" ? `
    <h2>Política de privacidade</h2>
    <h3>Quem é responsável</h3>${id}
    <h3>O que fica neste telemóvel</h3><p>O diagnóstico, o diário, o progresso, as listas do Fechar o dia e as tuas preferências ficam guardados apenas no armazenamento deste navegador. Não os recebemos nem os guardamos em servidores nossos.</p>
    <h3>O que nos chega</h3>
    <ul class="clean"><li>Estatísticas de utilização anónimas e sem cookies (por exemplo, quantas sessões foram iniciadas), através do Umami, para melhorarmos o programa. Não incluem as tuas respostas de sono nem dados que te identifiquem.</li>
    <li>Se comprares, os dados de pagamento e o email são tratados pela Stripe, que te envia o recibo. Recebemos o nome, o email e o valor pago para faturação e apoio.</li>
    <li>Só se carregares em "Enviar ao estudo" no diário, as respostas desse dia são enviadas para um formulário nosso, com o teu código anónimo e não com o teu nome.</li></ul>
    <h3>Para que usamos</h3><p>Para prestar o serviço que compraste, cumprir obrigações fiscais e perceber, de forma agregada, como o programa é usado.</p>
    <h3>Os teus direitos</h3><p>Podes pedir acesso, correção ou apagamento dos dados que tenhamos sobre ti, escrevendo para ${esc(V.email)}. Os dados guardados no telemóvel apagas tu, em Ajustes. Podes também reclamar junto da CNPD (www.cnpd.pt).</p>
    <h3>Idade</h3><p>O Apaga destina-se a maiores de 18 anos.</p>` : `
    <h2>Termos e condições</h2>
    ${pre ? `<p class="warn">O Apaga está em pré-lançamento. Ainda não são feitas vendas através desta app.</p>` : ""}
    <h3>1. Quem vende</h3>${id}
    <h3>2. O que é o Apaga</h3><p>Programas digitais de bem-estar com sessões guiadas, exercícios e um diário, para criar hábitos de relaxamento e rotinas de sono. O Apaga não é um dispositivo médico, não faz diagnósticos e não substitui aconselhamento médico. Se tens sintomas persistentes ou preocupantes, fala com um médico.</p>
    <h3>3. Preços e pagamento</h3><p>Os preços são apresentados em euros e são finais. ${esc(V.regimeIva)}. O pagamento é único, sem renovação automática, e é processado pela Stripe. A compra fica associada ao navegador onde a fazes e ao email usado no pagamento.</p>
    <h3>4. Acesso e direito de livre resolução</h3><p>O acesso ao programa é imediato após o pagamento. Ao comprar, pedes expressamente o início imediato do fornecimento do conteúdo digital e reconheces que, por isso, perdes o direito de livre resolução de 14 dias (Decreto-Lei n.º 24/2014, art. 17.º).</p>
    <h3>5. Garantia de satisfação</h3><p>Independentemente do ponto anterior, se o programa não for para ti, devolvemos o valor pago se o pedires até ${CFG.garantiaDias} dias após a compra, por email para ${esc(V.email)}. O reembolso é feito pelo mesmo meio de pagamento.</p>
    <h3>6. Utilização</h3><p>A licença é pessoal e não transmissível. Os textos, áudios e materiais do Apaga estão protegidos por direitos de autor.</p>
    <h3>7. Recuperar o acesso</h3><p>Se mudares de telemóvel ou apagares os dados do navegador, escreve-nos com o email da compra e enviamos-te um link para recuperar o acesso.</p>
    <h3>8. Reclamações e litígios</h3><p>Podes reclamar no <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener">Livro de Reclamações Eletrónico</a>. Em caso de litígio de consumo, podes recorrer a ${esc(CFG.ral.nome)} (<a href="${esc(CFG.ral.site)}" target="_blank" rel="noopener">${esc(CFG.ral.site.replace(/^https?:\/\//, ""))}</a>). Mais informação em www.consumidor.gov.pt.</p>
    <h3>9. Lei aplicável</h3><p>Aplica-se a lei portuguesa, sem prejuízo dos direitos que a lei do teu país de residência te garanta como consumidor.</p>`;
  return `${cab()}<button class="link back" data-act="voltar-legal">← Voltar</button><div class="stack legal">${corpo}</div>${rodape()}`;
}

/* ---------------- Áudio: ruído castanho e voz ---------------- */
const Ruido = (function () {
  let ctx, src, gain;
  function start(fade) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      if (src) return;
      const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      gain = ctx.createGain(); gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + (fade || 3));
      src.connect(gain).connect(ctx.destination); src.start();
    } catch (e) {}
  }
  function stop(fade) {
    if (!src || !ctx) return; const s = src, f = fade || 3;
    try { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + f); setTimeout(() => { try { s.stop(); } catch (e) {} }, f * 1000 + 100); } catch (e) {}
    src = null;
  }
  return { start, stop, on: () => !!src };
})();
let vozes = [], voz = null;
function rank(x) { let r = 0; if (/pt-PT/i.test(x.lang)) r += 10; if (/premium|enhanced|natural|neural/i.test(x.name)) r += 5; if (/joana|catarina|helena|in[eê]s/i.test(x.name)) r += 3; if (x.localService) r += 1; return r; }
function carregarVozes() {
  try {
    vozes = speechSynthesis.getVoices().filter(x => /^pt/i.test(x.lang)).sort((a, b) => rank(b) - rank(a));
    voz = vozes.find(x => x.name === S.prefs.vozNome) || vozes[0] || null;
    const sel = $("#p-vozNome");
    if (sel) sel.innerHTML = vozes.length ? vozes.map(v => `<option value="${esc(v.name)}" ${voz && v.name === voz.name ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("") : `<option value="">Voz padrão</option>`;
  } catch (e) {}
}
try { carregarVozes(); speechSynthesis.onvoiceschanged = carregarVozes; } catch (e) {}
function falar(t, forcar) {
  if (!S.prefs.voz && !forcar) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = voz ? voz.lang : "pt-PT"; if (voz) u.voice = voz; u.rate = .7; u.pitch = .8; u.volume = .8; speechSynthesis.speak(u); } catch (e) {}
}

/* ---------------- Sessões ---------------- */
function baralhar(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function favoritas(progId) {
  const usadas = new Set(); prog(progId).unidades.forEach(u => u.sessao.forEach(t => { if (t[0] !== "@") usadas.add(t); }));
  const fav = [...usadas].filter(t => (S.avaliacoes[t] || 0) > 0);
  return fav.length ? fav.slice(0, 3) : ["resp46", "palavras"];
}
function construir(tecs, semAbertura) {
  const lista = semAbertura ? tecs : ["abertura", ...tecs, "fecho"], passos = [];
  lista.forEach(tid => {
    const T = TECNICAS[tid]; if (!T) return;
    if (T.audio) { passos.push({ t: "audio", src: T.audio, tec: tid, label: T.nome }); return; }
    T.passos.forEach(p => {
      if (p.t === "breath") {
        for (let c = 0; c < p.ciclos; c++) {
          const lb = T.nome + " · " + (c + 1) + " de " + p.ciclos, falarC = c < 2;
          passos.push({ t: "breath", txt: "Inspira...", dur: p.ins, scale: 1, falar: falarC, tec: tid, label: lb });
          if (p.hold) passos.push({ t: "breath", txt: "Segura...", dur: p.hold, scale: 1, falar: falarC, tec: tid, label: lb });
          passos.push({ t: "breath", txt: "Solta... devagar.", dur: p.out, scale: .55, falar: falarC, tec: tid, label: lb });
        }
      } else if (p.t === "words") {
        baralhar(PALAVRAS).slice(0, p.n).forEach((w, i) => passos.push({ t: "word", txt: w, dur: p.dur, tec: tid, label: T.nome + " · " + (i + 1) + " de " + p.n }));
      } else passos.push({ t: p.t, txt: p.txt, dur: p.dur, tec: tid, label: T.fixa ? "" : T.nome });
    });
  });
  return passos;
}
let run = null;
function iniciarSessao(origem, tecs, semAbertura) {
  pararSessao(false);
  const passos = construir(tecs, semAbertura);
  run = { origem, tecs: tecs.filter(t => !TECNICAS[t].fixa), passos, i: -1, left: 0, paused: false, timer: null, total: passos.reduce((s, p) => s + (p.dur || 0), 0), feito: 0 };
  track("sessao_iniciada", { origem: origem.tipo + (origem.p ? ":" + origem.p : "") + (origem.n ? ":" + origem.n : "") });
  vista = "sessao"; render();
  if (S.prefs.ruido) Ruido.start(4);
  if (S.prefs.escuro || origem.p === "acordei") apagarEcra();
  proximo(); run.timer = setInterval(tick, 1000);
}
function proximo() {
  if (!run) return;
  run.i++;
  if (run.i >= run.passos.length) { terminarSessao(); return; }
  const p = run.passos[run.i]; run.left = p.dur || 0; mostrar(p);
  if (p.t === "audio") {
    try { run.audio = new Audio(p.src); run.audio.onended = () => proximo(); run.audio.play(); } catch (e) { proximo(); }
    return;
  }
  if (p.t === "word") falar(p.txt + "..."); else if (p.t !== "breath" || p.falar) { if (p.t !== "silence") falar(p.txt); }
}
function tick() {
  if (!run || run.paused) return;
  const p = run.passos[run.i]; if (!p || p.t === "audio") return;
  run.left--; run.feito++;
  const c = $("#s-count"); if (c) c.textContent = p.t === "breath" && run.left > 0 ? run.left : "";
  const b = $("#s-bar"); if (b) b.style.width = Math.min(100, run.feito / run.total * 100) + "%";
  if (run.left <= 0) proximo();
}
function mostrar(p) {
  const word = p.t === "word";
  ["#s-word", "#n-word"].forEach(s => { const e = $(s); if (e) { e.hidden = !word; e.textContent = word ? p.txt : ""; } });
  ["#s-phase", "#n-phase"].forEach(s => { const e = $(s); if (e) e.textContent = word ? "" : (p.txt || p.label || ""); });
  const lb = $("#s-step"); if (lb) lb.textContent = p.label || "";
  ["#orb", "#n-orb"].forEach(s => { const o = $(s); if (!o) return; o.hidden = word;
    if (p.t === "breath") { o.style.transitionDuration = p.dur + "s"; o.style.transform = "scale(" + p.scale + ")"; }
    else { o.style.transitionDuration = "2s"; o.style.transform = "scale(.55)"; } });
  const c = $("#s-count"); if (c) c.textContent = p.t === "breath" ? p.dur : "";
}
function vSessao() {
  return `<button class="link back" data-act="parar">← Terminar</button>
  <div class="session"><p class="steplabel" id="s-step"></p><div class="orb" id="orb" aria-hidden="true"></div>
    <p class="word" id="s-word" hidden></p><p class="phase" id="s-phase"></p><p class="count" id="s-count"></p></div>
  <div class="bar" aria-hidden="true"><i id="s-bar"></i></div>
  <button class="btn ghost" data-act="apagar-ecra">Apagar o ecrã</button>
  <p class="small muted" style="text-align:center">Com o ecrã apagado, toca uma vez para pausar e duas vezes para sair.</p>`;
}
function pararSessao(natural) {
  if (!run) return;
  clearInterval(run.timer);
  try { speechSynthesis.cancel(); } catch (e) {}
  try { run.audio && run.audio.pause(); } catch (e) {}
  Ruido.stop(natural ? 60 : 1.5);
  acenderEcra();
  const r = run; run = null; return r;
}
function terminarSessao() {
  const r = pararSessao(true); if (!r) return;
  const o = r.origem;
  track("sessao_concluida", { origem: o.tipo + (o.p ? ":" + o.p : "") + (o.n ? ":" + o.n : "") });
  if (o.tipo === "unidade") marcarFeita(o.p, o.n);
  vista = "avaliar"; params = { tecs: r.tecs, origem: o, av: {} }; render();
}
function marcarFeita(id, n) {
  S.progresso[id] = S.progresso[id] || { feitas: [], inicio: hoje() };
  if (!S.progresso[id].feitas.includes(n)) { S.progresso[id].feitas.push(n); track("unidade_concluida", { programa: id, n }); }
  if (!possui(id) && n === 1) track("noite_gratis_concluida", { programa: id });
  save();
}
function vAvaliar() {
  const tecs = [...new Set(params.tecs)];
  return `${cab()}
  <div class="stack"><p class="eyebrow">Sessão terminada</p><h2>O que te ajudou?</h2>
  <p class="muted">Isto ajuda o Apaga a montar o teu ritual. Se adormeceste antes do fim, responde amanhã de manhã.</p></div>
  <div class="stack">${tecs.map(t => `<div class="stack-s"><b>${esc(TECNICAS[t].nome)}</b><div class="row">
    <button class="opt" data-act="av" data-p="${t}" data-v="1" aria-pressed="${params.av[t] === 1}">Ajudou</button>
    <button class="opt" data-act="av" data-p="${t}" data-v="-1" aria-pressed="${params.av[t] === -1}">Não ajudou</button></div></div>`).join("")}</div>
  <button class="btn" data-act="av-fim">Continuar</button>
  ${params.origem.tipo === "unidade" && !possui(params.origem.p) ? `<p class="small muted">Gostaste? As restantes ${prog(params.origem.p).total - 1} ${prog(params.origem.p).unidade === "dia" ? "dias" : "noites"} estão no programa completo.</p>` : ""}`;
}

/* ---------------- Ecrã apagado ---------------- */
let wake = null, ultimoToque = 0, toqueT = null;
async function apagarEcra() { $("#night").hidden = false; try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) {} }
function acenderEcra() { $("#night").hidden = true; try { wake && wake.release(); } catch (e) {} wake = null; }
$("#night").addEventListener("click", () => {
  const agora = Date.now();
  if (agora - ultimoToque < 400) { clearTimeout(toqueT); ultimoToque = 0; acenderEcra(); return; }
  ultimoToque = agora;
  toqueT = setTimeout(() => {
    if (!run) return;
    run.paused = !run.paused;
    if (run.paused) { try { speechSynthesis.cancel(); run.audio && run.audio.pause(); } catch (e) {} $("#n-phase").textContent = "Em pausa. Toca para continuar."; $("#n-word").hidden = true; }
    else { try { run.audio && run.audio.play(); } catch (e) {} mostrar(run.passos[run.i]); }
  }, 420);
});

/* ---------------- Ações ---------------- */
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act, p = el.dataset.p, n = el.dataset.n ? +el.dataset.n : undefined;
  if (el.tagName === "A" && a !== "lista-espera") return;
  switch (a) {
    case "home": fecharFolha(); return go("home");
    case "ajustes": return go("ajustes");
    case "prog": fecharFolha(); track("programa_aberto", { programa: p }); return go("prog", { p });
    case "unidade": track("unidade_aberta", { programa: p, n }); return go("unidade", { p, n });
    case "bloqueada": return toast("Faz primeiro a " + U(p).toLowerCase() + " anterior.");
    case "comprar": return folhaCompra(p);
    case "fechar-folha": return fecharFolha();
    case "pagar": return pagar(p);
    case "lista-espera": track("lista_espera_clicada", { produto: p }); return;
    case "legal": { fecharFolha(); const back = vista === "legal" ? params.back : { vista, params: { ...params } }; vista = "legal"; params = { p, back }; render(); window.scrollTo(0, 0); return; }
    case "voltar-legal": { const b = params.back; if (b && b.vista !== "legal") { vista = b.vista; params = b.params; render(); } else go("home"); return; }
    case "marcar": marcarFeita(p, n); toast("Marcada como feita."); return go("prog", { p });
    case "sessao-unidade": {
      const u = prog(p).unidades[n - 1];
      let tecs = []; u.sessao.forEach(t => { if (t === "@favoritas") tecs.push(...favoritas(p)); else tecs.push(t); });
      if (S.progresso[p]) { const t = $("#tarefa"), es = $("#escrita"); if (t) S.progresso[p]["t" + n] = t.checked; if (es) S.progresso[p]["e" + n] = es.value; save(); }
      return iniciarSessao({ tipo: "unidade", p, n }, tecs);
    }
    case "sessao-gratis": {
      const G = GRATIS[p];
      if (p === "acordei" && !possui("noite")) {
        if (S.usosAcordei >= G.usosGratis) { toast("Já usaste as " + G.usosGratis + " utilizações grátis."); return folhaCompra("noite"); }
        S.usosAcordei++; save();
      }
      return iniciarSessao({ tipo: "gratis", p }, G.sessao, G.semAbertura);
    }
    case "sessao-livre": return iniciarSessao({ tipo: "sugestao", p }, [p]);
    case "parar": pararSessao(false); return go("home");
    case "apagar-ecra": return apagarEcra();
    case "av": params.av[p] = +el.dataset.v; S.avaliacoes[p] = +el.dataset.v; save(); track("tecnica_avaliada", { tecnica: p, util: el.dataset.v === "1" }); return render();
    case "av-fim": { const o = params.origem; return o.tipo === "unidade" ? go("prog", { p: o.p }) : go("home"); }
    /* Diagnóstico */
    case "onb-obst": onb.obst = p; onb.passo = 1; return render();
    case "onb-tempo": onb.tempo = p; onb.passo = 2; return render();
    case "onb-tri": S.perfil = { obstaculo: onb.obst, tempo: onb.tempo, triagem: TRIAGEM.map((_, i) => $("#tri-" + i).checked), recomendado: recomendar(onb.obst), data: hoje() };
      onb.passo = 3; track("diagnostico_concluido", { obstaculo: onb.obst, tempo: onb.tempo, aviso: S.perfil.triagem.some(Boolean) }); return render();
    case "onb-fim": case "onb-fim-cat": S.consent = true; S.ativo = S.perfil.recomendado; save();
      return a === "onb-fim" ? go("unidade", { p: S.ativo, n: 1 }) : go("home");
    /* Fechar o dia */
    case "fechar": fd = { passo: 0, itens: (S.fechar && S.fechar.data === hoje()) ? S.fechar.itens : [] }; return go("fechar");
    case "fd-1": { const linhas = $("#despejo").value.split("\n").map(s => s.trim()).filter(Boolean);
      if (!linhas.length) { $("#despejo").focus(); return toast("Escreve pelo menos uma coisa."); }
      fd.itens = linhas.map(t => fd.itens.find(i => i.t === t) || { t, ctl: false, passo: "" }); fd.passo = 1; return render(); }
    case "fd-2": fd.itens.forEach((it, i) => { it.ctl = $("#ctl-" + i).checked; }); fd.passo = 2; return render();
    case "fd-3": fd.itens.forEach((it, i) => { const x = $("#passo-" + i); if (x) it.passo = x.value.trim(); });
      S.fechar = { data: hoje(), itens: fd.itens }; save(); track("fechar_dia_concluido", { itens: fd.itens.length }); fd.passo = 3; return render();
    /* Diário */
    case "diario": dia = {}; return go("diario");
    case "dia-op": dia[el.dataset.q] = +p; return render();
    case "dia-gravar": {
      const hd = $("#h-deitar"), ha = $("#h-acordar"); if (hd) dia.deitar = hd.value; if (ha) dia.acordar = ha.value;
      if (dia.lat == null || dia.desp == null || dia.sens == null) return toast("Escolhe uma opção em cada pergunta.");
      S.diario = S.diario.filter(d => d.data !== hoje());
      const reg = { data: hoje(), lat: dia.lat, desp: dia.desp, sens: dia.sens, deitar: dia.deitar || "", acordar: dia.acordar || "" };
      S.diario.push(reg); save(); track("diario_registado", { lat: dia.lat, desp: dia.desp, sens: dia.sens });
      if (CFG.formularioDiario.url) return abrirFolha(`<p class="eyebrow">Noite guardada</p><h2>Queres enviar ao estudo?</h2>
        <p class="muted">Estás a ajudar a testar o Apaga. Envia as respostas de hoje com o teu código anónimo <b>${esc(S.id)}</b>, sem o teu nome.</p>
        <a class="btn" href="${esc(linkFormulario(reg))}" target="_blank" rel="noopener" data-act="lista-espera" data-p="diario">Enviar ao estudo</a>
        <button class="btn ghost" data-act="home">Agora não</button>`);
      toast("Noite guardada."); return go("home");
    }
    /* Ajustes */
    case "ouvir-voz": return falar("Inspira... Segura... Solta... devagar.", true);
    case "ouvir-ruido": if (Ruido.on()) { Ruido.stop(0.5); el.textContent = "Ouvir o ruído"; } else { Ruido.start(0.5); el.textContent = "Parar o ruído"; } return;
    case "instalar": if (promptInstalar) { promptInstalar.prompt(); promptInstalar.userChoice.then(c => { if (c.outcome === "accepted") track("app_instalada"); promptInstalar = null; render(); }); } return;
    case "apagar": $("#apagar-conf").hidden = false; return;
    case "apagar-nao": $("#apagar-conf").hidden = true; return;
    case "apagar-sim": try { localStorage.removeItem(KEY); } catch (e) {} S = novoEstado(); onb = { passo: 0 }; return go("onb");
  }
});
$("#sheet-bg").addEventListener("click", fecharFolha);
document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset && t.dataset.pref) { S.prefs[t.dataset.pref] = t.checked; save(); }
  if (t.id === "p-vozNome") { S.prefs.vozNome = t.value; save(); carregarVozes(); }
  if (t.id === "consent") { $("#onb-fim").disabled = !t.checked; $("#onb-fim-cat").disabled = !t.checked; }
  if (t.id === "c-termos" || t.id === "c-acesso") { $("#b-pagar").disabled = !($("#c-termos").checked && $("#c-acesso").checked); }
  if (t.id === "tarefa" && vista === "unidade") { const pid = params.p; S.progresso[pid] = S.progresso[pid] || { feitas: [], inicio: hoje() }; S.progresso[pid]["t" + params.n] = t.checked; save(); }
});
document.addEventListener("input", e => {
  if (e.target.id === "escrita" && vista === "unidade") { const pid = params.p; S.progresso[pid] = S.progresso[pid] || { feitas: [], inicio: hoje() }; S.progresso[pid]["e" + params.n] = e.target.value; save(); }
});
function linkFormulario(reg) {
  const F = CFG.formularioDiario, c = F.campos, q = new URLSearchParams();
  q.set("usp", "pp_url");
  if (c.codigo) q.set("entry." + c.codigo, S.id);
  if (c.latencia) q.set("entry." + c.latencia, String(reg.lat));
  if (c.despertares) q.set("entry." + c.despertares, String(reg.desp));
  if (c.sensacao) q.set("entry." + c.sensacao, String(reg.sens));
  return F.url.split("?")[0] + "?" + q.toString();
}

/* ---------------- Arranque ---------------- */
if ("serviceWorker" in navigator && /^https:|^http:\/\/localhost/.test(location.href)) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}
track("app_aberta", { instalada: standalone() });
if (!verificarRegresso()) {
  vista = (S.perfil && S.consent) ? "home" : "onb";
}
render();
})();
