# MyRoster

Versione personalizzata del [Visualizzatore Turni](../README.md), con i turni **già precaricati** in `data.js`: apri `index.html` e li vedi subito, senza dover caricare alcun file.

- I dati precaricati sono generati da `Turni_2026.xlsx` (31 ago – 31 dic 2026).
- Puoi comunque sostituirli in qualsiasi momento caricando un nuovo file `.xls`/`.xlsx` dall'icona menu (☰) o dal pulsante `+`: il nuovo file viene salvato nel `localStorage` del browser e ha la precedenza sui dati precaricati, finché non premi "Ripristina turni precaricati".
- Per aggiornare i dati precaricati per **tutti** i visitatori (non solo per il tuo browser), manda il nuovo file `.xls` a Claude chiedendo di rigenerare `myroster/data.js`, oppure genera tu il file con lo stesso schema: un array `window.DEFAULT_ENTRIES` di oggetti `{ date, turno, desc, isRest }` (vedi `data.js` come esempio).

Per il resto (colonne riconosciute, deploy, ecc.) vale tutto quanto descritto nel [README principale](../README.md).
