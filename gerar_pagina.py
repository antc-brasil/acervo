#!/usr/bin/env python3
"""Gera acervo.html a partir da biblioteca pública do grupo Zotero da ANTC.

A página resultante é um arquivo único (HTML + CSS + JS inline; a fonte Lato do
Google Fonts é opcional e cai para fontes do sistema se bloqueada), compatível com a CSP atual do site da ANTC
(`default-src 'self' 'unsafe-inline'`). Ela traz uma cópia dos dados embutida
e, se a CSP do site passar a permitir `connect-src https://api.zotero.org`,
atualiza-se sozinha a cada visita.

Uso:
    python3 gerar_pagina.py            # gera acervo.html ao lado deste script
    python3 gerar_pagina.py saida.html
"""

import json
import re
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

GROUP_ID = 6584175
GROUP_URL = "https://www.zotero.org/groups/6584175/acervo_antc"
# Universidade Federal do Rio Grande do Sul - ABNT (autoria completa)
ESTILO = "associacao-brasileira-de-normas-tecnicas-ufrgs"

CONFIG = {
    "groupId": GROUP_ID,
    "groupUrl": GROUP_URL,
    # "auto": usa a cópia embutida e tenta atualizar pela API; "estatico": só a cópia
    "modo": "auto",
    # Tags de controle interno que não devem aparecer como tema
    "tagsIgnoradas": ["lido", "a revisar", "a ler"],
    # Destino de "Sugira a inclusão" (trocar pelo formulário quando existir)
    "linkSugestao": "https://www.antcbrasil.org.br/contato",
    # Oculta resumos que começam com "[Resumo gerado por IA"
    "ocultarResumosIA": True,
}

API = f"https://api.zotero.org/groups/{GROUP_ID}"
AQUI = Path(__file__).resolve().parent


def buscar_tudo(caminho: str, extra: str = "") -> list:
    saida = []
    start = 0
    while True:
        url = f"{API}/{caminho}?format=json&limit=100&start={start}{extra}"
        req = urllib.request.Request(url, headers={"Zotero-API-Version": "3"})
        with urllib.request.urlopen(req, timeout=60) as r:
            lote = json.load(r)
            total = int(r.headers.get("Total-Results", "0"))
        saida.extend(lote)
        if len(lote) < 100 or len(saida) >= total:
            return saida
        start += 100


def enxugar(item: dict) -> dict:
    """Mantém só o que a página usa (notas e anexos já ficam de fora via items/top)."""
    d = item["data"]
    campos = ("itemType", "title", "creators", "tags", "collections", "abstractNote", "DOI", "url", "extra",
              "thesisType", "publicationTitle", "bookTitle", "university", "publisher")
    return {
        "key": item["key"],
        "meta": {"parsedDate": item.get("meta", {}).get("parsedDate", "")},
        "bib": item.get("bib", ""),
        "data": {k: d[k] for k in campos if d.get(k)},
    }


def main() -> None:
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI / "acervo.html"
    items = buscar_tudo("items/top", f"&include=data,bib&style={ESTILO}&locale=pt-BR")
    cols = buscar_tudo("collections")
    snapshot = {
        "items": [enxugar(i) for i in items if not i["data"].get("deleted")],
        "collections": [{"key": c["key"], "name": c["data"]["name"]}
                        for c in cols if not c["data"].get("deleted")],
        "geradoEm": datetime.now().strftime("%d/%m/%Y"),
    }
    # "</" escapado para o JSON não fechar a tag <script> antes da hora
    js = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<\\/")
    html = (AQUI / "modelo.html").read_text(encoding="utf-8")
    html = html.replace("/*__CONFIG__*/{}", js(CONFIG), 1)
    html = html.replace('/*__SNAPSHOT__*/{"items": [], "collections": [], "geradoEm": ""}', js(snapshot), 1)
    destino.write_text(html, encoding="utf-8")
    # Aviso para a curadoria: obras sem Auditor(a) identificado no campo Extra
    padrao = re.compile(r"^[^:()]+?\s*\([^():]+\)$")
    for i in snapshot["items"]:
        linhas = re.split(r"\n|;", i["data"].get("extra", ""))
        if not any(padrao.match(l.strip()) for l in linhas):
            print(f"  sem Auditor(a) no campo Extra: {i['data'].get('title', i['key'])[:70]}")
        if i["data"]["itemType"] == "thesis" and not i["data"].get("thesisType"):
            print(f"  Tese sem o campo Tipo (ex.: Tese (Doutorado em Direito)): {i['data'].get('title', i['key'])[:70]}")
    print(f"{len(snapshot['items'])} obras, {len(snapshot['collections'])} coleções → {destino}")


if __name__ == "__main__":
    main()
