# Decisioni prese durante lo sviluppo

- Repo `stefanolanteri`, cartella `binario/`, branch `insightbinary`. L'app esistente (visualizzatore turni) in radice non va toccata.
- Notifiche a orario ("metti su la lavatrice, ora!") incluse già in Fase 1, non rimandate.
- Livelli: da definire più avanti; idea = seguono le 6 stagioni (Vedere, Regolare, Smontare, Agire, Allenare, Diventare).
- Ogni task ha una **versione minima** che mantiene la serie. Da prevedere nel modello dati fin dalla v1.
- Dati da predisporre dalla v1: pratiche, versione minima, archivio delle prove, diario, stagioni, tempo di rimbalzo.
- Adattamento ai turni: con regole fisse, senza IA.
- IA (Claude): opzionale, solo per resoconti/consigli. Budget mensile in euro per utente, con consumo registrato in tabella (`ai_usage`) e blocco al raggiungimento del tetto. Il resto dell'app non dipende dall'IA.
- Kit SOS: da anticipare subito dopo la v1.
