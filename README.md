# Visualizzatore Turni

Webapp statica (HTML/CSS/JS, nessun backend) per caricare un file Excel (`.xls`, `.xlsx`) o CSV con i turni annuali e visualizzarlo come una lista giornaliera in stile app mobile, con blocchi blu per i turni di lavoro e blocchi verdi per i riposi (RD, ferie, ecc.).

## Come usarla

1. Apri `index.html` in un browser (doppio click, oppure servilo con un semplice static server / GitHub Pages / Netlify).
2. Clicca sull'icona menu (☰) o sul pulsante `+` per aprire il pannello di caricamento.
3. Trascina il tuo file Excel oppure selezionalo dal file picker.
4. L'app rileva automaticamente:
   - la colonna che contiene le **date**;
   - la colonna **Turno** (es. `2`) e la colonna **Orario** (es. `07:00-13:00`), combinate nella prima riga del blocco come `2 (07:00-13:00)`;
   - la colonna con la **descrizione / unità operativa** (es. `112323 - Operativi`), mostrata come seconda riga.
5. Se il file ha un secondo foglio chiamato "Legenda" con colonne `Codice`/`Significato` (es. `RD` → `Riposo Domenicale`, `R` → `Riposo`), l'app lo legge automaticamente e precompila i **codici di riposo** con tutti i codici il cui significato contiene "riposo". Puoi comunque correggere manualmente le colonne rilevate e l'elenco dei codici di riposo (separati da virgola): qualunque riga il cui valore "Turno" corrisponde a uno di questi codici viene mostrata come blocco verde a riga singola, invece del blocco blu.
6. Clicca "Genera vista" per visualizzare l'elenco.

Non è richiesto un formato Excel fisso: basta avere una colonna data e una o due colonne di testo per turno/orario/descrizione (la colonna Orario è opzionale — se assente si mostra solo il codice turno). Il file non lascia mai il browser: il parsing avviene interamente lato client con [SheetJS](https://sheetjs.com/), la cui libreria (`vendor/xlsx.full.min.js`, v0.18.5) è inclusa nel repository: l'app funziona anche offline / dietro proxy restrittivi, senza dipendere da CDN esterni.

## Funzioni della barra superiore

- **☰ Menu / +**: apre il pannello di caricamento e mappatura colonne.
- **⟳ Aggiorna**: ricalcola la vista (utile dopo aver cambiato i codici di riposo).
- **📅 Vai a oggi**: scorre fino alla riga corrispondente alla data odierna (evidenziata in blu).
- **🔍 Cerca**: filtra le righe per testo su turno/descrizione.
- **🔔 Legenda**: mostra il significato dei colori.
- **☰ Filtra**: mostra solo turni di lavoro, solo riposi, o tutti.

## Deploy

Essendo file statici, puoi pubblicarla ovunque:

- **GitHub Pages**: abilita Pages sul repository puntando alla root (o alla cartella con questi file).
- **Netlify / Vercel**: drag & drop della cartella, nessuna build necessaria.
- **Uso locale**: apri direttamente `index.html` nel browser (funziona anche senza connessione internet, la libreria è inclusa nel repository).

## Struttura

- `index.html` — struttura della pagina e barra comandi.
- `style.css` — stile grafico (colori turni/riposi, layout lista).
- `app.js` — parsing del file Excel, rilevamento colonne, rendering della lista.

## Possibili estensioni future

- Vista calendario mensile oltre alla lista.
- Supporto a più turni nello stesso giorno.
- Esportazione/stampa del turno filtrato.
- Salvataggio della mappatura colonne per file con lo stesso formato (localStorage).
