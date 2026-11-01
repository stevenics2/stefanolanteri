# Turni, account e backup: piano per l'app dei turni e per Keepway multiutente

Documento di passaggio. Riassume la discussione tra Stefano e Claude (sessione su Keepway) su: sostituire il «Visualizzatore turni» con la sezione turni di Keepway, rendere l'app personale per ogni utente, backup automatico, e il prompt per creare il file Excel dei turni. **Non è stato scritto nessun codice per questo piano**: è tutto da fare. Branch di lavoro: `insightbinary` (niente pull request).

## 1. Cosa Stefano vuole

- Cancellare completamente l'app vecchia («Visualizzatore turni», la pagina statica nella radice del repository: `index.html`, `app.js`, `style.css`, `vendor/xlsx…`; esiste anche la cartella `myroster/`) e usare al suo posto la parte turni di Keepway, «mille volte migliore»: **mantenere le modifiche** (straordinari, cambi, assenze), il **suono «cha ching»**, il **recap con i turni fatti del mese** ecc.
- L'app deve essere **personalizzata per ogni utente** (ognuno i suoi turni).
- Se l'utente cancella l'app o cambia telefono **non deve perdere i dati**: serve un **backup automatico** (almeno una volta al giorno).
- Gli utenti si **registrano come utenti nuovi**. Stefano ha chiesto di cominciare con la «chiave personale» e di aggiungere l'email dopo; ha chiesto quanta fatica sarebbe per l'utente il passaggio (vedi sotto).
- Il calendario del mese dentro la sezione Turni (`CalendarioMese`) può essere abbandonato nella versione «solo turni».
- Va cancellata l'altra app **solo alla fine, con la sua conferma**, quando la nuova la sostituisce davvero.

## 2. Come funziona oggi (fatti verificati nel codice)

- **Dove stanno i dati di Keepway**: solo sul telefono, in `localStorage` (chiave `keepway.v1`, con migrazioni in `carica()` di `src/lib/store.tsx`). Il server (Cloudflare Worker `worker/index.js` + database D1) conosce solo le iscrizioni push, il piano delle notifiche e i dati di salute, legati a un codice casuale (di cui salva solo l'impronta SHA-256). **Nessun account, nessuna copia dei progressi.**
- **I turni di Stefano** arrivano da `src/data/roster.json`, incorporato nel codice al momento della build. Si genera con `scripts/importa_turni.py` da un Excel (colonne: Data, Giorno settimana, Turno, Orario, Unità operativa). Formato di ogni giorno: `{"d":"2026-09-01","t":"1","o":"01:00-07:00","u":"112323 - Operativi"}`. Codici presenti: `1`, `2`, `3`, `4`, `1 + 4`, `R`, `RD`. Doppio turno: orari separati da ` / ` (es. `01:00-07:00 / 19:00-01:00`). 488 giorni, dal 31/08/2026 al 31/12/2027.
- **I turni hanno tempi fissi nel codice** (`TURNI` in `src/lib/calendario.ts`): 1 = 01:00–07:00 (notte), 2 = 07:00–13:00, 3 = 13:00–19:00, 4 = 19:00–01:00. Le regole su riposi, doppi turni consentiti (`DOPPI_CONSENTITI`) e straordinari (`extraConsentiti`, `violazioni`) ragionano su questi codici. Sonno, carico e allenamento hanno abitudini di Stefano scritte nel codice (`src/lib/sonno.ts`: sveglia 9:30 prima dei turni 3 e 4, 7 ore di sonno, ecc.).
- **Direzione delle dipendenze**: il nucleo dei turni (`src/lib/calendario.ts`, 237 righe) importa solo `roster.json` e i tipi (`Assenza`, `Modifica`). **Non conosce né task né sonno.** Sono `sonno.ts`, `carico.ts`, `allenamento.ts`, `giornata.ts`, `piano.ts`, `cicliSonno.ts` e alcuni componenti a importare `calendario.ts`, mai il contrario. I turni hanno quindi la priorità su tutto.
- **La sezione Turni** (`src/app/turni/`): `TurniLista.tsx` (142 righe), `MenuTurno.tsx` (308: modifiche), `RecapVista.tsx` (88: recap del mese), `CalendarioMese.tsx` (158), `banda.tsx` (16). Usano `useStore` (solo per `stato.modifiche` e `salvaModifiche`), funzioni di data, `annulla`, `effetti` (suoni), `seed` (`nuovoId`, `adessoMs`) e i componenti comuni `Presenza`, `Segmentato`, `Interruttore`, `task/ui`.
- **L'unico pezzo intrecciato** con il resto è `CalendarioMese`: mostra anche gli appuntamenti (`eventi`, `AgendaBox`, `FormEvento`) e usa `finestreLibere` del sonno. La lista turni usa anche `TurniDaSistemare` (scheda «turni da sistemare», che tocca anche le notifiche in `piano.ts`).
- **L'app vecchia**: pagina statica senza backend (circa 700 righe), legge `.xls`, `.xlsx` e CSV nel browser con SheetJS (`vendor/xlsx.full.min.js`, v0.18.5), **riconosce da sola le colonne** (`guessColumns`, `buildEntriesFromMapping`, data + Turno + Orario + descrizione) e legge un foglio «Legenda» (`Codice` / `Significato`; i codici con «riposo» nel significato sono riposi). Salva la vista nel `localStorage` del browser. È generica: accetta qualunque codice. Il suo parser si può riusare per l'importazione dentro Keepway.
- Nota di correzione: in un primo momento si era detto che la sezione turni «dipende dalle regole di sonno e carico». È vero il contrario: sono sonno e carico a dipendere dai turni.

## 3. Decisioni prese e idee concordate

1. **Account + salvataggio sul server = lo stesso lavoro.** Un'app web su iPhone non può salvare file in automatico ogni giorno: l'unico backup automatico possibile è sul server, legato a un'identità.
2. **Cosa salvare**: a ogni cambiamento (con una breve attesa), **copie giornaliere conservate 30 giorni** (per tornare indietro in caso di errore), più un pulsante «scarica backup» (file JSON). Migrazione al primo accesso: l'app carica sul server lo stato già presente sul telefono (nessuna perdita) e collega il codice di salute attuale all'account.
3. **Identità**: partire con una **chiave personale** (come quella della Salute), con email facoltativa per il recupero; poi email + codice a 6 cifre (senza password). L'email serve un servizio di invio e di solito un dominio proprio (circa 10 € all'anno; l'indirizzo gratuito di Cloudflare non basta). Alternative valutate: email + password (più lavoro e rischi), accesso con Apple (account sviluppatore a pagamento) o Google, passkey (da aggiungere dopo).
4. **Passare dalla chiave all'email costa poco all'utente**, a patto di costruire l'account con un'**identità interna fissa** e i «modi di entrare» come credenziali separate (chiave oggi, email poi, entrambe sullo stesso account, nessuna migrazione dei dati). L'utente vede un avviso «Aggiungi la tua email», scrive l'email, inserisce un codice: un minuto. La chiave continua a funzionare. Rischio da coprire: finché l'email non c'è, perdere la chiave vuol dire perdere l'accesso; per questo alla prima apertura l'app mostra la chiave e chiede di salvarla, e il promemoria per l'email ricompare finché non è fatto.
5. **Versione «solo turni»**: sezione Turni (lista, modifiche, recap) senza il calendario del mese. Due modi possibili, **da decidere**: una modalità dentro Keepway che mostra solo Turni e Recap (un solo codice, nessun doppione da tenere allineati) oppure un'app separata (più semplice per chi vuole solo i turni, ma due versioni da mantenere). Stefano propende per sostituire l'altra app con Keepway/la sua sezione turni.
6. **Personalizzazione**: due lavori distinti. (a) Dati personali: i propri turni da Excel, le modifiche, le task. (b) Regole personali: i turni 1–4 e le abitudini di sonno sono oggi nel codice; se gli altri utenti hanno turni diversi servono **turni configurabili** (codice → orari inizio/fine, tipo lavoro/riposo/assenza) e abitudini di sonno impostabili.

## 4. Ordine di lavoro proposto

1. **Backup** subito, a prescindere dagli utenti (esporta/importa JSON): protegge Stefano dalla perdita dei dati del telefono.
2. **Account con chiave** + salvataggio automatico sul server + copie giornaliere + recupero su un telefono nuovo + migrazione dei dati attuali. Identità interna separata dai modi di entrare.
3. **Importazione dei turni dentro l'app** da Excel/CSV (riusando il riconoscimento colonne dell'app vecchia e il foglio «Legenda»), al posto di `roster.json` incorporato e dello script Python. I turni diventano un dato per utente, non più nel codice.
4. **Prima apertura guidata** per un nuovo utente (account, salva la chiave, importa turni).
5. **Turni configurabili** (e abitudini di sonno), solo se gli altri utenti hanno turni diversi.
6. **Email + codice** quando c'è un dominio.
7. **Modalità «solo turni»** (o app separata) e, solo alla fine e con conferma esplicita di Stefano, **cancellazione dell'app vecchia**.

Ogni passo si può provare nel browser con l'orologio simulato e, per il server, con un database finto; poi commit e push su `insightbinary`. Cose da non dimenticare: il server si aggiorna solo con il deploy su Cloudflare; le notifiche partono dal server solo dopo che l'app ha mandato il piano.

## 5. Questioni aperte (chiedere a Stefano)

- Gli altri utenti avranno **i suoi stessi turni (1–4)** o turni diversi? Decide se il passo 5 serve subito.
- Per ora gli utenti sono **amici e colleghi** o l'app si apre a chiunque? Cambia il livello di attenzione su privacy e costi.
- Vuole **un dominio proprio** per le email? Se sì, si può passare subito a email + codice.
- Modalità dentro Keepway o app separata per i «solo turni»?
- Privacy: sonno e salute sono dati sensibili. Servono informativa, consenso, possibilità di cancellare i propri dati; tutti i dati stanno sul server Cloudflare di Stefano.

## 6. Prompt per creare il file Excel dei turni (da ChatGPT, Claude o altro)

Funziona con una foto, un PDF, uno screenshot o un foglio scritto a mano. Il formato è quello letto oggi da `scripts/importa_turni.py` (primo foglio, cinque colonne) più il foglio «Legenda», che oggi legge solo l'app vecchia e che Keepway leggerà quando i turni saranno configurabili. Limite attuale: Keepway capisce solo i codici 1, 2, 3, 4, R, RD finché i turni non diventano configurabili. Per un foglio scritto a mano si controlla sempre la tabella di controllo contro la carta prima di confermare; due foto nitide e dritte danno risultati migliori di una storta.

```text
Sei un assistente che trasforma una scheda turni di lavoro in un file Excel (.xlsx) per l'app Keepway. La scheda può essere una foto, un PDF, uno screenshot, un foglio scritto a mano o del testo.

COME LAVORARE
1. Se non lo vedo, chiedimi l'anno e il periodo (mese o anno intero).
2. Prima di creare il file, trascrivi tutto in una tabella di controllo. Segna con ⚠ ogni cella incerta (scrittura poco leggibile, macchie, righe tagliate) e chiedimi conferma. Non indovinare mai un turno: se non sei sicuro, chiedi.
3. Solo dopo la mia conferma, crea il file .xlsx.

FORMATO DEL FILE
Foglio 1, chiamato "Turni", con questa riga di intestazione esatta:
Data | Giorno settimana | Turno | Orario | Unità operativa
- Data: una riga per OGNI giorno del periodo, senza giorni mancanti, in ordine. Usa una vera data (AAAA-MM-GG), non testo con formati strani.
- Giorno settimana: lunedì, martedì... in italiano.
- Turno: il codice scritto sulla scheda (per esempio 1, 2, 3, 4, R per riposo, RD per riposo domenicale, F per ferie, M per malattia). Se un giorno ha due turni, scrivili uniti con " + " (per esempio "1 + 4").
- Orario: in formato 24 ore HH:MM-HH:MM. Per un turno a cavallo della mezzanotte scrivi per esempio 19:00-01:00 e lascialo nel giorno in cui inizia. Per un doppio turno separa gli orari con " / " nello stesso ordine dei codici (per esempio "01:00-07:00 / 19:00-01:00"). Lascia vuoto per riposi e assenze.
- Unità operativa: il reparto o la sede se è scritto, altrimenti vuoto.

Foglio 2, chiamato "Legenda", con questa intestazione:
Codice | Significato | Tipo | Inizio | Fine
- Una riga per ogni codice usato nel foglio 1.
- Tipo può essere solo: lavoro, riposo, assenza.
- Inizio e Fine in HH:MM solo per i codici di lavoro. Se la scheda ha una legenda degli orari, usala; se non c'è, chiedimi gli orari.

REGOLE
- Niente celle unite, niente formule, nessun colore come unica informazione.
- Se un giorno è vuoto o illeggibile, non riempirlo da solo: chiedimi.
- Mantieni i codici esattamente come sulla scheda.

ALLA FINE
Dammi un riepilogo: il numero totale di giorni, quanti giorni per ogni codice, il primo e l'ultimo giorno, e l'elenco delle celle che hai dovuto ipotizzare. Se non riesci a creare un .xlsx, dammi un CSV UTF-8 con le stesse colonne, uno per foglio.
```
