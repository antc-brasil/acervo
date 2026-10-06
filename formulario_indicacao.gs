/**
 * Cria o formulário "Acervo ANTC — Indicação de material" no Google Forms,
 * com as respostas indo para uma planilha de curadoria.
 *
 * Como usar (conta Google da ANTC):
 *   1. Acesse https://script.google.com e clique em "Novo projeto".
 *   2. Apague o conteúdo do editor, cole este arquivo inteiro e salve.
 *   3. Escolha a função criarFormulario e clique em "Executar"; autorize o acesso.
 *   4. O registro de execução mostra o link público do formulário (para o botão
 *      "Indicar material para o acervo") e o link de edição.
 *
 * Os campos seguem o que a curadoria precisa para cadastrar o item no Zotero:
 * identificador (DOI/ISBN/link), metadados, Auditor(es) no formato do campo Extra
 * — "Nome Completo (SIGLA)" — e o Tipo das teses — "Natureza (Grau em Curso)".
 */
function criarFormulario() {
  const form = FormApp.create('Acervo ANTC — Indicação de material');
  form.setDescription(
    'Indique uma publicação de autoria de Auditor(a) de Controle Externo de Tribunal de Contas ' +
    'para o Acervo ANTC. A inclusão depende de análise da curadoria da ANTC. ' +
    'O acervo reúne apenas as referências e o link para a publicação original; não hospedamos arquivos.\n\n' +
    'Tempo estimado: 3 minutos. Se a obra tiver DOI ou ISBN, os demais dados da publicação são opcionais.');
  form.setCollectEmail(true);
  // Conta Google Workspace: sem isto, só usuários do domínio da ANTC conseguem responder
  form.setRequireLogin(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Obrigado! Sua indicação foi recebida e será analisada pela curadoria do Acervo ANTC. ' +
    'Se precisarmos de alguma informação, entraremos em contato pelo e-mail informado.');

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
    .setHelpText('O acervo reúne obras em que ao menos um dos autores é Auditor(a) de Controle Externo.');
  form.addParagraphTextItem().setTitle('Auditor(es) autores da obra e respectivo Tribunal de Contas').setRequired(true)
    .setHelpText('Um por linha: Nome Completo (SIGLA DO TRIBUNAL). Ex.:\nIsmar dos Santos Viana (TCE-SE)\nGabriel Heller (TCDF)');
  form.addTextItem().setTitle('Cargo efetivo do(s) Auditor(es)')
    .setHelpText('Ex.: Auditor de Controle Externo; Auditor Federal de Controle Externo. Ajuda a curadoria na verificação.');

  // ---------- 4. Declarações ----------
  form.addPageBreakItem().setTitle('4. Declarações');
  form.addCheckboxItem().setTitle('Declarações').setRequired(true)
    .setChoiceValues([
      'As informações prestadas são verdadeiras.',
      'Estou ciente de que o acervo publica apenas os dados bibliográficos e o link para a publicação original.',
      'Autorizo o uso do meu nome e e-mail pela ANTC exclusivamente para contato sobre esta indicação.'])
    .setValidation(FormApp.createCheckboxValidation().requireSelectExactly(3)
      .setHelpText('Marque as três declarações para enviar.').build());
  form.addParagraphTextItem().setTitle('Observações para a curadoria (opcional)');

  // Respostas em planilha, para a curadoria acompanhar e registrar a decisão
  const planilha = SpreadsheetApp.create('Acervo ANTC — Indicações recebidas');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());

  Logger.log('Link público (use no botão da página): ' + form.getPublishedUrl());
  Logger.log('Link para editar o formulário: ' + form.getEditUrl());
  Logger.log('Planilha de respostas: ' + planilha.getUrl());
}
