# Ferie — gestione ferie squadra E / E1

Webapp per inserire e visualizzare le ferie della squadra, divisa in **Squadra E** e **Squadra E1**, con calendario condiviso in tempo reale tra tutti i colleghi (a differenza dell'app "Visualizzatore Turni" nella root del repo, che salva solo in locale).

## Funzionalità

- Alla prima apertura viene chiesto di selezionare (o creare) il proprio nome; la scelta resta salvata su quel dispositivo/browser, così le volte successive si entra direttamente.
- Ogni operatore ha un colore assegnato automaticamente, usato per riconoscerlo nel calendario.
- Calendario mensile con tab **Squadra E** / **Squadra E1**: mostra i periodi di ferie di tutti (pallini colorati) e i turni di lavoro caricati da file Excel, sovrapposti nello stesso giorno. Cliccando su un giorno si apre il dettaglio per ogni operatore della squadra.
- Se per uno stesso giorno risulterebbero già **2 persone della stessa squadra** in ferie e se ne aggiunge una terza con periodo sovrapposto, compare un popup di errore e il salvataggio viene bloccato.
- Il file Excel dei turni (un unico file con la colonna "Operatore" per distinguere le persone) può essere caricato da chiunque dal menu ☰ e viene condiviso con tutti.

## Perché serve Firebase

Questa è una webapp statica (nessun server), ma i dati (operatori, ferie, turni) devono essere **condivisi in tempo reale** tra i colleghi, non solo salvati nel browser di chi li inserisce. Per questo l'app usa **Firebase Firestore**, un database cloud gratuito (per questi volumi resta nel piano free "Spark") che puoi creare tu in pochi minuti, senza scrivere codice.

## Come configurare Firebase (una tantum)

1. Vai su https://console.firebase.google.com e accedi con un account Google.
2. Clicca **"Aggiungi progetto"**, dai un nome (es. `ferie-squadra`), procedi con le impostazioni di default (puoi disattivare Google Analytics, non serve).
3. Nel menu a sinistra vai su **Build → Firestore Database** → **Crea database**. Scegli una location vicina (es. `eur3 (europe-west)`), e come modalità iniziale scegli **"Avvia in modalità test"** (regole più permissive, le sistemiamo al punto 6).
4. Nel menu a sinistra vai su **Build → Authentication** → **Get started**. Nella scheda "Sign-in method" abilita il provider **"Anonimo" (Anonymous)**. Serve solo per identificare in modo tecnico le richieste al database, non chiede nessuna password ai colleghi.
5. Torna alla panoramica del progetto (icona ingranaggio in alto → **Impostazioni progetto**), scorri fino a **"Le tue app"**, clicca sull'icona **`</>`** (Web) per registrare una nuova app web. Dai un nome (es. `ferie-web`), non serve Firebase Hosting.
6. Firebase mostrerà un blocco di codice con un oggetto `firebaseConfig = { apiKey: ..., authDomain: ..., ... }`. Copia questi valori dentro il file [`firebase-config.js`](./firebase-config.js) di questo repo, sostituendo i placeholder `INSERISCI_...`.
7. Sempre in Firestore, vai su **Regole** e sostituisci il contenuto con:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   Questo permette lettura/scrittura solo a chi ha effettuato l'accesso anonimo tramite l'app (cioè chiunque apra la pagina), bloccando l'accesso diretto al database dall'esterno senza passare dall'app.
8. Salva le regole, salva `firebase-config.js` con i tuoi valori reali, apri `index.html` (o pubblica la cartella `ferie/` come sito statico, es. GitHub Pages) e prova ad aggiungere un operatore.

> Nota: con le regole sopra, chiunque conosca l'indirizzo della pagina può leggere/scrivere i dati (non c'è una vera password per persona). Per un piccolo team interno è generalmente sufficiente; se in futuro serve un controllo più stringente si può aggiungere un login con email/password.

## Struttura

- `index.html` — schermata di selezione operatore + app principale (calendario, sidebar upload turni).
- `style.css` — stile grafico.
- `app.js` — logica: autenticazione anonima Firebase, gestione operatori/ferie/turni su Firestore, calendario, validazione conflitti, parsing Excel.
- `firebase-config.js` — credenziali del tuo progetto Firebase (da compilare, vedi sopra).
- `vendor/xlsx.full.min.js` — libreria [SheetJS](https://sheetjs.com/) per leggere i file Excel lato client.

## Modello dati (Firestore)

- `operators/{slug}` → `{ name, team ("E" | "E1"), color }`
- `vacations/{autoId}` → `{ operatorId, operatorName, team, color, start ("YYYY-MM-DD"), end ("YYYY-MM-DD") }`
- `shiftDays/{YYYY-MM-DD}` → `{ date, operators: { [operatorId]: { operatorName, turno, orario, desc, isRest } } }`

## Limiti noti

- La verifica "massimo 2 persone per squadra nello stesso periodo" avviene lato client al momento del salvataggio: se due persone salvano un periodo sovrapposto nello stesso istante esatto, in rari casi potrebbero entrambe passare il controllo. Per un team di queste dimensioni è un rischio trascurabile; se necessario si può rafforzare con una Cloud Function/transazione lato server.
- Il riconoscimento del nome operatore nel file turni caricato avviene per corrispondenza testuale (senza maiuscole/accenti) con i nomi già presenti in "operators": se un nome nel file non corrisponde a nessun operatore registrato, i suoi turni vengono comunque salvati ma non compariranno nel calendario finché quell'operatore non viene creato con lo stesso nome.
