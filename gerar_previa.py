"""Converte acervo.html na versão de prévia publicada como Artifact.

Uso (a saída fica fora do repositório, por exemplo em /tmp):
    python3 gerar_previa.py acervo.html /tmp/acervo-previa.html
"""
import re, sys
src = open(sys.argv[1], encoding='utf-8').read()
head = src.split('<head>', 1)[1].split('</head>', 1)[0]
body = src.split('<body>', 1)[1].rsplit('</body>', 1)[0]
head = re.sub(r'<meta[^>]*>\s*', '', head)
head = head.replace('</style>', '''  .previa { background: var(--ambar); color: var(--marinho); font-size: .88rem; }
  .previa .conteudo { padding-block: 8px; }
  /* Sem o recurso de downloads da plataforma, os botões de baixar somem */
  .sem-downloads .baixar { display: none; }
</style>''', 1)
banner = ('<div class="previa" role="note"><div class="conteudo"><strong>Prévia para visualização.</strong> '
          'A página oficial está em <a href="https://antc-brasil.github.io/acervo/" target="_blank" rel="noopener" '
          'style="color:inherit">antc-brasil.github.io/acervo</a> e passará a acervo.antcbrasil.org.br.</div></div>\n')
body = banner + body
assert '"modo": "auto"' in body
body = body.replace('"modo": "auto"', '"modo": "estatico"')

# Downloads pelo recurso da plataforma (o visualizador bloqueia downloads diretos).
# .ris/.bib não estão entre as extensões aceitas: salva como .ris.txt / .bib.txt
ini = body.index("function baixar(")
fim = body.index("\n}\n", ini) + 3
body = body[:ini] + '''async function baixar(texto, nome, formato) {
  const d = await window.claude?.use?.("downloads");
  if (!d) return;
  try { await d.save({ filename: nome + "." + EXPORTACOES[formato].ext + ".txt", data: texto + "\\n" }); }
  catch (e) { /* recusado pelo visitante ou indisponível: nada a fazer */ }
}
''' + body[fim:]
body = body.replace('iniciar();\n</script>', '''iniciar();
if (!window.claude?.use) document.body.classList.add("sem-downloads");
else window.claude.use("downloads").then(d => { if (!d) document.body.classList.add("sem-downloads"); });
</script>''', 1)
open(sys.argv[2], 'w', encoding='utf-8').write(head.strip() + '\n' + body)
