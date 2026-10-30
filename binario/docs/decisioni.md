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
- Consiglio sonno (`src/lib/sonno.ts`): sera prima, in base al turno di domani, ora a letto per 7-8 ore (minimo 7, ideale 8). Sveglia = inizio turno − 60 min (turno 7:00 → 6:00), ma non prima delle 8:00 per i turni pomeridiani/serali. Dopo un turno che finisce tardi la sveglia slitta in avanti. Assunzione da confermare: 45 min tra fine turno e letto.
- Da fare: sonno dopo il turno di notte (dormire dopo le 7:00), e rendere questi parametri modificabili nelle Impostazioni.
