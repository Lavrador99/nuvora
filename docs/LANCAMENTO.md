# Apaga — guia de lançamento

A app é uma PWA estática: não tem servidor, não usa IA e não tem base de dados. Tudo o que tens de mudar está no ficheiro `config.js`.

## O que está incluído

- **Grátis:** diagnóstico de hábitos, Fechar o dia, Respirar para adormecer, 2 utilizações do Acordei às 3h, diário e gráfico.
- **Pagos (1.ª noite ou dia grátis):** A mente não desliga (7 noites, 9,99 €), Acordei a meio da noite (7 noites, 9,99 €), Regularizar o horário (14 dias, 14,99 €), Pack dos 3 (24,99 €).
- **Dois modos**, em `config.js`:
  - `"pre-venda"` (atual): os botões de compra mostram o preço, registam o interesse e oferecem desconto de lançamento. Não cobra nada.
  - `"venda"`: os botões abrem o pagamento Stripe.

## 1. Publicar o site (grátis, 5 minutos)

1. Entra em **app.netlify.com/drop** (cria conta grátis).
2. Arrasta a pasta `apaga-pwa` inteira para a página.
3. Recebes um endereço do tipo `https://nome.netlify.app`. Põe-no em `urlSite` no `config.js` e volta a arrastar a pasta.
4. Mais tarde, liga o domínio `apaga.pt` nas definições do site.

Para atualizar a app: muda o que precisares, muda `VERSAO` no `sw.js` (por exemplo `apaga-v2`) e arrasta a pasta outra vez.

## 2. Medir a adesão (grátis, sem cookies)

1. Cria conta em **cloud.umami.is** (plano Hobby, gratuito).
2. Adiciona o site com o teu endereço e copia o **Website ID**.
3. Cola-o em `umamiWebsiteId` no `config.js` e publica de novo.

Eventos que a app envia (em Umami → Events):

| Evento | O que mede |
| --- | --- |
| `diagnostico_concluido` | Quantas pessoas terminam o diagnóstico, e qual o obstáculo mais comum |
| `unidade_aberta` / `sessao_iniciada` | Quem começa as noites |
| `noite_gratis_concluida` | Quem termina a noite grátis (adesão real) |
| `unidade_concluida` | Progresso dentro de cada programa |
| `fechar_dia_concluido`, `diario_registado` | Uso dos hábitos diários |
| `tecnica_avaliada` | Que técnicas ajudam (decide o que gravar primeiro) |
| `compra_vista`, `pre_reserva` | Interesse em comprar (modo pré-venda) |
| `compra_clicada`, `compra_concluida` | Conversão em vendas (modo venda) |

**Funil a acompanhar:** visitas → diagnóstico concluído → noite grátis concluída → compra vista → compra concluída.

## 3. Pré-venda (podes fazer já, sem atividade aberta)

Opcional: cria um Google Form só com o campo "Email" e cola o link em `listaEsperaUrl`. Assim, quem quiser comprar deixa o email e recebe o desconto no lançamento. Não faças nenhuma cobrança neste modo.

## 4. Antes de ligar os pagamentos (obrigatório)

- [ ] Abrir atividade no Portal das Finanças, no regime de isenção do art. 53.º (antes da primeira venda)
- [ ] Preencher `vendedor` no `config.js`: nome, NIF, morada e email (aparecem nos Termos)
- [ ] Criar conta Stripe em nome próprio, com o NIF
- [ ] Ligar um software de faturação certificado (InvoiceXpress, Moloni ou Vendus) para emitir a fatura de cada venda; confirma a integração com a Stripe ou emite manualmente no início
- [ ] Registar o Livro de Reclamações Eletrónico (livroreclamacoes.pt); a ligação já está no rodapé
- [ ] Confirmar a entidade RAL em consumidor.gov.pt (está o CNIACC por omissão)
- [ ] Rever os Termos e a Privacidade dentro da app com o contabilista ou um advogado

## 5. Criar os pagamentos na Stripe

Para cada produto (`mente`, `noite`, `horario`, `pack`):

1. Stripe → **Payment Links** → **Novo**. Cria o produto com o preço do `config.js`, pagamento único.
2. Em **Após o pagamento**, escolhe **Não mostrar página de confirmação / Redirecionar** para:
   `https://O-TEU-SITE/?compra=mente&sessao={CHECKOUT_SESSION_ID}`
   (troca `mente` pelo id do produto).
3. Ativa os recibos por email em Definições → Emails de clientes.
4. Copia o link (`https://buy.stripe.com/...`) para `linkStripe` desse produto.

Depois muda `modo` para `"venda"` e publica.

**Testa primeiro em modo de teste da Stripe:** cria os links no modo de teste, paga com o cartão 4242 4242 4242 4242, confirma que voltas desbloqueado, e só depois troca pelos links reais.

A app envia o código anónimo do utilizador como `client_reference_id`. Vês esse código em cada pagamento na Stripe e no ecrã de Ajustes da pessoa.

## 6. Recuperar o acesso de um cliente

Se alguém mudar de telemóvel, confirma o pagamento na Stripe e envia-lhe:
`https://O-TEU-SITE/?compra=mente&sessao=recuperado`

## 7. Limitação a conhecer

Como não há servidor, o desbloqueio é feito pelo endereço de regresso da Stripe. Quem conhecer esse endereço consegue desbloquear sem pagar. Para validar a procura com poucas centenas de pessoas é aceitável. Se as vendas crescerem, o passo seguinte é uma pequena função gratuita (por exemplo, Cloudflare Workers) que confirma o pagamento antes de desbloquear.

## 8. Diário para testadores (opcional)

No Google Form do diário, usa "Obter link pré-preenchido", copia os números `entry.XXXX` de cada campo e cola-os em `formularioDiario`, com o link do formulário em `url`. A app passa a mostrar "Enviar ao estudo" depois de cada registo.

## 9. Áudios gravados

Quando tiveres gravações, põe os ficheiros numa pasta `audio/` e acrescenta `audio: "audio/nome.mp3"` à técnica em `content.js`. A app toca o ficheiro em vez da voz do telemóvel.
