/**
 * Avisos por e-mail de novos itens no Acervo ANTC.
 *
 * - Formulário "Acervo ANTC — Receber novidades por e-mail" para cadastro (e-mail, nome, consentimento).
 * - Toda segunda-feira, às 8h, consulta o grupo do Zotero e envia aos inscritos um resumo dos
 *   itens ADICIONADOS desde a última verificação (edições de itens antigos não geram aviso).
 *   Semana sem novidade, nenhum e-mail sai.
 * - Cada e-mail traz um link de cancelamento de inscrição (app da Web deste mesmo projeto).
 * - O mesmo app da Web serve o feed RSS do acervo em URL_APP_WEB + '?feed=rss'
 *   (30 itens mais recentes, por data de inclusão). Depois de alterar o código, publique em
 *   Implantar > Gerenciar implantações > editar > Versão: Nova versão (a URL não muda).
 *
 * Instalação (uma vez):
 *   1. Novo projeto em https://script.google.com; cole este arquivo e salve.
 *   2. Implantar > Nova implantação > App da Web: executar como "Eu", acesso "Qualquer pessoa".
 *      Copie a URL /exec para URL_APP_WEB abaixo e salve.
 *   3. Execute configurar() e autorize. O registro mostra o link público do formulário
 *      (use em CONFIG.linkNovidades no gerar_pagina.py).
 *   Para ver como fica o e-mail: execute testarEnvio() (manda só para você os 3 itens mais recentes).
 *
 * Limite de envio: 1.500 destinatários/dia na conta Google Workspace da ANTC (Gmail pessoal: 100).
 */
const GROUP_ID = 6584175;
const ESTILO = 'associacao-brasileira-de-normas-tecnicas-ufrgs';
// Página do acervo (trocar por https://acervo.antcbrasil.org.br/ quando o domínio estiver no ar)
const PAGINA = 'https://antc-brasil.github.io/acervo/';
// URL /exec da implantação "App da Web" deste projeto (passo 2)
const URL_APP_WEB = 'https://script.google.com/macros/s/AKfycbwD40aP4oFWycKv4_uPhAHNTUs2RQ1MaS7i5Tb39ho4JJVHRZM-akvmHFhhgFiqSVxQ5Q/exec';
const FUSO = 'America/Sao_Paulo';
const REMETENTE = 'Acervo ANTC';
// Endereço de envio: apelido (alias) da conta que executa o script, cadastrado no Gmail em
// Configurações > Contas > "Enviar e-mail como". Enquanto não estiver lá, o e-mail sai do
// endereço da própria conta (sem replyTo, para respostas não irem a um endereço inexistente).
const EMAIL_REMETENTE = 'acervo@antcbrasil.org.br';

const TIPOS = {
  journalArticle: 'Artigo de periódico', book: 'Livro', bookSection: 'Capítulo de livro',
  conferencePaper: 'Trabalho em evento', report: 'Relatório',
  magazineArticle: 'Artigo de revista', newspaperArticle: 'Artigo de jornal',
  webpage: 'Artigo de opinião', blogPost: 'Publicação em blog', presentation: 'Apresentação',
  document: 'Documento', encyclopediaArticle: 'Verbete', manuscript: 'Manuscrito'
};

const props = () => PropertiesService.getScriptProperties();

// ======================= Instalação =======================

function configurar() {
  const p = props();
  if (p.getProperty('formId')) throw new Error('Já configurado. Para refazer, apague as propriedades do script.');

  const form = FormApp.create('Acervo ANTC — Receber novidades por e-mail');
  form.setDescription(
    'Cadastre seu e-mail para receber um aviso semanal sempre que novos itens forem incluídos no ' +
    'Acervo ANTC, que reúne a produção bibliográfica dos Auditores de Controle Externo. ' +
    'Nas semanas sem novidades, nenhum e-mail é enviado. Você pode cancelar a inscrição a qualquer momento ' +
    'pelo link presente em cada mensagem.');
  form.setCollectEmail(false);
  // Conta Google Workspace: sem isto, só usuários do domínio da ANTC conseguem responder
  form.setRequireLogin(false);
  form.setConfirmationMessage(
    'Inscrição recebida! Enviamos uma confirmação para o seu e-mail. ' +
    'Se não a encontrar, verifique a caixa de spam.');
  form.addTextItem().setTitle('E-mail').setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail()
      .setHelpText('Informe um e-mail válido.').build());
  form.addTextItem().setTitle('Nome (opcional)');
  form.addCheckboxItem().setTitle('Consentimento').setRequired(true)
    .setChoiceValues(['Autorizo a ANTC a usar meu e-mail exclusivamente para o envio de novidades do Acervo ANTC.']);

  const planilha = SpreadsheetApp.create('Acervo ANTC — Inscritos para novidades');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());
  const aba = planilha.insertSheet('Inscritos', 0);
  aba.appendRow(['E-mail', 'Nome', 'Inscrito em', 'Situação', 'Cancelado em']);
  aba.setFrozenRows(1);
  const vazia = planilha.getSheetByName('Página1') || planilha.getSheetByName('Sheet1');
  if (vazia) planilha.deleteSheet(vazia);

  // Ponto de partida: itens já existentes não são anunciados
  const { versao } = buscarZotero(`items/top?limit=1&format=keys`);
  p.setProperties({
    formId: form.getId(),
    planilhaId: planilha.getId(),
    segredo: Utilities.getUuid(),
    ultimaVersao: String(versao),
    dataCorte: new Date().toISOString()
  });

  ScriptApp.newTrigger('aoCadastrar').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('verificarNovidades').timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).inTimezone(FUSO).create();

  Logger.log('Link público do formulário (CONFIG.linkNovidades): ' + form.getPublishedUrl());
  Logger.log('Editar o formulário: ' + form.getEditUrl());
  Logger.log('Planilha de inscritos: ' + planilha.getUrl());
  if (!URL_APP_WEB) Logger.log('ATENÇÃO: preencha URL_APP_WEB (passo 2) antes do primeiro envio.');
}

// ======================= Cadastro e cancelamento =======================

function aoCadastrar(e) {
  const r = {};
  e.response.getItemResponses().forEach(ir => (r[ir.getItem().getTitle()] = ir.getResponse()));
  const email = String(r['E-mail'] || '').trim().toLowerCase();
  if (!email) return;
  const nome = String(r['Nome (opcional)'] || '').trim();

  const aba = abaInscritos();
  const linha = localizar(aba, email);
  const agora = new Date();
  if (linha && aba.getRange(linha, 4).getValue() === 'Ativo') return; // já inscrito
  if (linha) aba.getRange(linha, 2, 1, 4).setValues([[nome, agora, 'Ativo', '']]);
  else aba.appendRow([email, nome, agora, 'Ativo', '']);

  enviar(email, 'Inscrição confirmada — Acervo ANTC', moldura(
    `<p style="margin:0 0 12px">${nome ? 'Olá, ' + esc(nome) + '!' : 'Olá!'}</p>
     <p style="margin:0 0 12px">Sua inscrição para receber as novidades do <strong>Acervo ANTC</strong> foi confirmada.
     Toda segunda-feira em que houver novos itens no acervo, você receberá um resumo por e-mail.</p>
     <p style="margin:0">${botao(PAGINA, 'Conhecer o acervo')}</p>`, email),
    `Sua inscrição para receber as novidades do Acervo ANTC foi confirmada.\n\nAcervo: ${PAGINA}`);
}

function doGet(e) {
  if (e.parameter.feed !== undefined) return feedRss();
  const email = String(e.parameter.e || '').toLowerCase();
  const token = String(e.parameter.t || '');
  const valido = email && token === assinatura(email);
  // A confirmação exige um clique: filtros de e-mail que abrem links não cancelam a inscrição
  const html = valido
    ? `<p>Cancelar o envio de novidades do Acervo ANTC para <strong>${esc(email)}</strong>?</p>
       <button id="b" onclick="this.disabled=true;google.script.run.withSuccessHandler(m=>{document.getElementById('m').textContent=m;this.hidden=true}).cancelarInscricao('${esc(email)}','${esc(token)}')">Cancelar inscrição</button>
       <p id="m"></p>`
    : '<p>Link de cancelamento inválido. Use o link do e-mail mais recente do Acervo ANTC.</p>';
  return HtmlService.createHtmlOutput(
    `<div style="font:16px/1.6 Lato,Arial,sans-serif;color:#252525;max-width:560px;margin:40px auto;padding:0 16px">
     <h1 style="font-size:1.4rem;color:#28285b;text-transform:uppercase"><span style="color:#8a5f00">Acervo</span> ANTC</h1>
     ${html}
     <style>button{font:inherit;font-weight:700;background:#28285b;color:#fff;border:0;border-radius:999px;padding:10px 22px;cursor:pointer}</style>
     </div>`).setTitle('Acervo ANTC — Cancelar inscrição');
}

function cancelarInscricao(email, token) {
  if (!email || token !== assinatura(email)) return 'Link inválido.';
  const aba = abaInscritos();
  const linha = localizar(aba, email);
  if (linha) aba.getRange(linha, 4, 1, 2).setValues([['Cancelado', new Date()]]);
  return 'Inscrição cancelada. Você não receberá mais e-mails do Acervo ANTC.';
}

// ======================= Feed RSS =======================

const FEED_ITENS = 30;

function feedRss() {
  // Cache de 1 hora: leitores de feed consultam com frequência; o Zotero é consultado no máximo 1x/hora
  const cache = CacheService.getScriptCache();
  let xml = cache.get('feed');
  if (!xml) {
    xml = montarFeed();
    if (xml.length < 100000) cache.put('feed', xml, 3600);
  }
  return ContentService.createTextOutput(xml).setMimeType(ContentService.MimeType.RSS);
}

function montarFeed() {
  const { dados } = buscarZotero(`items/top?include=data,bib&style=${ESTILO}&locale=pt-BR` +
    `&sort=dateAdded&direction=desc&limit=${FEED_ITENS}`);
  const cdata = s => '<![CDATA[' + String(s).replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
  const itens = dados.map(i => {
    const d = i.data;
    const link = d.DOI ? 'https://doi.org/' + d.DOI : (d.url || PAGINA);
    const auditores = lerAuditores(d.extra);
    const autores = (d.creators || []).filter(c => c.creatorType === 'author')
      .map(c => c.name || [c.firstName, c.lastName].filter(Boolean).join(' '));
    const corpo =
      `<p><strong>${esc(tipo(d))}${ano(i) ? ' · ' + ano(i) : ''}</strong></p>` +
      (auditores.length ? `<p>${auditores.length > 1 ? 'Auditores' : 'Auditor(a)'}: ` +
        auditores.map(a => `${esc(a.nome)} (${esc(a.tribunal)})`).join('; ') + '</p>' : '') +
      referencia(i.bib);
    return ['    <item>',
      `      <title>${esc(d.title || 'Sem título')}</title>`,
      `      <link>${esc(link)}</link>`,
      `      <guid isPermaLink="false">acervo-antc-${i.key}</guid>`,
      `      <pubDate>${new Date(d.dateAdded).toUTCString()}</pubDate>`,
      ...autores.map(a => `      <dc:creator>${esc(a)}</dc:creator>`),
      `      <category>${esc(tipo(d))}</category>`,
      ...(d.tags || []).map(t => `      <category>${esc(t.tag)}</category>`),
      `      <description>${cdata(corpo)}</description>`,
      '    </item>'].join('\n');
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Acervo ANTC — Novidades</title>
    <link>${esc(PAGINA)}</link>
    <atom:link href="${esc(URL_APP_WEB + '?feed=rss')}" rel="self" type="application/rss+xml"/>
    <description>Novos itens do Acervo ANTC: a produção bibliográfica dos Auditores de Controle Externo reunida em um só lugar.</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>360</ttl>
${itens}
  </channel>
</rss>
`;
}

// ======================= Envio semanal =======================

function verificarNovidades() {
  const p = props();
  const corte = p.getProperty('dataCorte');
  const itens = [];
  let versao = Number(p.getProperty('ultimaVersao'));
  for (let start = 0; ; start += 100) {
    const r = buscarZotero(`items/top?since=${p.getProperty('ultimaVersao')}&include=data,bib&style=${ESTILO}` +
      `&locale=pt-BR&sort=dateAdded&direction=asc&limit=100&start=${start}`);
    versao = r.versao;
    itens.push(...r.dados);
    if (r.dados.length < 100) break;
  }
  const novos = itens.filter(i => i.data.dateAdded > corte);
  if (novos.length) {
    const inscritos = ativos();
    if (MailApp.getRemainingDailyQuota() < inscritos.length) {
      // Sem cota para todos: não marca como enviado, tenta de novo na próxima execução
      throw new Error(`Cota diária de e-mails insuficiente (${MailApp.getRemainingDailyQuota()} para ${inscritos.length} inscritos).`);
    }
    inscritos.forEach(email => enviarResumo(email, novos));
    Logger.log(`${novos.length} item(ns) novo(s) enviados a ${inscritos.length} inscrito(s).`);
  } else Logger.log('Nenhum item novo.');
  p.setProperties({ ultimaVersao: String(versao), dataCorte: new Date().toISOString() });
}

/** Envia só para você um resumo com os 3 itens mais recentes, para conferir o visual. */
function testarEnvio() {
  const { dados } = buscarZotero(`items/top?include=data,bib&style=${ESTILO}&locale=pt-BR&sort=dateAdded&direction=desc&limit=3`);
  enviarResumo(Session.getEffectiveUser().getEmail(), dados);
}

function enviarResumo(email, itens) {
  const n = itens.length;
  const assunto = n === 1 ? 'Novo item no Acervo ANTC' : `${n} novos itens no Acervo ANTC`;
  const blocos = itens.map(i => {
    const d = i.data;
    const link = d.DOI ? 'https://doi.org/' + d.DOI : d.url;
    const titulo = link ? `<a href="${esc(link)}" style="color:#28285b;text-decoration:none">${esc(d.title)} ↗</a>` : esc(d.title);
    const auditores = lerAuditores(d.extra);
    const ace = auditores.length
      ? `<p style="margin:0 0 8px;font-size:14px"><span style="font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#5c5d72">${auditores.length > 1 ? 'Auditores' : 'Auditor(a)'}</span>&nbsp; ` +
        auditores.map(a => `<strong style="color:#28285b">${esc(a.nome)}</strong> <span style="color:#8a5f00;font-weight:700">(${esc(a.tribunal)})</span>`).join(' · ') + '</p>'
      : '';
    return `<tr><td style="padding:16px 0;border-top:1px solid #e0e0ea">
      <div style="font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#8a5f00;margin-bottom:4px">${esc(tipo(d))}${ano(i) ? ' · <span style="color:#5c5d72">' + ano(i) + '</span>' : ''}</div>
      <div style="font-size:17px;font-weight:900;line-height:1.35;color:#28285b;margin-bottom:8px">${titulo}</div>
      ${ace}
      <div style="font-size:13px;color:#5c5d72">${referencia(i.bib)}</div>
    </td></tr>`;
  }).join('');
  const html = moldura(
    `<p style="margin:0 0 4px">${n === 1 ? 'Um novo item foi incluído' : n + ' novos itens foram incluídos'} no Acervo ANTC:</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${blocos}</table>
     <p style="margin:16px 0 0">${botao(PAGINA, 'Ver o acervo completo')}</p>`, email);
  const texto = itens.map(i => `- ${i.data.title} (${tipo(i.data)}${ano(i) ? ', ' + ano(i) : ''})`).join('\n');
  enviar(email, assunto, html, `${assunto}:\n\n${texto}\n\nAcervo: ${PAGINA}\nCancelar inscrição: ${linkCancelamento(email)}`);
}

// ======================= Apoio =======================

function buscarZotero(caminho) {
  const url = `https://api.zotero.org/groups/${GROUP_ID}/${caminho}${caminho.includes('format=') ? '' : '&format=json'}`;
  const r = UrlFetchApp.fetch(url, { headers: { 'Zotero-API-Version': '3' } });
  const h = r.getAllHeaders();
  const versao = Number(h['Last-Modified-Version'] || h['last-modified-version'] || 0);
  const corpo = r.getContentText();
  return { versao, dados: caminho.includes('format=keys') ? corpo.split('\n').filter(Boolean) : JSON.parse(corpo) };
}

let usarApelido; // consultado uma vez por execução
function enviar(email, assunto, html, texto) {
  if (usarApelido === undefined) usarApelido = GmailApp.getAliases().includes(EMAIL_REMETENTE);
  const opcoes = { htmlBody: html, name: REMETENTE };
  if (usarApelido) GmailApp.sendEmail(email, assunto, texto, { ...opcoes, from: EMAIL_REMETENTE });
  else MailApp.sendEmail({ to: email, subject: assunto, body: texto, ...opcoes });
}

function moldura(conteudo, email) {
  return `<div style="background:#f3f3f7;padding:24px 12px;font-family:Lato,'Segoe UI',Arial,sans-serif;color:#252525;font-size:15px;line-height:1.6">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e0e0ea;border-radius:10px;overflow:hidden">
    <tr><td style="background:#28285b;border-bottom:4px solid #f7ad03;padding:20px 24px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c9c9e3">ANTC · Auditor forte, controle externo forte</div>
      <div style="font-size:24px;font-weight:900;text-transform:uppercase;color:#fff"><span style="color:#f7ad03">Acervo</span> ANTC</div>
    </td></tr>
    <tr><td style="padding:20px 24px">${conteudo}</td></tr>
    <tr><td style="background:#f5f5f9;border-top:1px solid #e0e0ea;padding:14px 24px;font-size:12px;color:#5c5d72">
      Você recebe este e-mail porque se inscreveu para receber as novidades do Acervo ANTC.
      <a href="${esc(linkCancelamento(email))}" style="color:#0b3d74">Cancelar inscrição</a>.
    </td></tr>
  </table></div>`;
}

function botao(href, rotulo) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#f7ad03;color:#28285b;font-weight:900;font-size:13px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;padding:10px 22px;border-radius:999px">${esc(rotulo)}</a>`;
}

function referencia(bib) {
  // Referência ABNT vinda do Zotero, sem a margem numérica de alguns estilos
  return String(bib || '').replace(/<div class="csl-left-margin"[\s\S]*?<\/div>/g, '').trim();
}

function tipo(d) {
  if (d.itemType === 'thesis') {
    const t = String(d.thesisType || '').split('(')[0].trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Trabalho acadêmico';
  }
  return TIPOS[d.itemType] || 'Outro';
}

function ano(i) {
  return String((i.meta && i.meta.parsedDate) || '').slice(0, 4);
}

function lerAuditores(extra) {
  return String(extra || '').split(/\n|;/).map(l => l.trim().match(/^([^:()]+?)\s*\(([^():]+)\)$/))
    .filter(Boolean).map(m => ({ nome: m[1], tribunal: m[2] }));
}

function abaInscritos() {
  return SpreadsheetApp.openById(props().getProperty('planilhaId')).getSheetByName('Inscritos');
}

function localizar(aba, email) {
  const col = aba.getRange(1, 1, aba.getLastRow(), 1).getValues();
  for (let i = 1; i < col.length; i++) if (String(col[i][0]).toLowerCase() === email) return i + 1;
  return 0;
}

function ativos() {
  const aba = abaInscritos();
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, 4).getValues()
    .filter(l => l[3] === 'Ativo').map(l => String(l[0]).toLowerCase());
}

function assinatura(email) {
  const b = Utilities.computeHmacSha256Signature(email, props().getProperty('segredo'));
  return Utilities.base64EncodeWebSafe(b).replace(/=+$/, '');
}

function linkCancelamento(email) {
  return `${URL_APP_WEB}?e=${encodeURIComponent(email)}&t=${assinatura(email)}`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
