# Binario — Documento di progetto

> Webapp personale (PWA) con gamification che mi dia, nella vita di tutti i giorni, la stessa struttura che ho al lavoro in porto.
> Nome provvisorio: **Binario**.

---

## 1. Contesto e obiettivo

Sono Stefano, 41 anni, gruista al porto di Trieste da 22 anni, su turni a rotazione 24/7. Al lavoro eccello perché c'è una struttura che mi dice cosa fare e quando. Fuori dal porto quella struttura manca: inizio le cose e non le porto a termine.

**Obiettivo dell'app:** accorciare la distanza tra quello che so e quello che faccio, con abitudini piccole, ripetute e misurabili, adattate ai miei turni.

**Principio guida, valido anche per lo sviluppo:** miglioramenti graduali. Prima una versione piccola che uso davvero ogni giorno, poi la si fa crescere.

---

## 2. Requisiti generali

- **Piattaforma:** webapp installabile (PWA), usata principalmente su **iPhone**, aggiunta alla schermata Home.
- **Lingua dell'interfaccia:** italiano.
- **Utenti:** all'inizio solo io, ma l'architettura deve supportare **più utenti** fin da subito (registrazione, login, dati separati per utente).
- **Notifiche push:** obbligatorie (su iOS funzionano solo con la PWA aggiunta alla Home, iOS 16.4 o successivo).
- **Stile:** divertente e motivante, con effetti visivi forti al completamento delle task. Ottimizzata per mobile, tema scuro.

### Stack suggerito (da confermare con me prima di iniziare)

- Frontend: React / Next.js come PWA (service worker, manifest).
- Backend e autenticazione: Supabase (auth, database Postgres, sicurezza a livello di riga per utente) o alternativa equivalente.
- Notifiche: Web Push tramite service worker.
- Grafici: una libreria leggera (es. Recharts).
- Effetti: coriandoli/animazioni (es. canvas-confetti), suoni brevi disattivabili.
- Hosting: Vercel o equivalente, con costi pari a zero per l'uso personale.

---

## 3. Funzionalità della v1

### 3.1 Aree

Tre aree di vita, ognuna con colore e icona proprie:

1. **Allenamento** (corsa, bagni freddi, palestra, stretching, ecc.)
2. **Progetti** (es. contenuti per il mio profilo, studio)
3. **Ordine in casa**

Più un'area **Abitudini quotidiane** per le task ricorrenti fisse.

### 3.2 Task

Ogni task ha:

- titolo (es. "Sistema il soggiorno")
- area
- durata in minuti (opzionale, attiva il timer)
- ricorrenza: una volta, ogni giorno, ogni sera, giorni specifici della settimana, oppure "nei giorni con turno X / di riposo"
- orario o fascia suggerita (mattina, pomeriggio, sera)
- punti (calcolati in automatico in base a durata e difficoltà, modificabili)

**Task ricorrenti da precaricare:**

| Task | Durata | Ricorrenza |
|---|---|---|
| Lettura | 20 min | ogni giorno |
| Lavare i piatti | 15 min | ogni sera |

**Esempio di task con timer:** "15 minuti: sistema il soggiorno".

### 3.3 Timer

- Pulsante **Avvia** su ogni task con durata.
- Conto alla rovescia a schermo intero, grande e leggibile, con anello di avanzamento.
- Pausa e ripresa.
- Il timer deve funzionare anche se l'app passa in background o lo schermo si spegne (salvare l'orario di inizio e ricalcolare al rientro). Notifica a fine timer.
- Allo scadere: effetto di completamento e task segnata come fatta (con possibilità di annullare).

### 3.4 Effetti di completamento

- Coriandoli o esplosione di particelle, punti che "volano" verso il contatore, suono breve.
- Effetto più grande quando si sale di livello o si completa una sfida settimanale.
- Animazioni e suoni disattivabili dalle impostazioni.

### 3.5 Gamification

- **Punti (XP)** per ogni task completata.
- **Livelli** con soglie crescenti e un nome per livello (da definire insieme, stile divertente).
- **Serie di giorni consecutivi (streak)** per ogni abitudine ricorrente, ben visibili. Prevedere un "salvataggio" limitato (es. 1 giorno di pausa a settimana) per non perdere la serie dopo un doppio turno.
- **Sfida settimanale**, es. "4 allenamenti questa settimana", con barra di avanzamento e bonus punti.
- **Grafico dei progressi**: punti per settimana, task completate per area, andamento delle serie.

**Regola importante:** gli straordinari al lavoro **non** danno punti (vedi 3.7). L'app non deve premiarmi per lavorare di più, ma per prendermi cura di me.

### 3.6 Schermate

1. **Oggi** — turno del giorno in evidenza, task del giorno ordinate per fascia oraria, punti e livello, serie attive.
2. **Turni** — calendario mensile dei turni e resoconto (vedi 3.7).
3. **Progressi** — grafici, sfida settimanale, storico.
4. **Task** — elenco, creazione e modifica di task e ricorrenze.
5. **Impostazioni** — profilo, notifiche, suoni, tariffa straordinari, import turni.

### 3.7 Sezione Turni

**Contesto:** lavoro su un roster obbligatorio di **26 turni al mese da 6 ore**, a rotazione su ciclo "Giornate A–H". I turni sono numerati (es. 1, 2, 3, 4) con orari fissi. Oltre al roster esistono **straordinari facoltativi**.

> Gli orari dei turni e il calendario completo 2026-2027 li fornirò io in un file separato. Il formato di import va concordato (CSV, JSON o tabella). L'app deve permettere anche di reimportare un nuovo calendario in futuro.

**Funzioni:**

- Calendario mensile con il turno previsto per ogni giorno, colorato per tipo (mattina, pomeriggio, sera, notte, riposo).
- **Modifiche rapide**, es. "Mercoledì 3+4": mercoledì era previsto solo il turno 4, mi chiedono anche il 3 in straordinario. Aggiungo il 3 con due tocchi, segnato come straordinario.
- Tipi di modifica: straordinario aggiunto, cambio turno con un collega, ferie, permesso, malattia.
- **Resoconto mensile:** turni da roster fatti, straordinari, cambi, ore totali, e **guadagno extra stimato** dagli straordinari (tariffa oraria impostabile).
- Indicatore **"Tempo ripreso per me"**: ore libere del mese rispetto al mese precedente.
- Stile grafico divertente anche qui, ma senza punti per gli straordinari.
- **Punti recupero:** dopo un doppio turno o una notte, l'app propone task di recupero (dormire, stretching, passeggiata) che danno punti.

### 3.8 Piano adattato ai turni

- L'app sa che turno faccio oggi e domani.
- Nei giorni di notte o doppio turno propone **meno task** e più leggere.
- Le task con ricorrenza "ogni sera" si spostano in base al turno (es. se faccio la sera, i piatti diventano "al rientro" o "prima di uscire").

### 3.9 Notifiche

- Promemoria per le task programmate (orario impostabile).
- Fine del timer.
- Promemoria serale se una serie sta per rompersi.
- Riepilogo della sfida settimanale (es. domenica sera).
- Silenzio automatico durante le ore di turno e di sonno dopo una notte.

---

## 4. Modello dati (indicativo)

- `users`: id, nome, impostazioni (suoni, animazioni, tariffa straordinari, fascia silenziosa).
- `areas`: id, user_id, nome, colore, icona.
- `tasks`: id, user_id, area_id, titolo, durata_min, ricorrenza, fascia_oraria, punti, attiva.
- `task_completions`: id, task_id, user_id, data, minuti_effettivi, punti_ottenuti.
- `shifts_roster`: id, user_id, data, turno (es. 1, 2, 3, 4, riposo), giornata_ciclo (A–H).
- `shift_changes`: id, user_id, data, tipo (straordinario, cambio, ferie, permesso, malattia), turno, ore, nota.
- `weekly_challenges`: id, user_id, settimana, obiettivo, area_id, target, progresso, bonus.
- `user_stats`: user_id, xp_totali, livello, serie per task.

---

## 5. Roadmap

### Fase 1 — v1 (da costruire adesso)
Autenticazione multi-utente, aree e task, task ricorrenti precaricate, timer, effetti, punti, livelli, serie, schermata Oggi, PWA installabile, notifiche base.

### Fase 2
Sezione Turni completa (import calendario, modifiche rapide, resoconto mensile, tempo ripreso), piano adattato ai turni, sfide settimanali, grafici progressi.

### Fase 3
**Dati di Apple Watch / Salute:** una webapp non può leggere direttamente Salute di Apple. Soluzione: un'automazione con **Comandi rapidi di iOS** che ogni sera legge da Salute passi, sonno, allenamenti e battito, e li invia a un endpoint API dell'app. L'app li usa per registrare in automatico gli allenamenti e mostrare il sonno.

### Fase 4
**Adattamento alle abitudini, senza IA:** l'app nota schemi ricorrenti (es. "dopo un turno di notte salti la lettura") e propone spostamenti. Aumenta gradualmente la difficoltà (es. dopo due settimane di 15 minuti costanti propone 20). Calibra le sfide settimanali sulla mia media.

### Fase 5
**Resoconto settimanale con IA:** integrazione con l'API di Claude. Una volta a settimana l'app invia un riepilogo dei miei dati e riceve un resoconto: cosa ha funzionato, dove ho mollato, cosa cambiare. Richiede una chiave API separata (a pagamento in base all'uso, costi molto bassi). Attenzione alla privacy: inviare solo dati aggregati, mai dati sanitari grezzi.

---

## 6. Privacy e sicurezza

- Dati di ogni utente isolati (sicurezza a livello di riga nel database).
- Dati di salute trattati come sensibili: salvati solo se l'utente li attiva, eliminabili in qualsiasi momento.
- Possibilità di esportare tutti i miei dati (JSON/CSV) e di eliminare l'account.

---

## 7. Istruzioni per Claude Code

1. Prima di scrivere codice, proponimi stack, struttura del progetto e piano della Fase 1, e aspetta la mia conferma.
2. Costruisci **una fase alla volta**, con una versione funzionante e testabile sul mio iPhone alla fine di ogni fase.
3. Spiegami in modo semplice i passaggi che devo fare io (account, hosting, aggiunta alla Home, permessi notifiche).
4. Se un requisito non è chiaro o va contro un altro, chiedimelo invece di scegliere da solo.
5. Tieni il codice semplice e ben commentato: voglio poterlo far crescere nel tempo.
