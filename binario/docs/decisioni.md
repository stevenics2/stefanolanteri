# Decisioni prese durante lo sviluppo

- Repo `stefanolanteri`, cartella `binario/`, branch `insightbinary`. L'app esistente (visualizzatore turni) in radice non va toccata.
- Notifiche a orario ("metti su la lavatrice, ora!") incluse già in Fase 1, non rimandate.
- Livelli: da definire più avanti; idea = seguono le 6 stagioni (Vedere, Regolare, Smontare, Agire, Allenare, Diventare).
- Ogni task ha una **versione minima** che mantiene la serie. Da prevedere nel modello dati fin dalla v1.
- Dati da predisporre dalla v1: pratiche, versione minima, archivio delle prove, diario, stagioni, tempo di rimbalzo.
- Adattamento ai turni: con regole fisse, senza IA.
- IA (Claude): opzionale, solo per resoconti/consigli. Budget mensile in euro per utente, con consumo registrato in tabella (`ai_usage`) e blocco al raggiungimento del tetto. Il resto dell'app non dipende dall'IA.
- Kit SOS: da anticipare subito dopo la v1.
- Giorni di notte (turno 1) e doppio turno: l'app propone solo le task essenziali (versione minima); l'utente può scegliere di non farne nessuna, a seconda della stanchezza.
- Consiglio sonno (`src/lib/sonno.ts`): calcola il prossimo sonno dalla sequenza dei blocchi di lavoro. Abitudini di Stefano:
  - turno 7:00 -> sveglia 6:00; turni 13:00 e 19:00 -> sveglia 9:30. Minimo 7 ore (ideale 8, anche 9 va bene).
  - 90 min tra fine turno e letto (un 4 che finisce all'1:00 -> a letto alle 2:30).
  - Dopo la notte (finisce alle 7:00): a letto alle 8:00, sveglia 14:30-15:00 (sonno corto, previsto).
  - Mattina (finisce 13:00) e il giorno dopo il turno "1" (che inizia all'1:00 *di quella stessa notte*): riposino 14:30 -> 18:00.
  - Il turno 1 / "1 + 4" è sempre preceduto da un turno 2: nel calendario sono due date diverse ma una sola nottata.
- Task: da completare in giornata, senza orari fissi per ora.
- Carico per giorno (`src/lib/carico.ts`): turno "1" (dopo la notte) -> solo task essenziali; "1 + 4" (notte + sera) -> nessuna task; mattina + notte -> giorno normale (dalle 18 all'1 è in forma, di solito palestra). Da rivedere strada facendo.
- Da fare: rendere questi parametri modificabili nelle Impostazioni.
