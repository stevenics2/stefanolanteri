"""Converte il file Excel dei turni in src/data/roster.json.

Uso (dalla cartella binario/):
    python3 scripts/importa_turni.py percorso/Turni.xlsx

Il foglio deve avere le colonne: Data, Giorno settimana, Turno, Orario, Unità operativa.
Per aggiornare il calendario basta rilanciare lo script con il nuovo file.
"""
import json
import sys

import openpyxl

src = sys.argv[1]
ws = openpyxl.load_workbook(src, data_only=True).worksheets[0]

giorni = []
for data, _giorno, turno, orario, unita in ws.iter_rows(min_row=2, values_only=True):
    if data is None:
        continue
    giorni.append({
        "d": data.strftime("%Y-%m-%d"),
        "t": str(turno).strip(),
        "o": orario or "",
        "u": unita or "",
    })

with open("src/data/roster.json", "w", encoding="utf-8") as f:
    json.dump(giorni, f, ensure_ascii=False, separators=(",", ":"))
print(f"{len(giorni)} giorni, dal {giorni[0]['d']} al {giorni[-1]['d']}")
