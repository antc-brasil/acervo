/**
 * Cria o formulário "Portfólio de Publicações — Indicação de material" no Google Forms,
 * com as respostas indo para uma planilha de curadoria.
 *
 * Como usar (conta Google da ANTC):
 *   1. Acesse https://script.google.com e clique em "Novo projeto".
 *   2. Apague o conteúdo do editor, cole este arquivo inteiro e salve.
 *   3. Escolha a função criarFormulario e clique em "Executar"; autorize o acesso.
 *   4. O registro de execução mostra o link público do formulário (para o botão
 *      "Indicar material para o portfólio") e o link de edição.
 *
 * Os campos seguem o que a curadoria precisa para cadastrar o item no Zotero:
 * identificador (DOI/ISBN/link), metadados, Auditor(es) no formato do campo Extra
 * — "Nome Completo (SIGLA)" — e o Tipo das teses — "Natureza (Grau em Curso)".
 */
const FORM_TITULO = 'Portfólio de Publicações — Indicação de material';
const FORM_DESCRICAO =
  'Indique uma publicação de autoria de Auditor(a) de Controle Externo de Tribunal de Contas ' +
  'para o Portfólio de Publicações dos Auditores de Controle Externo. A inclusão depende de análise da curadoria da ANTC. ' +
  'O portfólio reúne apenas as referências e o link para a publicação original; não hospedamos arquivos.\n\n' +
  'Tempo estimado: 3 minutos. Se a obra tiver DOI ou ISBN, os demais dados da publicação são opcionais.';
const FORM_CONFIRMACAO =
  'Obrigado! Sua indicação foi recebida e será analisada pela curadoria do Portfólio de Publicações. ' +
  'Se precisarmos de alguma informação, entraremos em contato pelo e-mail informado.';
// Formulário e planilha já criados na conta da ANTC (usados por atualizarNome)
const PLANILHA_NOME = 'Portfólio de Publicações — Indicações recebidas';
const FORM_ID = '1HyyyFxRngc0Dxf71M9-pM9JrMbleeOwSe2GSGOeAAZ0';
const PLANILHA_ID = '1VwgD1fDXBtsPoKkht3ce8PFYIewhR6aaC2pH1sfKgmg';

function criarFormulario() {
  const form = FormApp.create(FORM_TITULO);
  form.setDescription(FORM_DESCRICAO);
  form.setCollectEmail(true);
  // Conta Google Workspace: sem isto, só usuários do domínio da ANTC conseguem responder
  form.setRequireLogin(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(FORM_CONFIRMACAO);

  const url = /^https?:\/\/\S+$/;
  const validaUrl = FormApp.createTextValidation()
    .requireTextMatchesPattern(url.source).setHelpText('Informe um link completo, começando por http:// ou https://').build();

  // ---------- 1. Quem indica ----------
  form.addSectionHeaderItem().setTitle('1. Quem indica');
  form.addTextItem().setTitle('Seu nome').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Sua relação com a obra')
    .setChoiceValues(['Sou autor(a) da obra', 'Sou associado(a) da ANTC e indico obra de colega', 'Outra'])
    .setRequired(true);

  // ---------- 2. A obra ----------
  form.addPageBreakItem().setTitle('2. A obra');
  form.addListItem().setTitle('Tipo de publicação').setRequired(true)
    .setChoiceValues(['Artigo de periódico', 'Livro', 'Capítulo de livro', 'Tese', 'Dissertação',
      'Monografia / TCC', 'Artigo de opinião (portal, jornal, blog)', 'Trabalho em evento', 'Relatório', 'Outro']);
  form.addTextItem().setTitle('Título completo').setRequired(true)
    .setHelpText('Inclua o subtítulo, se houver (ex.: "Título: subtítulo").');
  form.addParagraphTextItem().setTitle('Autores, na ordem da publicação').setRequired(true)
    .setHelpText('Um por linha, no formato Sobrenome, Nome. Ex.:\nViana, Ismar dos Santos\nOliveira, José Roberto Pimenta de');
  form.addTextItem().setTitle('Ano de publicação').setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextMatchesPattern('^(19|20)\\d{2}$')
      .setHelpText('Informe o ano com 4 dígitos.').build());
  form.addTextItem().setTitle('DOI ou ISBN (se houver)')
    .setHelpText('Com o DOI/ISBN a curadoria importa os dados da obra automaticamente. Ex.: 10.32586/rcda.v21i2.853 ou 978-85-519-1458-8');
  form.addTextItem().setTitle('Link para a publicação').setRequired(true).setValidation(validaUrl)
    .setHelpText('Página oficial da obra: revista, editora, repositório da universidade ou portal onde foi publicada.');
  form.addTextItem().setTitle('Onde foi publicada')
    .setHelpText('Nome do periódico, da editora, da instituição (teses) ou do portal (artigos de opinião).');
  form.addTextItem().setTitle('Volume, número e páginas (artigos e capítulos)')
    .setHelpText('Ex.: v. 21, n. 2, p. 112–145');
  form.addTextItem().setTitle('Grau e curso (teses, dissertações e monografias)')
    .setHelpText('Ex.: Doutorado em Direito; Mestrado em Administração Pública; Especialização em Controle Externo');
  form.addParagraphTextItem().setTitle('Resumo (opcional)')
    .setHelpText('Cole o resumo publicado pelo autor, se houver.');
  form.addTextItem().setTitle('Palavras-chave (opcional)')
    .setHelpText('Até 5, separadas por ponto e vírgula. Ex.: devido processo legal; tribunais de contas');

  // ---------- 3. Auditor(es) de Controle Externo ----------
  form.addPageBreakItem().setTitle('3. Auditor(es) de Controle Externo entre os autores')
    .setHelpText('O portfólio reúne obras em que ao menos um dos autores é Auditor(a) de Controle Externo.');
  form.addParagraphTextItem().setTitle('Auditor(es) autores da obra e respectivo Tribunal de Contas').setRequired(true)
    .setHelpText('Um por linha: Nome Completo (SIGLA DO TRIBUNAL). Ex.:\nIsmar dos Santos Viana (TCE-SE)\nGabriel Heller (TCDF)');
  form.addTextItem().setTitle('Cargo efetivo do(s) Auditor(es)')
    .setHelpText('Ex.: Auditor de Controle Externo; Auditor Federal de Controle Externo. Ajuda a curadoria na verificação.');

  // ---------- 4. Declarações ----------
  form.addPageBreakItem().setTitle('4. Declarações');
  form.addCheckboxItem().setTitle('Declarações').setRequired(true)
    .setChoiceValues([
      'As informações prestadas são verdadeiras.',
      'Estou ciente de que o portfólio publica apenas os dados bibliográficos e o link para a publicação original.',
      'Autorizo o uso do meu nome e e-mail pela ANTC exclusivamente para contato sobre esta indicação.'])
    .setValidation(FormApp.createCheckboxValidation().requireSelectExactly(3)
      .setHelpText('Marque as três declarações para enviar.').build());
  form.addParagraphTextItem().setTitle('Observações para a curadoria (opcional)');

  // Respostas em planilha, para a curadoria acompanhar e registrar a decisão
  const planilha = SpreadsheetApp.create(PLANILHA_NOME);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());

  Logger.log('Link público (use no botão da página): ' + form.getPublishedUrl());
  Logger.log('Link para editar o formulário: ' + form.getEditUrl());
  Logger.log('Planilha de respostas: ' + planilha.getUrl());
}

/** Aplica o nome atual ao formulário e à planilha já existentes (os links não mudam). */
function atualizarNome() {
  const form = FormApp.openById(FORM_ID);
  form.setTitle(FORM_TITULO).setDescription(FORM_DESCRICAO).setConfirmationMessage(FORM_CONFIRMACAO);
  const troca = t => String(t || '').replace(/Acervo ANTC/g, 'Portfólio de Publicações')
    .replace(/\bAcervo\b/g, 'Portfólio').replace(/\bacervo\b/g, 'portfólio');
  form.getItems().forEach(item => {
    if (troca(item.getTitle()) !== item.getTitle()) item.setTitle(troca(item.getTitle()));
    if (troca(item.getHelpText()) !== item.getHelpText()) item.setHelpText(troca(item.getHelpText()));
    const tipo = item.getType();
    const comOpcoes = tipo === FormApp.ItemType.CHECKBOX ? item.asCheckboxItem()
      : tipo === FormApp.ItemType.MULTIPLE_CHOICE ? item.asMultipleChoiceItem()
      : tipo === FormApp.ItemType.LIST ? item.asListItem() : null;
    if (!comOpcoes) return;
    const antes = comOpcoes.getChoices().map(c => c.getValue());
    const depois = antes.map(troca);
    if (depois.join('\n') !== antes.join('\n')) comOpcoes.setChoiceValues(depois);
  });
  SpreadsheetApp.openById(PLANILHA_ID).rename(PLANILHA_NOME);
  Logger.log('Formulário e planilha renomeados.');
}
