# Portfólio de Publicações dos Auditores de Controle Externo

Catálogo público da produção bibliográfica de Auditores de Controle Externo, mantido pela ANTC
(antes chamado Acervo ANTC), publicado em **https://portfolio.antcbrasil.org.br/**
(o endereço antigo, acervo.antcbrasil.org.br, deve redirecionar para ele).

- **Base de dados:** grupo público do Zotero [acervo_antc](https://www.zotero.org/groups/6584175) (id 6584175).
  A curadoria é feita só no Zotero; a página lê os dados de lá.
- **Página:** `modelo.html` → `gerar_pagina.py` → `index.html` (arquivo único, sem servidor).
- **Hospedagem:** GitHub Pages. O workflow `.github/workflows/publicar.yml` gera e publica a página
  a cada push, sob demanda e em horário agendado.
- **Google Apps Script** (conta Google da ANTC):
  - `formulario_indicacao.gs`: formulário "Indicar material para o acervo".
  - `assinatura_novidades.gs`: inscrição para avisos por e-mail, resumo semanal e feed RSS.

## Gerar localmente

```bash
python3 gerar_pagina.py            # gera acervo.html
python3 gerar_previa.py acervo.html /tmp/acervo-previa.html   # versão para o Artifact de prévia
```

## Implantação (uma única vez)

1. **GitHub:** criar a organização da ANTC (`antc-brasil`) com o e-mail institucional e,
   dentro dela, o repositório público `acervo` com o conteúdo desta pasta.
2. **Pages:** em *Settings → Pages*, origem **GitHub Actions**. Em *Custom domain*,
   `acervo.antcbrasil.org.br`; depois que o certificado sair, marcar **Enforce HTTPS**.
3. **Verificar o domínio** na organização (*Settings → Pages → Add a domain*), para que
   nenhum outro repositório possa usar o subdomínio. O GitHub informa um registro TXT.
4. **DNS de antcbrasil.org.br** (pedido à Trídia ou a quem administra a zona):

   | Tipo  | Nome                                             | Valor                            |
   |-------|--------------------------------------------------|----------------------------------|
   | CNAME | `acervo`                                         | `antc-brasil.github.io.`         |
   | TXT   | `_github-pages-challenge-antc-brasil.acervo`     | `162f2c28c1d40d3f1939cea79ce12d` |

   Com os registros no ar, clicar em **Verify** na verificação do domínio e só então
   preencher o *Custom domain* do passo 2 (antes disso, o endereço provisório
   https://antc-brasil.github.io/acervo/ deixaria de abrir).
5. **Site da ANTC:** botão, guia ou banner "Acervo ANTC" com link para
   `https://acervo.antcbrasil.org.br/`.
6. **Apps Script:** trocar a constante `PAGINA` de `assinatura_novidades.gs` pelo endereço oficial
   e publicar nova versão do app da Web.

Situação em 14/10/2026: DNS criado pela Trídia, domínio verificado, *Custom domain* e HTTPS ativos,
`PAGINA` trocada (app da Web versão 4). Falta só o botão no site da ANTC (passo 5).

## Troca de nome para Portfólio de Publicações (nov/2026)

Novo endereço `portfolio.antcbrasil.org.br`, já cadastrado para verificação na organização antc-brasil.
Registros pedidos à Trídia:

| Tipo  | Nome                                             | Valor                            |
|-------|--------------------------------------------------|----------------------------------|
| CNAME | `portfolio`                                      | `antc-brasil.github.io.`         |
| TXT   | `_github-pages-challenge-antc-brasil.portfolio`  | `2ad31b033aefbed182e999f39cfc04` |

Na virada: Verify → trocar o *Custom domain* para portfolio → Enforce HTTPS → colar os `.gs` novos
no Apps Script (nova versão do app da Web) e renomear os formulários → Trídia cria o redirecionamento
301 de `acervo.antcbrasil.org.br` para `portfolio.antcbrasil.org.br` na Cloudflare e troca o botão do site.

Situação em 24/11/2026: registros criados pela Trídia, domínio portfolio verificado, *Custom domain*
trocado para portfolio, `PAGINA` atualizada (app da Web versão 6) e URL do grupo no Zotero trocada.
Conta acervo@ renomeada para portfolio@; em 28/11, remetente portfolio@ e app da Web versão 7 implantada
por portfolio@ (gatilhos da conta seguem ativos, sem erros). Faltam o redirecionamento 301 de
acervo (proxy ligado no registro `acervo` + regra de redirecionamento) e o menu "Portfólio de Publicações"
no site da ANTC, ambos com a Trídia.

