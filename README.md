# Acervo ANTC

Catálogo público da produção bibliográfica de Auditores de Controle Externo,
publicado em **https://acervo.antcbrasil.org.br/**.

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
```

## Implantação (uma única vez)

1. **GitHub:** criar a organização da ANTC (`antc-brasil`) com o e-mail institucional e,
   dentro dela, o repositório público `acervo` com o conteúdo desta pasta.
2. **Pages:** em *Settings → Pages*, origem **GitHub Actions**. Em *Custom domain*,
   `acervo.antcbrasil.org.br`; depois que o certificado sair, marcar **Enforce HTTPS**.
3. **Verificar o domínio** na organização (*Settings → Pages → Add a domain*), para que
   nenhum outro repositório possa usar o subdomínio. O GitHub informa um registro TXT.
4. **DNS de antcbrasil.org.br** (pedido à Trídia ou a quem administra a zona):

   | Tipo  | Nome                                      | Valor                     |
   |-------|-------------------------------------------|---------------------------|
   | CNAME | `acervo`                                  | `antc-brasil.github.io.`   |
   | TXT   | `_github-pages-challenge-antc-brasil` (*)  | código informado no passo 3 |

   (*) nome exato informado pelo GitHub no passo 3.
5. **Site da ANTC:** botão, guia ou banner "Acervo ANTC" com link para
   `https://acervo.antcbrasil.org.br/`.
6. **Apps Script:** trocar a constante `PAGINA` de `assinatura_novidades.gs` pelo endereço oficial
   e publicar nova versão do app da Web.
