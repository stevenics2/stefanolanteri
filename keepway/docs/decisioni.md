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
- Fase 1, passo "task" (fatto): task con versione minima, timer a schermo intero (ricalcolato dall'ora di inizio), punti, livelli provvisori, serie con 1 salvataggio a settimana, ricompense a sorpresa, archivio prove, frasi identitarie, esportazione dati. Dati per ora in localStorage (chiave `binario.v1`), stessa forma delle tabelle future.
- Task precaricate: Meditazione (10/3 min, essenziale), Lettura (20/5, essenziale), Piatti (15/5, non essenziale: da rivedere). "Ordine in una stanza" = task "una volta" in una data, o ripetuta in un giorno della settimana.
- Notifiche (fine timer in background, promemoria a orario): richiedono il server (Web Push) e quindi arrivano insieme a Supabase/Vercel. Ora il timer avvisa solo con suono/vibrazione se l'app è aperta.
- Icone: lucide-react al posto delle emoji. Nei dati le aree salvano una chiave ("dumbbell", "casa"...), con migrazione automatica dei dati vecchi.
- Stanze a rotazione (`src/lib/stanze.ts`): task "stanza" quotidiana, una stanza al giorno, nessuna ripetizione finché il giro non è completo (poi si riparte). "Salta oggi" = la stessa stanza torna domani, la serie non si rompe. Elenco stanze modificabile nelle Impostazioni (scritte per intero: "il soggiorno").
- "Più tardi" (1 ora / 3 ore / stasera 20:30) e "Salta oggi" su ogni task. Il rinvio per ora è solo salvato e mostrato: l'avviso vero parte con le notifiche.
- Promemoria per task (`promemoria`: orari HH:MM, ripetuti fino a quando non è fatta). Stanza: 10:00, 14:00, 18:00, 20:30. Da collegare alle notifiche push (serve un server che invii ogni pochi minuti: cron Vercel Hobby = 1 volta al giorno, quindi servirà Supabase o un cron esterno).
- Modalità fuori casa (`vacanza`): dal/al, task con `soloACasa` nascoste, serie neutre. Si attiva da Oggi ("Fuori casa") o dalle Impostazioni con date.
- Feedback al tocco (`FeedbackTocco`, `lib/vibrazione.ts`): "tic" e vibrazione su ogni pulsante/link, ognuno disattivabile dalle Impostazioni. Android: navigator.vibrate. iPhone: Safari non ha la Vibration API; si usa il trucco dell'interruttore (checkbox con attributo `switch`), che dà un leggero tocco su iOS recenti. DA VERIFICARE su iPhone reale.
- Vocabolario dei suoni (`lib/effetti.ts`, attributo `data-suono` sui pulsanti): via (3 note che salgono: avvio timer, salva, attiva), indietro (bip basso: annulla, chiudi, ricomincia), pausa (2 che scendono: pausa, salta oggi), riprendi (2 che salgono), ok (task fatta), livello, vittoria (fanfara a fine timer). "nessuno" = lo gestisce già l'effetto di completamento. Nuovi pulsanti: basta aggiungere data-suono.
- Timer: "Ricomincia da capo" (resettaTimer) rimette il tempo pieno.
- Vibrazione su iPhone: non funziona sul telefono di Stefano (trucco iOS non affidabile). Da riconsiderare con notifiche/app nativa; nel frattempo il suono fa da feedback.
- Timer (rivisto): la card ha il pulsante "Timer"; apre la schermata ferma con il tempo pieno ("pronto"). Start/Pausa/Riprendi, Reset (torna a pronto, disabilitato se non è partito), Indietro (chiude senza completare, con conferma se era partito). "Termina ora" compare solo dopo la versione minima. Suono "via" sul Start. La notifica punti non si mostra col timer aperto. Intestazione abbassata (safe-area + 3rem) per l'effetto sfocato in alto visto su iPhone.
- Hosting: spostato da Vercel a **Cloudflare Pages** (sito statico, `output: "export"`, icone PNG in `public/icons`, manifest statico). Motivo: Stefano usa già Cloudflare per Tallyrooms; il cron gratuito di Cloudflare gira ogni minuto (Vercel Hobby: 1 volta al giorno) e serve alle notifiche. Per le notifiche si riusa `tallyroom/reminder/webpush.js` (VAPID/Web Push già funzionante) con un Worker + D1.
- Prossimo: notifiche push su Cloudflare (Worker con cron ogni minuto + D1 per iscrizioni e orari), poi account.
- NOME: l'app si chiama **Keepway** ("mantieni la strada"; ex nome provvisorio Binario). Cartella `keepway/`, branch `insightbinary` invariata. Dominio da decidere: keepway.app disponibile (~25 EUR), .com no. Si compra più avanti; per ora indirizzo gratuito `.pages.dev`. I documenti in `docs/` mantengono il nome originale "Binario".
- Pubblicazione: Cloudflare Workers Builds (non Pages) con `wrangler.jsonc` (assets da `out/`). Impostazioni: Path `keepway`, build `npm run build`, deploy `npx wrangler deploy`, production branch `insightbinary` (da Settings > Build > Branch control: va impostata, altrimenti Cloudflare costruisce la branch predefinita del repo e fallisce con "root directory not found").
- Notifiche push (fatte, in attesa del database D1): `worker/index.js` (API + cron ogni minuto) e `worker/webpush.js` (copiato da Tally Rooms) nello stesso Worker del sito; `wrangler.jsonc` ha `main`, `run_worker_first: ["/api/*"]`, cron. Il database D1 si aggiunge con `d1_databases` (binding `DB`); le tabelle si creano da sole. Senza DB le API rispondono 503.
- Come funziona: l'app calcola il "piano" delle notifiche dei prossimi 3 giorni (`lib/piano.ts`) e lo manda al server a ogni cambiamento (`SincronizzaNotifiche`); il server consegna a scadenza. Se fai/salti/rimandi una task, il piano si ricalcola e i promemoria inutili spariscono. Silenzio durante i turni (mezz'ora prima inclusa) e il sonno (`èInSilenzio`); fine timer e "più tardi" non si silenziano. Identità: `deviceId` casuale per telefono (niente account per ora).
- Limiti iPhone: le notifiche web funzionano solo dall'app sulla Home (iOS 16.4+), niente pulsanti nella notifica, suono di default di iOS.
- Da fare: avviso "serie a rischio" la sera, riepilogo domenicale della sfida, notifiche legate agli account.
- iPhone: il sistema sfuma la fascia sotto orologio/batteria; tutte le schermate partono da `--pt-pagina` (safe-area + 2.5rem), timer a +3rem. Gli input hanno `font-size: 16px` (sotto i 16px Safari zooma da solo e non torna indietro); `touch-action: manipulation` contro lo zoom da doppio tocco. Non usare mai `text-sm` o simili direttamente su input/select.
- DA IMPLEMENTARE (Turni, "modifiche rapide"): doppi turni attaccati 2+3 (07-19) e 3+4 (13-01), 12 ore di fila, spesso aggiunti all'ultimo come straordinario. Sono giorni a carico RIDOTTO ("essenziale", non "nessuna"). Il calendario importato non li contiene: servono le modifiche rapide (tap sul giorno, aggiungi turno extra/straordinario) e poi `caricoGiorno`, il sonno (`sonno.ts` lavora per blocchi) e il silenzio delle notifiche devono leggere calendario + modifiche. Regola per `caricoGiorno`: giorno con 2 turni attaccati -> essenziale; "1 + 4" -> nessuna; dopo la notte -> essenziale.
- Oggi: il riquadro del sonno sta in fondo, dopo le task (non è la prima cosa da vedere). Testo: "Per fare il turno X domani, dovresti andare a dormire alle HH:MM" + dettaglio (sveglia, ore, "al più tardi"). Varianti per riposino prima della notte e sonno dopo la notte. Il turno si dice "oggi / stanotte / domani / dopodomani" (il turno 1 inizia all'1:00 della data indicata, quindi è "stanotte").
- Oggi (struttura nuova): 1) riepilogo "dopaminico" (anello della giornata, livello con nome in gradiente, XP che salgono, barra con riflesso, serie con fiamma, XP di oggi, task in settimana, frase che cambia); 2) "Cosa devi fare oggi:" tutte le task partendo dalla pulizia (stanza del giorno, poi casa, poi il resto; le fatte in fondo); 3) "MUST BEFORE SLEEP:" task con fascia "sera" (piatti) + dalle 18 tutte le task non ancora fatte; 4) sonno in fondo: "Domani hai il N° turno / Dovresti addormentarti entro le HH:MM" + pulsante sveglia. Niente più blocchi per fascia.
- Task che "si adattano ai turni" (`adattaATurni`, di default la stanza): `finestreLibere`/`finestraMigliore` in `sonno.ts` trovano il momento libero più lungo (né in turno, né a dormire, 08:00-22:30); la card mostra "Momento giusto: HH-HH" e i promemoria (`piano.ts`, `orariPerGiorno`) stanno lì dentro. Nessuna finestra = niente promemoria e invito alla versione minima.
- Sveglia iPhone: non esiste un'API web per l'app Orologio; si usa il Comando rapido "Keepway Sveglia" (`shortcuts://run-shortcut?name=...&input=text&text=HH:MM`), da creare una volta (guida in Impostazioni). DA VERIFICARE su iPhone reale.
- Accessi futuri: Google + email con link (gratis), Apple (99 USD/anno, da valutare), Facebook opzionale, "Sign in with ChatGPT" ancora in beta limitata. Servono informativa privacy/GDPR e RLS sui dati (alcuni sono dati sulla salute).
- Regola "dalle 18 le task non fatte passano in MUST BEFORE SLEEP": scritta ma SPENTA in sviluppo (`REGOLA_SERA_ATTIVA = false` in `OggiVista.tsx`). Ora in MUST BEFORE SLEEP stanno solo le task con momento "Prima di dormire" (piatti).
- Task: pulsante "Inizia!" e XP visibili su ogni card (+XP, minima = metà). XP predefiniti: stanza 50, lettura 20, meditazione 20, piatti 20; allenamenti 20-60. Scheda Task a icone: Nuova task / Allenamento / Promemoria / Appuntamento, ciascuna con il suo modulo a icone e chip.
- Appuntamenti e promemoria (`Evento`): titolo, categoria (dottore, dentista, psicologa, lavoro, auto, altro), data, ora, durata, priorità alta/media/bassa, luogo, "avvisami prima" (nessuno, 1, 3, 7, 14 giorni). In Oggi: "Oggi hai:", "Domani hai:" e "In arrivo:" (oltre domani, nel periodo di anticipo; prima le priorità alte). I promemoria non fatti scaduti restano visibili oggi.
- Conflitti: `conflittiAgenda` (sonno.ts) controlla turni (con 30 min di margine), sonno consigliato (dopo la notte, riposino, notte) e altri appuntamenti; mostra anche i momenti liberi del giorno. Si può salvare comunque.
- Avvisi per gli eventi (`piano.ts`): anticipo scelto alle 9:30, vigilia alle 18:30, 2 ore prima. Spostati fuori da turni e sonno (mai oltre l'evento); priorità ALTA sempre, anche in silenzio. Il server accetta notifiche fino a 31 giorni avanti.
- Calendario mensile: in Turni, scheda "Calendario" (turni colorati + puntini degli appuntamenti per priorità); toccando un giorno si vedono turno, appuntamenti, momenti liberi e si aggiungono appuntamenti/promemoria.
- TURNI MODIFICABILI (`lib/calendario.ts`): il calendario "effettivo" = turni importati + `Modifica` (straordinario, cambio_azienda, cambio_personale, assenza ferie/malattia/permesso/altro). Sonno, conflitti, carico, silenzio notifiche e task leggono da lì; lo store chiama `impostaModifiche` a ogni cambiamento. I turni attaccati (2+3, 3+4) diventano un solo blocco lungo; carico "essenziale" (come 1 e malattia); 1+4 = nessuna.
  - Tocco su un giorno -> menu: Cambio turno (richiesto dall'azienda = striscia verde "CAMBIO TURNO PAGATO DA AZIENDA"; personale = grigio-blu "CAMBIO TURNO PERSONALE"; con "salto questo turno e lo faccio un altro giorno" crea due modifiche collegate da `gruppo`), Straordinario (viola "ORE DI STRAORDINARIO", 6 ore per turno extra), Assenza.
  - Etichette: "R - (ex 3)", "2 - (ex 3)", "2+3", "FERIE - (ex RD)". Annullabili: toast "Annulla" subito (ripristina anche la modifica sostituita) e "Annulla la modifica" nel menu del giorno.
  - Recap del mese (Turni, lista e calendario): straordinari e ore, cambi pagati (per gruppo), cambi personali, assenze per tipo. Stima in euro: rimandata (più avanti: tariffa straordinario/h e importo cambio pagato).
- Spostamenti: `spostamentoMin` (andata; altrettanto al ritorno) su appuntamenti (default 20), task e allenamenti (corsa/palestra/nuoto/bici 20, da casa 0). Conflitti: occupazione = [inizio - spostamento, fine + spostamento]; prima di un turno 40 min di margine (con 20 di rientro: l'appuntamento finisce 1 ora prima, es. turno 3 -> entro le 12:00). Il momento libero per una task considera durata + 2 x spostamento.
- Corsa: in km, 6 min/km (`lib/durata.ts`), +20 min di andata e 20 di ritorno, niente timer, 10 XP/km. Versione minima tolta dagli allenamenti (resta nelle altre task). Allenamento: "Quando?" con i 7 giorni su una riga, niente "ogni giorno"; palestra 60/90/120.
- Appuntamenti: ora di partenza 11:00 visibile (promemoria: chip "Senza ora"); "Avvisami prima" a scelta multipla (1 giorno, 3 giorni, 1 settimana, 2 settimane) -> `avvisi: number[]`.
- Oggi: recap in stile Matrix (nero + verde #3dffa8, pioggia di caratteri leggera su canvas, ~14 fps, ferma se la pagina è nascosta o se le animazioni sono spente), compatto; pulsante sveglia solo "Imposta sveglia" (il Comando rapido "Keepway Sveglia" ha una sola azione: Apri app > Orologio; l'orario consigliato resta scritto nel riquadro del sonno). Tolto l'orologio accanto al turno di oggi.
- REGOLE SUI TURNI (`calendario.ts`): sempre almeno 12 ore tra un turno e l'altro (il calendario importato le rispetta: pausa minima 12 h). Doppi turni consentiti SOLO 2+3, 3+4 (attaccati) e 1+4 (stesso giorno); mai 1+3, 4+1 (4 e poi 1 all'1:00 = 12 ore di fila), 1+2, 2+4, né tripli. Il menu offre solo gli extra consentiti ("1+3 non si può"). Dopo ogni modifica `violazioni()` controlla riposo e doppi: schermata "Attenzione: turni da sistemare" con pulsanti per modificare il giorno vicino (anche a catena: 3+4 oggi -> il 2 di domani non va -> cambio in 3 -> il turno 1 del giorno dopo non va...). Se si rimanda, resta il riquadro rosso in Oggi e Turni, le strisce rosse sui giorni (calendario: "!") e una notifica alle 9:30, alle 12:00 e alle 19:00 (spostate fuori da turni e sonno, mai di notte) finché non è sistemato.
- Conflitto turni: il titolo è sempre "Attenzione: Conflitto turni" (schermata dopo la modifica, riquadro rosso in Oggi/Turni, striscia rossa sul giorno, notifica), seguito da una riga su cosa non va ("Solo 6 ore di riposo dopo il turno 3+4 del 31/10"). Straordinario confermato: suono "incasso" (cassa da negozio sintetizzata: scatto + campanello metallico + cassetto) e piccola esplosione di monetine d'oro (canvas-confetti, cerchi dorati) al posto dei coriandoli; rispettano le opzioni Suoni / Animazioni.
- Cambio turno (azienda e personale) come lo straordinario: suono "incasso" + monetine. Dopo ogni modifica ai turni, in basso a sinistra (insieme al toast "Annulla", ~9 s) un piccolo recap del mese: Turni straordinario (turni extra), Cambi turno (gruppi azienda + personali), Doppi turni = giorni con 2 turni nati da un cambio o da uno straordinario (il 1+4 regolare del calendario NON conta; un 4 aggiunto dopo l'1 in straordinario conta). Il recap in alto in Turni mostra anche "doppi turni".
- Turni ora ha tre schede: Lista | Calendario | Recap. Il recap non sta più in cima a Lista e Calendario: la scheda Recap ha il mese (con frecce), quattro riquadri (turni straordinario con ore, cambi turno pagati/personali, doppi turni, assenze) e l'elenco di tutte le modifiche del mese, ognuna con "Annulla" (conferma; le modifiche collegate si annullano insieme). Il riquadro piccolo in basso a sinistra dopo ogni modifica resta.
- Suono "incasso" rifatto a strati: tic-tic meccanico + colpo sordo, campana d'ottone (parziali non armonici doppiati per il luccichio), cassetto (rumore filtrato) + tonfo di legno, tintinnio di monete. Verificato offline: picco 0,49, nessuna saturazione, coda ~1,5 s. Da giudicare a orecchio su iPhone.
- Suono "incasso" = "CHA-CHING!": CHA (click metallico + colpo sordo + campanello corto su A6, si spegne subito), stacco di ~0,1 s, CHING (campanello d'ottone su E7, una quinta sopra, suona a lungo ~1,5 s). Niente cassetto né monete sonore (le monetine restano solo visive). Misurato offline: picco 0,66, nessuna saturazione, CHING più forte del CHA.
- Turni: schede Roster | Calendario | Recap (prima "Lista").
- Layout "a schermo" (`layout.tsx`): il body è alto `100dvh` in colonna; `main` scorre (overflow-y-auto) e la barra in basso è un elemento del layout (non più `position: fixed`), così sta sempre in fondo anche con pagine corte (su iPhone il footer fisso nel Recap risultava più in alto). Conseguenze: l'intestazione sticky dei Turni usa `top: calc(var(--pt-pagina) * -1)` per compensare il padding di `main`; i test con screenshot a pagina intera vedono solo lo schermo.
- AUDIO su iPhone: dopo che l'app va in background l'AudioContext passa a "interrupted" e resta muto; ora `avviaAudio` lo riattiva ogni volta che non è "running" (non solo "suspended") e `FeedbackTocco` lo riprende già al primo `pointerdown`. Se ancora non si sente: controllare levetta silenzioso e volume (Web Audio tace in modalità silenziosa).
- Cambio turno "salto questo turno e lo faccio un altro giorno": si sceglie quale turno si farà l'altro giorno (parte dai turni che ha + il proprio, modificabile; combinazioni controllate: 2+4 ecc. bloccate).
- Recap (scheda): in ELENCO, non a riquadri. Dei cambi turno conta solo "pagati da azienda" (i personali non compaiono nei numeri; restano nell'elenco delle modifiche solo per poterli annullare). Doppi turni = da straordinario o da cambio pagato. Il riquadro in basso a sinistra mostra "Cambi turno pagati".
- FOOTER (retromarcia): la struttura "a schermo" (body h-dvh con overflow-hidden e barra non fissa) alzava il footer su TUTTE le pagine su iPhone: il footer sta al bordo solo se il documento può scorrere. Ripristinata la barra `fixed bottom-0` e il body sempre più alto dello schermo di 2px (`min-height: calc(100dvh + 2px)` in globals.css), così anche il Recap (pagina corta) scorre di poco e la barra resta in basso. Regola: non rendere mai la pagina non scorrevole. L'intestazione dei Turni è di nuovo `sticky top-0`.
- Recap: i numeri stanno a destra di ogni riga.
- Recap di Oggi rifatto "da nerd" (`RiepilogoOggi.tsx`): console monospace verde su nero, intestazione che si scrive (`keepway@oggi:~$ ./status --live`), `LV.n NOME` e XP, cinque righe con barra ASCII a blocchi che avanza e percentuale che sale: XP→LV (verso il livello), OGGI (task fatte/previste), SETTIM (da lunedì), SERIE (verso il prossimo traguardo 3/7/14/30/60/100 giorni), COSTANZA (giorni con almeno una task su ultimi 30). In fondo: xp oggi, Δ% rispetto alla media dei 7 giorni PRIMA, ETA al prossimo livello (media ultimi 7 giorni). A 100% la barra si illumina. Tolta la pioggia di caratteri (canvas): meno batteria e meno rumore.
- Console di Oggi, righe nell'ordine: OGGI, SETTIMANALE, SERIE COMPLETATE, COSTANZA, XP PROSSIMO LEVEL (ultima). Etichette per intero (mai abbreviate), barre da 10 blocchi, nessun testo tagliato (verificato). Ricalcolo al primo accesso di un giorno nuovo (`keepway.oggi_visto` nel telefono, confrontato con la data di oggi; anche se la mezzanotte passa con l'app aperta): lampo verde su tutto il riquadro (`.lampo`), riga luminosa che scende (`.scansione`), alone (`.ricalcolo`), la scritta diventa `./ricalcola --nuovo-giorno` e le barre si ricontano da 0 (il pannello si rimonta con `key={oggi}`). Spento con Animazioni off o riduzione del movimento.
- Il ricalcolo del recap di Oggi (lampo + scansione + barre da 0) parte a OGNI apertura dell'app, non solo al giorno nuovo (`lib/apertura.ts`): conta come apertura il primo caricamento e ogni `visibilitychange` -> visible (app riaperta o riportata in primo piano). Una volta per apertura: cambiando scheda e tornando su Oggi non riparte. Scritta: `./ricalcola --tutto`; normalmente `./status --live`. Sostituisce la regola "una volta al giorno" (`keepway.oggi_visto` non serve più).
- Console di Oggi: colore NEUTRO argento freddo (#cdd6e0) al posto del verde; tolta la riga `keepway@oggi:~$ ...` con `0x01` sopra "LV.1 VEDERE". Sequenza a ogni apertura: la riga luminosa (`.scansione`, anima `top` da -26px a 100% e svanisce: prima restava ferma a metà perché usava translateY parziale e `forwards`) attraversa tutto il riquadro in ~1 s mentre le barre si ricontano (900 ms); a conti finiti (~1,1 s) il lampo bianco (`.lampo`) e l'alone (`.ricalcolo`). Il lampo non c'è più all'inizio.
- Nota di sviluppo: dopo aver cambiato `globals.css` fare `rm -rf .next out` prima di `npm run build` nei test locali (la cache può servire il CSS vecchio); su Cloudflare la build parte sempre da zero.
- Suono di apertura ("calcolo", `effetti.ts`): ~1 s di bip elettronici (onda quadra) sempre più fitti con un ronzio che sale, poi a 1,1 s un "ding" di approvazione (E7 con armonici, ~1,1 s) in sincronia col lampo del recap. Parte con l'animazione (una volta per apertura, rispetta l'opzione Suoni) tramite `suonoApertura()`.
- LIMITE iOS/Chrome: l'audio non parte senza un tocco dell'utente. `suonoApertura` prova a riattivare l'audio e aspetta al massimo 250 ms; se non parte, silenzio (mai suono "in ritardo" al primo tocco). Sul telefono funziona quando l'app viene riportata in primo piano dopo essere già stata toccata in quella sessione, non sempre al primo caricamento a freddo. Verificato: audio bloccato -> 0 note e nessun errore.
- DOPAMINA (tutto in Oggi): 
  - Reazione dal vivo: la riga della console che cambia lampeggia (`.riga-flash`, oro a 100%); XP con contachilometri (`Odometro`); riga di log delle ultime 2 task (`[HH:MM] titolo OK +Nxp`); colore che si scalda dall'argento al bianco caldo con la giornata.
  - "Quasi ci sei": con >=80% o una sola task mancante (dopo almeno 2 fatte) la riga OGGI pulsa e compare `» manca 1 task per chiudere la giornata`.
  - COMBO: task fatte di fila con meno di 1 ora tra l'una e l'altra; dalla 3ª i punti x1.5 (`Completamento.combo`); popup "COMBO xN" a 3, 5, 7; in console `combo n/3` e `COMBO xN · xp x1.5`.
  - RECORD: più task in un giorno del tuo massimo (almeno 3) -> popup "NUOVO RECORD"; in console `record N task/g`.
  - FORZIERE: completare l'ultima task del giorno lo apre (una volta al giorno): trema, poi si apre con la scritta "ECCELLENTE!!", le monetine e un premio a sorpresa (Bonus 30-60 XP, frase identitaria +30, titolo "Il Costante" +25, JACKPOT 5% +150). `Stato.bonus`, contati in `xpTotali`; "Annulla" della task toglie anche il bonus.
  - BOSS DELLA SETTIMANA: riga BOSS SETTIMANA (corallo), punti vita = task previste lun-dom, ogni task fatta ne toglie uno; a 0 (almeno 3 previste) "BOSS SCONFITTO" +100 XP (una volta a settimana).
  - APERTURA: dopo il ricalcolo (1,6 s) un popup di ~3 s con un commento sulla giornata (`lib/feedback.ts`): toni bene/medio/male con battute ("Sei una pippa! Zero task e già sera.") in base a % fatta, ora, ieri e serie. Al centro dello schermo, si chiude con un tocco, spento con Animazioni off.
- IDEA DA FARE (a mente): punti utili. XP restano (livelli, non si spendono) + MONETE separate (es. 1 ogni 2 XP) da spendere in: negozio di premi reali scelti da Stefano (prezzi in monete), giorno jolly/salvaserie extra, scommessa sulla sfida settimanale (vinci x2 / perdi), cosmetici (colori console, pacchetti suoni, titoli), contenuti sbloccati dai livelli (stagioni: Kit SOS, meditazioni, diario), fondo premio in euro (facoltativo). Partire da: negozio premi + giorno jolly + scommessa. In attesa di 3-5 premi reali con cifra indicativa di sforzo.
- IDEA: video YouTube nell'app (player ufficiale incorporato, `youtube-nocookie.com`); possibile campo "video" sulle task (es. meditazione guidata) e nel Kit SOS. Limiti: serve internet, si ferma a schermo bloccato, possibili pubblicità, alcuni video vietano l'incorporamento.
- Turni: ogni volta che si entra in una scheda si riparte da oggi. Roster: scorre alla riga di oggi (al centro) anche dopo un cambio scheda (prima solo la prima volta); Calendario: mese corrente con oggi selezionato e pagina in cima; Recap: mese corrente e pagina in cima. (`TurniLista`, effetto su pronto/oggi/vista/filtro.)
- Feedback all'apertura (rifatto): il giudizio dipende da quanto hai fatto RISPETTO a quanto tempo libero di oggi è già passato (`trascorsoLibero`: finestre libere tra turni e sonno), non dall'orologio. Con zero task: inizio giornata -> incoraggiamento ("Si parte! Hai tutta la giornata davanti"); lunedì -> "Nuova settimana: il boss è a vita piena" (precedenza su tutto, anche se sei in turno); metà giornata -> "c'è tempo"; ultimi 30% -> "il tempo stringe" ; in turno/a dormire -> "adesso sei impegnato". A giornata finita (tempo libero passato al 90%+) con zero task: "Malissimo! Zero task e la giornata è finita." (niente più "pippa"). Nel tratto 70-90%: "Ancora nessuna task! Ne facciamo una adesso?". Con task fatte: ritmo = % fatta - tempo passato (in anticipo / in linea / indietro). Giornata piena (nessun tempo libero) o libera da task -> messaggi neutri.

- Quando tutte le task del giorno sono fatte, la console "dopamina" diventa tutta verde (boss compreso) e compare "✅ Hai completato tutte le task!".

- "Momento giusto" su una sola riga e modificabile: tocchi l'etichetta, scegli inizio e fine per oggi (Ok) o torni ad "auto". Lo stesso orario guida i promemoria.

- Tolto il suono del "computer che calcola" all'apertura (su iPhone non partiva senza un tocco). L'animazione resta.

- Momento giusto per task (lib/momento.ts, regole in lib/sonno.ts):
  - Meditazione: mattina (primo momento libero 08–12) se non c'è il turno 2; con turno 2 la sera (dalle 18); con 2 + notte, subito dopo il turno e prima del riposino (circa 13:30–14:30).
  - Lettura: se lavori, 30 min dopo l'inizio del turno fino a 2 ore dopo (turno 3: 13:30–15:00, turno 4: 19:30–21:00, turno 2: 07:30–09:00, turno 1: 01:30–03:00); nei giorni liberi la sera.
  - Il promemoria parte all'inizio del momento giusto (durante il turno le notifiche restano silenziate). Si può sempre cambiare a mano per il giorno.
- Il promemoria della lettura arriva anche durante il turno (si silenzia solo nel sonno).

- Popup: forziere chiuso "COMPLETATO!" (poi "ECCELLENTE!!"); combo "N Task completate!".

- Box di avanzamento in Oggi: tre anelli concentrici come l'Apple Watch (rosso = oggi, verde = settimana, azzurro = livello), con animazione di riempimento a ogni apertura e punta tonda. Al centro "fatte/totale", a giornata completata una spunta. Sotto: Boss e Serie come due riquadri; la console con barre, log, combo e record è dietro "Dettagli".

- Box di Oggi reso compatto (circa -30%): anelli più sottili con il numero "fatte/totale" grande al centro, e accanto sei indicatori in due colonne con barretta (Oggi, Settimana, Livello | Boss, Serie, Costanza). Tolta la parte "terminale" (log, combo, record, XP al giorno, ETA). Il "Momento giusto" della task ha ora una riga tutta sua (prima spingeva fuori il badge XP).

- Completando una task: lampo subito nel riquadro degli anelli e messaggio dei punti (+XP, combo, colpo di fortuna, frase) al centro del riquadro per circa 2,5 secondi, senza il tasto Annulla (resta "Annulla" sulla scheda della task). Il vecchio messaggio in alto è stato tolto; resta solo il banner del nuovo livello.

- Livelli più lenti, circa uno a settimana: soglie XP 0 / 500 / 1200 / 2100 / 3200 / 4500 (prima 0 / 150 / 400 / 800 / 1400 / 2200). Con circa 110 XP al giorno a task completate e un 60-70% reale si sale di livello ogni 7-10 giorni.

- Task completata: niente coriandoli (restano per livello nuovo e boss). L'anello avanza e trema, con 16 scintille nei colori degli anelli e un suono da slot machine (rulli, tre colpi, vincita). Il messaggio dei punti compare un secondo dopo, così non copre gli anelli.

- Task completata: suono a scala in salita (do maggiore, due ottave, sempre più veloce e forte, accordo finale con campanella) e 44 scintille di tre dimensioni (prima 16).

- Combo e altri popup di festa: prima l'animazione degli anelli (1,5 s), poi il popup. Per la combo: 'N Task completate!' con la fanfara di vittoria e, a fine popup, una leggera fiammata su tutto il riquadro di avanzamento. Con un popup di festa in coda il messaggio '+XP' nel riquadro non compare (per non sovrapporsi).

- Combo: il popup compare nel box di avanzamento (stesso stile del messaggio dei punti), dura 2,4 s con la fanfara una sola volta; poi la fiammata. Se il box non c'è sullo schermo resta il popup a tutto schermo. Corretto il difetto per cui l'effetto ripartiva a ogni aggiornamento dello stato, facendo ripetere la fanfara e raddoppiando la durata (stesso rischio per forziere, record, boss).

- Combo: popup nel box con la grafica di prima (fulmine, titolo azzurro, scheda con bordo e alone), testo solo "Stai andando a razzo!" (tolto "Punti x1.5"). A fine popup un flash oro su tutto il riquadro (al posto della fiammata).

- Il flash oro parte 0,3 s prima della chiusura del popup combo, così il picco cade proprio mentre il popup sparisce (misurato: flash visibile da 3,69 s, popup sparito a 3,96 s).

- Calendario Apple: provato e tolto. Un indirizzo /api/ics in Safari si bloccava su iPhone; il file .ics nel foglio di condivisione non offre «Calendario». Per ora gli appuntamenti stanno nel calendario di Keepway (tab Calendario dei Turni, «In arrivo» e Oggi). Idee per dopo: calendario in abbonamento (webcal, richiede i dati sul server) oppure un Comando Rapido.

- Oggi come planner: le task sono righe compatte (icona, titolo, momento consigliato, durata, fascia, XP) ordinate per orario consigliato; toccandole si apre la scheda intera (con timer, Fatta, Più tardi, Salta). Dopo "Fatta" la riga si richiude. Sezione ora "Il piano di oggi".
- Il commento all'apertura ("Si parte! Hai tutta la giornata davanti") è ora dentro il box di avanzamento e compare solo nella scheda Oggi (prima era un popup globale su tutte le schede).
- Timer in alto a destra del box, vicino agli XP: quanto manca alla fine della giornata utile = fine dell'ultimo momento libero di oggi (tra turni e sonno, entro le 22:30). Sotto 1 ora diventa corallo; a fine giornata dice "finita".

- Icone per tipo di task (AreaIcona.tsx, iconaTask): scelta a mano > riconosciuta dal nome (libro per lettura, fiore per meditazione, posate per piatti, scintille per pulizia/stanza, lavatrice, cucina, spesa, acqua, respiro, diario, corsa...) > icona dell'area. Vale per le task esistenti senza dover cambiare i dati. Lo yoga ora usa la figura in piedi (il fiore è della meditazione).

- Timeline unica in Oggi (componente Timeline.tsx): turni, sonno, appuntamenti e task sugli orari consigliati in un'unica linea del tempo, con "adesso" che scorre; le task senza momento consigliato stanno sotto in «Quando vuoi». Si cambia vista con l'interruttore Lista | Timeline accanto al titolo (impostazione vistaOggi, ricordata; predefinita: timeline). La vista Lista è rimasta identica a prima, quindi si può sempre tornare indietro.

- Oggi: tre viste (interruttore Lista | Compatta | Estesa, ricordata; predefinita Compatta). Compatta = «Giornata in breve» (turno e orario, sveglia, a letto, tempo libero, n. task e impegni, «Dopo: …» con la prossima cosa, Espandi) + appuntamenti + «Prossime» (3 task, «Mostra tutte»). Estesa = la stessa scheda (Comprimi) + timeline con il passato raccolto in «Già passato (n)». Lista = quella di prima.
- Striscia dei prossimi 7 giorni in cima (puntino del colore del turno): un giorno futuro mostra la sua «Giornata in breve» e cosa è previsto (appuntamenti e task con il momento consigliato), solo da guardare.
- Da fare (concordato, non ancora fatto): pianificazione automatica delle task ("3 volte a settimana") con le regole per palestra/corsa (solo notte: dal tardo pomeriggio; 1+4: mai; 2+3: la sera; 3+4: la mattina solo con sonno sufficiente), scheda lavatrice con scelte dell'utente e promemoria "Stendi il bucato" 4 ore dopo «Fatto» (arriva anche in turno, non quando dormi: non disturbare), «proponi automaticamente» per gli appuntamenti, vista settimanale.

- Viste di Oggi ridotte a due, su richiesta: Compatta (= la vecchia Lista, rinominata) ed Estesa (timeline). Tolta la vista con il riassunto. In entrambe, in cima, un blocco con solo il turno e il suo orario (o «Riposo»); niente sveglia, tempo libero, ora di andare a letto. Poi gli impegni. Nella timeline estesa niente colonna degli orari: le schede sono a tutta larghezza e l'orario è una targhetta sopra, a cavallo del bordo; tolti turni e sonno dalla timeline (il turno sta già nel blocco in cima). Il vecchio valore «lista»/«compatta» salvato vale Compatta, «timeline» vale Estesa.

- Pianificazione automatica degli allenamenti (lib/allenamento.ts, lib/pianoAuto.ts, app/task/PianoSettimana.tsx): una task può essere «N volte a settimana» con «Decide l'app» (ricorrenza tipo "auto"). Il pianificatore sceglie giorno e ora per questa settimana e la prossima, e si ricalcola a ogni cambiamento (turno, appuntamento, task fatta o saltata, cambio giorno).
  - Regole: giorno libero = mattina (qualità massima); solo notte (1) = dal tardo pomeriggio (dalle 17); 1+4 = mai; 2+3 = la sera (dalle 19:30); 3+4 = mattina (8–12:30) solo se il sonno prima è di almeno 7 ore; solo turno 2 = dal pomeriggio (dalle 15); solo turno 3 = mattina; solo turno 4 = mattina o primo pomeriggio (fino alle 17); malattia = mai. Il momento è il primo libero abbastanza lungo (durata + andata e ritorno) tra turni, sonno e appuntamenti (con il loro viaggio).
  - Distanza: si preferiscono giorni non adiacenti ad altri allenamenti e i giorni di qualità più alta. Un allenamento passato e non fatto non conta: il pianificatore lo recupera nei giorni rimasti.
  - Modifiche a mano (voci "fissato"/"escluso" nel piano): in «Modifica allenamento» ogni giorno si accende (lo fissi) o si spegne (l'app non lo propone più); «Rifai la proposta da zero» le dimentica. «Salta oggi» conta come giorno escluso. Il momento proposto si può cambiare a mano nella task, come per le altre.
  - Un giorno in piano compare in Oggi anche se è una giornata «pesante» (il piano ha già deciso). Le task già salvate con giorni fissi restano com'erano; si può passare ad automatica modificandole.
- Ancora da fare: scheda lavatrice con «Stendi il bucato» dopo 4 ore; «proponi automaticamente» per gli appuntamenti; vista settimanale.

- Ogni domenica dalle 18, se c'è almeno un allenamento automatico, in «Must before sleep» compare «Programmazione Allenamenti Settimanali»: toccandola si va in Task, alla sezione Allenamento (/task/#allenamento), e per quella domenica sparisce (si ricorda in localStorage). La pagina Task ora scorre alla sezione indicata dall'indirizzo con #.

- «Programmazione Allenamenti Settimanali» è ora una vera task (id programmazione-allenamenti): la crea l'app da sola quando c'è almeno un allenamento automatico e la toglie quando non ce ne sono; ogni domenica, fascia sera (quindi in «Must before sleep»), vale 20 XP, e nella scheda ha il tasto «Apri» che porta a /task/#allenamento. Non compare nell'elenco di Task.
- Lavatrice (FormLavatrice.tsx, riquadro «Lavatrice» in Task): l'utente sceglie nome, frequenza (decide l'app, N volte a settimana, oppure i giorni), dopo quante ore ricordarsi (1–6, predefinito 4), nome e testo della nuova task (predefiniti «Stendi il bucato» / «Ricordati di stendere il bucato») e i punti. Campo `seguito` nella task: premendo «Fatto» si crea una task di un giorno (seguitoDi/seguitoDa/visibileDa/notificaTesto) che compare solo dopo N ore, con il suo momento nella timeline e una notifica a quell'istante (anche in turno, urgente; se dormi slitta al risveglio). «Annulla» il completamento toglie anche il seguito. I seguiti di ieri e prima si ripuliscono. Pianificazione automatica della lavatrice: giorni dove, a fine ciclo, sei sveglio e libero (si cerca la partenza più presta per cui il seguito cade in un momento libero); mai 1+4 e malattia; avviso all'inizio del momento.

- Nuova icona dell'app (compasso e strada, dal disegno dell'utente): ritagliata a quadrato e salvata in public/icons (180 per iPhone, 192 e 512 per il manifest, 1024). Per vederla sul telefono bisogna togliere Keepway dalla Home e aggiungerla di nuovo.

- Commenti all'apertura: corretto il caso «sei al lavoro» detto a chi era appena sveglio o ancora nel sonno previsto. Ora si distingue (situazioneAdesso in lib/sonno.ts): in turno = messaggi sul lavoro; mezz'ora prima del turno = «tra poco inizi il turno»; nel sonno previsto = «Buongiorno! Parti con calma»; altrimenti i messaggi sul ritmo della giornata.

- Suono «incasso» (straordinario e cambio turno pagato): non più la cassa «CHA-CHING» ma monete: una cascata di 10 tintinnii metallici sempre più fitti (note inarmoniche acute con un clic di metallo), poi il «ding» di moneta presa a due note e un ultimo tintinnio. Circa 1,3 s.

- Suono «incasso» (turni pagati): ora è la registrazione 'Cha-Ching' dell'utente (public/sounds/incasso.mp3: tagliata la parte muta iniziale, mono, 2,3 s, dissolvenza finale). Si carica al primo tocco e si riproduce dal contesto audio; se non è pronta o non si carica resta il tintinnio di monete sintetizzato. Altri suoni registrati si aggiungono in CAMPIONI (lib/effetti.ts). Nota: se un giorno l'app sarà per altri utenti, controllare i diritti del file.

- Straordinario con turno aggiunto (es. 2 + 3): il blocco mostra il turno originale com'era (es. 2, 07:00–13:00, in blu), sotto in viola con testo bianco l'orario aggiunto (13:00–19:00) e sotto la striscia viola «ORE DI STRAORDINARIO». Vale nel roster, nel dettaglio del calendario mese e nel blocco del turno in Oggi. Dato nuovo: GiornoEffettivo.straordinario (turno originale, orario originale, extra, orario extra).

- Straordinario, versione corretta: niente più blocco viola per il turno aggiunto. Il giorno ha un solo blocco (colore normale): etichetta (es. 2+3), poi gli orari dei turni uno sotto l'altro nell'ordine del tempo e consecutivi (07:00–13:00, 13:00–19:00; se hai il 3 e ti chiedono il 2, prima il 2), senza differenze di stile, poi l'unità (112323 - Operativi) e sotto la sola striscia viola «ORE DI STRAORDINARIO». Vale in roster, dettaglio calendario e blocco turno in Oggi.

- Annullare una modifica ai turni chiede sempre conferma (lib/annulla.ts) in tutti e tre i punti: avviso «Annulla» dopo la modifica, menu del giorno e scheda Recap. Se si conferma, suona la scala discendente («scalaGiu» in effetti.ts: do6 -> do4, rallenta e cala di volume, nota bassa finale); se si rifiuta non succede niente. Il suono basso «indietro» di quei pulsanti è stato tolto per non sovrapporsi.

- Tema chiaro e scuro: impostazione `tema` (predefinito scuro). Interruttore con luna (tema scuro) / sole (tema chiaro) in alto a destra in Oggi e scelta «Tema» in Impostazioni. I colori sono variabili (--background, --foreground, --card, --muted, --accent e --ov per le velature: i vecchi `bg-white/10` ecc. sono diventati `bg-ov/10`); nel tema chiaro i testi pastello (verde, rosso, azzurro, ambra, viola) diventano più scuri. La scheda «box ricompensa» (console nera) resta nera in entrambi i temi. Il tema si applica prima del primo disegno (script in <head>, chiave keepway-tema) e aggiorna theme-color. Nel tema chiaro la fascia sotto l'orologio dell'iPhone resta scura, perché lo stile della barra di stato non si può cambiare dall'app.
- In Oggi il box ricompensa (anelli) sta sopra la striscia dei giorni (Oggi, Sab, Dom...) e resta lì anche guardando un altro giorno. Non c'è nel Calendario dei Turni (un'interpretazione sbagliata, tolta).

- Straordinario: su un turno ordinario si può aggiungere UN solo turno (si sceglie tra quelli che formano un doppio consentito; scegliere un altro sostituisce la scelta). In un giorno di riposo si possono aggiungere fino a DUE turni, che insieme devono formare un doppio consentito (2+3, 3+4, 1+4): dopo il primo, un secondo incompatibile sostituisce il primo. Prima non c'era limite al numero di turni scelti.

- Notifica «Ora di andare a letto» (lib/piano.ts, notificheSonno): arriva all'orario consigliato per dormire; se il consiglio è dopo la mezzanotte (es. «entro le 01:30») arriva alle 23:59 della sera prima (ultimo orario utile). Testo: «Vai a letto entro le 00:30: sveglia alle 09:30, circa 9 ore di sonno.» Prima di un riposino: «Ora del riposino» all'ora d'inizio. Niente notifica per il sonno del mattino dopo la notte, né se a quell'ora sei in turno o già a dormire. Urgente (arriva anche con il telefono in non disturbare di Keepway... resta comunque soggetta alle regole di iOS).
- Prima del turno 3 si dorme volentieri 9 ore: orario di andata a letto consigliato al massimo 00:30 (sveglia 9:30), non più 01:30. Resta 8 ore per gli altri turni; se il turno prima finisce tardi vale comunque il limite di 90 minuti dopo il turno.
- Straordinario: i chip dei turni possibili sono tutti cliccabili, ma su un turno ordinario sono alternativi (sceglierne un altro sostituisce il primo). Es. turno 3: il 2 e il 4 sono cliccabili, ma il risultato è 2+3 oppure 3+4, mai 2+3+4.

- Orario consigliato per andare a letto: prima dei turni 3 e 4 (sveglia 9:30, si dorme volentieri 9 ore) sempre al massimo alle 00:30, così si va a letto presto; prima del turno 2 (sveglia 6:00) resta 22:00. Se il turno precedente finisce tardi vale il limite di 90 minuti dopo il turno.
- Notifica «ora di andare a letto» dopo il turno 4: se alle 23:59 sei ancora in turno (il 4 finisce all'1:00, a letto alle 2:30), la notifica arriva mezz'ora prima di andare a letto, cioè alle 2:00. Negli altri casi: orario consigliato o, se dopo la mezzanotte, alle 23:59 della sera prima.

- Movimento in stile Apple (globals.css, «Movimento in stile Apple»): tre curve — «molla» (entra e rimbalza appena), «posa» (parte veloce e si ferma piano, come iOS), «fuga» (le uscite) — con entrate di 0,4–0,5 s e uscite di 0,25–0,35 s.
  - Uscite animate: `Presenza.tsx` tiene un elemento montato il tempo di animare l'uscita (`<Presenza dato={…}>{(dato, uscendo) => …}</Presenza>`). Lo usano: schermi a tutta pagina (moduli, menu dei turni: salgono dal basso e scendono), timer, popup di festa (velo + scheda che esce rimpicciolendosi e sfocandosi), avviso «Annulla», recap dei turni, banner del nuovo livello. I messaggi dentro il box (punti, combo, commento di apertura) escono con scala e sfocatura.
  - Cambi di schermata: dissolvenza e piccola salita (`TransizionePagina`), barretta gialla della barra in basso che scivola con una molla, selettori a segmenti con la pillola che scivola (`Segmentato`: tab dei Turni, Compatta/Estesa, tema, «Decide l'app / Scelgo i giorni»), dissolvenza tra le viste (Roster/Calendario/Recap, cambio giorno e mese, passaggi nel menu dei turni).
  - Dettagli: ogni pulsante si schiaccia un po' sotto il dito e torna con una molla; interruttori come quelli di iOS (`Interruttore.tsx`); chip che «saltano» quando si accendono; titolo della task barrato con un tratto che scorre; check che salta quando completi; scheda della task che si apre con una molla; icona e titolo del forziere che cambiano con un salto; punti che entrano ingranditi; barra del livello che cresce da sinistra; elenchi che entrano uno dopo l'altro (`.stagger`); righe che scivolano nella nuova posizione quando una task fatta scende in fondo (`ListaFlip`, anche per la linea «adesso» della timeline).
  - Regola importante: le animazioni di entrata non devono lasciare un `transform` «in corso» (si usa il fill-mode `backwards`, non `both`), altrimenti i figli con `position: fixed` (gli schermi dei moduli) si posizionano rispetto a quell'elemento e non allo schermo.
  - Con «Animazioni e coriandoli» spento (data-animazioni="off") o con «riduci movimento» di iOS tutto il movimento diventa istantaneo.

- Commento di apertura nel box: resta pienamente visibile per circa 4 secondi (prima sfumava troppo presto con la curva di uscita e si leggeva male) e svanisce solo negli ultimi istanti con una curva che parte piano. Stessa correzione per il messaggio dei punti e per la combo.

- Salute (sonno e passi) dall'iPhone/Apple Watch, senza app nativa: un Comando Rapido (creato dall'utente, istruzioni in Impostazioni → Salute) legge l'app Salute e chiama `GET /api/salute/invia?t=CODICE&passi=…&sonno=…&letto=…&sveglia=…` (anche POST JSON). Il Worker (D1, tabella `salute`) salva un record per giorno e unisce i campi (un invio con solo i passi non cancella il sonno); numeri all'italiana ("8.421", "6,7") accettati; il sonno può arrivare in ore, minuti o secondi (si riconosce dal valore); il giorno predefinito è oggi a Roma. Il codice personale (32 caratteri casuali) lo genera il telefono; sul server si salva solo la sua impronta SHA-256. `GET /api/salute?t=…&giorni=N` restituisce i dati, `POST /api/salute/cancella?t=…` li cancella; si tengono circa 400 giorni. «Nuovo codice» e «Cancella i miei dati» in Impostazioni.
  - Nell'app: scheda «Salute» in Progressi (passi con linea dell'obiettivo 8000, sonno con linea delle 7 ore, ultimi 7 giorni) e riga «Stanotte hai dormito…» nel riquadro del sonno in Oggi (hook useSalute: si scarica all'apertura e ogni 10 minuti, con copia offline).
  - Non provato su un iPhone vero (il sandbox non ha Salute né Comandi Rapidi): il server è provato con un database SQLite vero, la parte nell'app con dati finti. I nomi delle azioni dei Comandi Rapidi nelle istruzioni vanno verificati sul telefono.
  - Idee per dopo: spuntare da sola la task Corsa/Palestra quando arriva un allenamento; consigli di sonno tarati sui dati veri; passi/corsa come sfida settimanale.

- Momenti suggeriti che si spostano nella giornata (lib/momento.ts, momentoAttuale): per oggi il «momento giusto» di una task si aggiorna all'ora che è. Finché il momento suggerito basta ancora per farla (durata, più il viaggio per gli allenamenti) resta com'è; quando passa e la task non è fatta si cerca il prossimo momento libero della giornata (tra turni, sonno e appuntamenti, entro le 22:30; per gli allenamenti e la lavatrice rispettando le loro regole) e si suggerisce quello, con «spostato» accanto all'orario e «Nuovo momento» nel dettaglio. Se non c'è più posto: «nessun momento libero oggi». Un orario scelto a mano non si sposta mai. Vale per Oggi (righe, ordine, timeline) e per le notifiche (il promemoria segue il nuovo momento). Esempio col turno 3: Lettura 13:30–15:00; alle 15:00 passa a 19:00–21:00.

- Lettura e meditazione (e le task con quelle parole nel nome) sono «tranquille»: si possono fare anche subito prima di andare a letto. Quando il loro momento suggerito passa, il nuovo momento si cerca fino all'ora in cui vai a letto (anche dopo la mezzanotte, es. 22:45–00:30 se il consiglio è 00:30), non solo fino alle 22:30; l'etichetta dice «prima di dormire». Allenamenti, lavatrice e le altre task restano entro le 22:30 e con le loro regole (un allenamento non si propone prima di dormire).

- Prima del turno 2 (sveglia alle 6:00) l'orario consigliato per andare a letto è 23:00 (7 ore di sonno), non più 22:00. La notifica «ora di andare a letto» arriva alle 23:00. Per i turni 3 e 4 resta 00:30; per gli altri 8 ore.

- Oggi: il blocco del turno è un link che apre la sezione Turni (con una freccia a destra).
- «Nuova task»/«Modifica task» ha la quarta scelta «Pianificazione automatica» (N volte a settimana, da 1 a 6): per le task che non sono allenamenti la pianifica `analizzaGenerica` (lib/allenamento.ts): niente nei giorni pesanti (notte + sera: nessuna; dopo la notte o doppio turno: solo se la task è «essenziale»), nella fascia scelta (mattina fino alle 13, pomeriggio 13–19, prima di dormire dalle 18 fino a quando vai a letto per le cose tranquille, altrimenti qualsiasi tra le 8 e le 22:30), nel primo momento libero abbastanza lungo tra turni, sonno e appuntamenti; giorni di riposo con qualità più alta; giorni distanziati. Anteprima del piano nel modulo e modifica dei singoli giorni come per gli allenamenti. La task «Programmazione Allenamenti Settimanali» di domenica si crea solo per gli allenamenti automatici.
- Il testo «Decide l'app» è diventato «Pianificazione automatica» in tutti i moduli (allenamento, lavatrice, task).

- Pianificazione automatica con popup (PopupPianificazione.tsx, usePianifica.tsx, lib/allenamento.ts «proposte»): in un nuovo allenamento, lavatrice o task con «Pianificazione automatica» il tasto è «Pianifica» e al posto dell'anteprima c'è un popup: 1,5 secondi di «Pianifico…» (anelli che girano, barra che si riempie, righe che luccicano), un lampo dorato, poi il riassunto dei prossimi 7 giorni («Martedì 8 · 09:00 … Giovedì 10 · 09:30 … Sabato 12 · 18:00»). Ci sono sempre 2–3 proposte diverse (la migliore; le altre tolgono uno dei suoi giorni), da scorrere di lato con i pallini sotto. «Pianifica» salva la task; se la proposta scelta non è la prima, quei giorni vengono fissati. Quando le hai viste tutte compare «Pianificazione manuale», che riporta a «Scelgo i giorni». Per le task già esistenti il piano resta modificabile giorno per giorno e c'è «Nuova pianificazione» che riapre il popup.
- Correzione: l'animazione di entrata degli schermi dei moduli non deve lasciare un transform attivo (fill-mode backwards), altrimenti i popup «fixed» aperti dentro un modulo si posizionano rispetto al modulo e non allo schermo.

- Popup di pianificazione: lampo bianco; animazione «Pianifico…» nei colori degli anelli (rosso, verde, azzurro; barra con gradiente); «Pianificazione manuale» compare molto piano (opacità, sfocatura che si toglie e altezza che cresce da zero, 0,8–0,9 s) e la scheda si allarga con dolcezza.
- Ricorrenza «ogni N giorni» (tipo `intervallo`: ogni N giorni, tolleranza 0/1/2): scelta in Nuova task → Pianificazione automatica → «Ogni N giorni» (2, 3, 4, 5, 7, 10, 14, 21, 30). I giorni si contano dall'ULTIMA volta che l'hai fatta (se la fai prima o dopo, il conto riparte da lì), quindi il giardino cade sempre a 7 giorni esatti e la barba ogni 3 (±1). Il pianificatore (lib/allenamento.ts) costruisce la catena dei prossimi 28 giorni: per ogni scadenza sceglie il giorno più vicino a quello esatto tra i possibili (turni, sonno, appuntamenti, giorni pesanti); se nella finestra non ce n'è uno prende il primo possibile subito dopo. Le proposte del popup variano il giorno di partenza e mostrano le prime 4 date. «Volte a settimana» resta com'era (conta le settimane di calendario).

- «Ogni N giorni»: la tolleranza vale solo in avanti (mai prima di N giorni dall'ultima volta; al massimo N + tolleranza): «+1 giorno» con N = 3 significa da 3 a 4 giorni dopo, quindi dopo il sabato non propone mai il lunedì (prima ±1 ammetteva anche N-1). Il conteggio prosegue sulle settimane successive (catena di 28 giorni), non è legato alle settimane di calendario. «Volte a settimana» invece garantisce solo una distanza minima di 2 giorni tra una volta e l'altra.

- Nuova task / Modifica task riordinata (app/task/FormTask.tsx, ui.tsx: `Gruppo` e `RigaSelect`): tolta la scorciatoia «Una stanza in un giorno preciso»; «Quanto dura», «Versione minima», «Quanti XP vale» e «Spostamento» sono righe ordinate (etichetta a sinistra, menu a tendina a destra: su iPhone si apre la rotellina); «Ogni N giorni», «Quanto può slittare» e «Quante volte» sono menu a tendina; tolta la sezione «In che momento» (la fascia non si chiede più: la task nuova è «quando sei libero», quelle esistenti la mantengono) e i «Promemoria» a mano (l'avviso è automatico; quelli già salvati restano). «Adatta ai turni e agli impegni» è sempre attivo e mostrato come riga informativa. «Si fa solo a casa» si accende da solo con spostamento «Da casa» e si spegne se ti devi spostare (modificabile a mano). Gli altri moduli (allenamento, lavatrice) hanno ancora i vecchi chip.

- Regola unica: nessuna task si suggerisce prima di UN'ORA dopo la sveglia (mezz'ora per la meditazione). La sveglia del giorno (svegliaDelGiorno in lib/sonno.ts) è la prima sveglia calcolata di quel giorno: 6:00 prima del turno 2, 9:30 prima del 3 e del 4, 14:30 dopo la notte, 9:30 nei giorni di riposo (anche se magari ci si sveglia più tardi). Quindi con il turno 3 o il riposo la prima ora utile è 10:30 (10:00 per la meditazione). Vale per tutti i pianificatori (task generiche, lavatrice, allenamenti) e per i momenti suggeriti (finestraMigliore, meditazione, lettura, ricerca del prossimo momento). Se in futuro avremo il sonno vero dall'orologio si potrà usare l'ora reale.
- Popup di pianificazione: ogni riga ha il giorno («Martedì 8») e sotto in verde «Orario suggerito: 10:30–10:45» come in Oggi.
- Nuova task: la spunta di «Adatta ai turni e agli impegni» è a destra e il testo è «Suggerisce il momento libero tra turni, sonno e appuntamenti e ti avvisa»; le aree sono una riga che scorre di lato; nuove aree «Self care» (rosa, doccia, «Sono uno che si prende cura di sé») e «Commissioni» (azzurro, cestino, «Sono uno che sbriga le cose»), aggiunte anche a chi aveva già l'app; l'icona delle Abitudini è il sole che sorge. Parole chiave nell'icona automatica: barba, rasoio, capelli, unghie, denti... → doccia; posta, banca, pacco, farmacia... → cestino.

- Notifiche su iPhone: iOS mostra il titolo in grassetto, poi una riga «from Keepway» aggiunta dal sistema (non eliminabile), poi il testo. La notifica di prova ora ha titolo «Notifica» (prima «Keepway», che si ripeteva). Da decidere: titoli per categoria («Da fare», «Sonno», «Turni»…) per tutte le notifiche.

- Prove sul titolo delle notifiche (Impostazioni → Notifiche, quando sono attive): «Titolo vuoto» (titolo "") e «Titolo invisibile» (carattere braille vuoto U+2800). Il service worker non sostituisce più un titolo vuoto con «Keepway» e, se iOS lo rifiuta, riprova con il carattere invisibile. Esito da vedere sul telefono: la riga «from Keepway» di iOS resta in ogni caso.

- Prova notifiche: con il titolo vuoto iOS riempie con il nome dell'app; con il titolo invisibile (U+2800) viene bene. Il pulsante in Impostazioni → Notifiche ora manda due notifiche di esempio a caso (stanza, meditazione, lettura, bucato, sonno, appuntamento, conflitto turni, allenamento) con titolo invisibile e testo su due righe, per decidere come scrivere quelle vere.

- Tutte le notifiche vere arrivano ora nel nuovo stile (lib/piano.ts, comeArriva): titolo invisibile (U+2800, così non si legge due volte il nome dell'app) e testo su due righe — prima riga «emoji + cosa» (es. «🧹 Sistema il soggiorno»), seconda il dettaglio (es. «15 min · ti va di farlo adesso?»), ognuna tagliata a 44 caratteri con «…» per non sforare. Emoji per tipo: dalle icone delle task (libro 📖, meditazione 🧘, pulizia 🧹, bucato 👕, palestra 💪, doccia 🚿…), 🌙 sonno, 😴 riposino, ⏱️ timer, ⚠️ conflitti, e per gli appuntamenti dall'icona (🩺 🦷 🧠 💼 🚗 📅 🔔). Il pulsante di prova manda due esempi a caso nello stesso stile.

- Schema definitivo delle notifiche: prima riga «→ cosa» (es. «→ Sistema il soggiorno»), seconda riga il dettaglio con l'emoji in fondo (es. «15 min · ti va di farlo adesso? 🧹»). Senza un'icona precisa l'emoji è la lampadina 💡 (non più la spunta). Appuntamenti: «→ Appuntamento Psicologa» / «domani, martedì 5, alle 16:30 📅» (promemoria: «→ Promemoria …» e 🔔); gli altri avvisi: «tra una settimana, sabato 12, alle 16:30», «tra 2 ore, alle 16:30», «oggi, …». Righe tagliate a 44 caratteri con «…».

- Prova del grassetto nelle notifiche: la prima riga degli esempi usa lettere Unicode «in grassetto» (Mathematical Sans-Serif Bold; le accentate = lettera + accento combinato). Il testo di una notifica non ha stili veri: solo il titolo è in grassetto e noi lo teniamo invisibile. Limiti: righe più larghe (si tagliano prima), VoiceOver le legge male, la ricerca non le trova. Da usare su tutte solo se la prova piace.

- Il grassetto Unicode è applicato alla prima riga di tutte le notifiche (inGrassetto in lib/piano.ts; la prima riga si accorcia a 34 caratteri perché le lettere sono più larghe). Le notifiche arrivano anche su Apple Watch. Il pulsante di prova si chiama «Prova con testi veri».

## Salute: allenamenti dall'iPhone e controllo delle 22:30
- Il Comando Rapido può mandare anche gli allenamenti (`allenamento`, `minuti`, `km`, `inizio`): il server li salva (tabella `allenamenti`, una riga per tipo+giorno+ora di inizio, quindi il doppione si fonde) e ricorda l'ultimo invio (`ultimo`).
- Corsa/palestra di oggi → la task corrispondente si completa da sola (la task più lunga se ce ne sono due dello stesso tipo). Corsa: XP = 10 per km (almeno i punti della task). Gli allenamenti già usati si ricordano: se annulli, non si rifà.
- 22:30: notifica «Nessuna attività ricevuta oggi» (solo se almeno una volta è arrivato un dato). Il server la manda solo se oggi non è arrivato niente (colonna `salvo` = impronta del codice). In turno/a dormire slitta di 15 in 15 minuti. Popup nell'app dopo le 22:30 con «Sincronizza» (apre `shortcuts://run-shortcut?name=Keepway Salute`) e «Non ora» (per oggi non ricompare).
- Impostazioni: «Ultima sincronizzazione» + ultimo allenamento + guida riscritta con tre automazioni (fine allenamento, sveglia, orari fissi).
- Non verificabile qui: i nomi esatti delle azioni dei Comandi Rapidi, l'automazione «fine allenamento», l'apertura del Comando dal popup. Il server si aggiorna solo con il deploy Cloudflare.
- Rimandato: sonno reale → giornata più leggera dopo notte corta, debito di sonno, orari di letto personalizzati.

## Notifica «Corsa ricevuta»
- Quando il server riceve un allenamento nuovo di oggi (corsa o palestra), manda una notifica al telefono collegato a quel codice: «→ Corsa ricevuta / km · min» (o «Tocca per segnarla»). Toccandola si apre Keepway, che completa la task.
- Il collegamento codice → telefono (tabella `collega`) lo scrive il piano notifiche che l'app manda già con il codice: serve aver aperto l'app almeno una volta dopo il deploy.
- Un secondo invio dello stesso allenamento non rimanda la notifica.
- Il comando rapido può mandare solo `&allenamento=corsa` (o `palestra`) dall'automazione «Allenamento Apple Watch → Termina»: niente minuti/km, ma la task si segna.

## Date europee
- Le date mostrate come numeri (Impostazioni → Salute) sono sempre `gg/mm/aaaa`; per gli allenamenti e l'ultima sincronizzazione si vede anche l'ora di ricezione («Ricevuto il 01/11/2026 alle 01:15»). Nel resto dell'app le date sono già scritte a parole («lun 2 nov»). Per ogni nuova data mostrata usare `dataEuropea` / `dataOraEuropea` (`lib/date.ts`).

## Da fare (prossima sessione)
- Minuti e km della corsa: provare a leggerli nel Comando Rapido (non c'è il tipo «Workouts» tra i campioni; «Distanza camminata/corsa» include anche le camminate).
- Orari di letto e sveglia dal Comando Rapido (`&letto=` e `&sveglia=`) e uso nel sonno.
- Unire passi e sonno in un solo invio; preparare il comando da condividere con il segnaposto per il codice (Domande di importazione).
- Automazioni: sveglia («Quando mi sveglio») e orari fissi (12:00, 18:00, 22:30). Le due di fine allenamento (corsa, palestra) sono fatte e funzionano.
- Provare un'altra palestra (Rafforzamento muscolare funzionale) e controllare che la task si segni da sola toccando la notifica.
- Sonno reale → giornata più leggera dopo notte corta, debito di sonno, orari di letto personalizzati.
- Idee in sospeso: aprire dalla notifica la task giusta (`/oggi/?apri=…`), numero sull'icona, «proponi automaticamente» per gli appuntamenti, vista settimana, Kit SOS e routine serale, uniformare i form Allenamento/Lavatrice.

## Orari fissi di sincronizzazione
- Le automazioni «Ora del giorno» sono 07:00, 11:00, 15:00 e 19:00 (una per orario), così il sonno arriva presto e si aggiorna. La notifica/popup delle 22:30 resta come rete di sicurezza: scatta solo se in tutta la giornata non è arrivato nulla.

## Sonno: il comando manda i dati grezzi, i conti li fa il server
- Il calcolo delle date dentro il Comando Rapido era fragile (finestre di 24 ore che si sovrappongono, filtri vuoti) e troppo complicato da rifare. Ora il comando manda solo l'elenco grezzo dei «pezzi» di sonno degli ultimi 3 giorni (`&campioni=` con righe `valore;inizio;fine`).
- `worker/sonno.js`: legge le date scritte da Comandi rapidi (`02/11/26, 04:12`, `2 nov 2026 alle 04:12`, ISO), scarta «Awake» e «In bed», fonde i pezzi sovrapposti, unisce i pezzi separati da meno di 90 minuti nella stessa notte, assegna la notte al giorno in cui finisce, tiene gli ultimi 2 giorni e **sovrascrive** sonno, letto e sveglia di quei giorni. Si può rimandare più volte: il risultato è sempre lo stesso.
- Così letto e sveglia arrivano insieme al sonno e sparisce la parte più difficile del comando. Il vecchio `&sonno=` funziona ancora ma non serve più.
- Provato con dati inventati (due notti, un risveglio, una notte fuori finestra) e con il database finto; da provare sull'iPhone.
- Se `&campioni=` arriva ma non contiene righe leggibili, il server risponde «Sonno non leggibile: ricevuti N caratteri…» (così si distingue da «Nessun dato da salvare», che è la risposta del server vecchio).
- Il testo del sonno va nel corpo di una richiesta POST (JSON, chiave `campioni`), non nell'indirizzo: un testo lungo a più righe in un GET viene troncato da Comandi rapidi. Va attivata anche l'opzione iOS che permette di condividere molti elementi di Salute. Nel comando, la prima parola di ogni riga è la proprietà **Valore** del campione (Core/Deep/REM/Awake), mentre «Nome» dà solo «Campione di dati sanitari».
- Provato sull'iPhone: 101 righe → due notti calcolate correttamente (6 h 21 e 3 h 06).

## Popup della mattina al posto delle automazioni
- La prima apertura di Keepway dopo una pausa di almeno 6 ore (una notte) propone «Buongiorno! Sincronizza i dati» con «Sincronizza» e «Non ora», ma solo se gli ultimi dati dall'iPhone hanno più di 4 ore e se almeno una volta era arrivato qualcosa. «Sincronizza» apre il Comando Rapido `Keepway Salute`.
- Come si capisce la pausa: l'app segna l'ultimo momento in cui era in uso (`keepway.presenza`, ogni minuto e quando va in secondo piano).
- Le automazioni a orari fissi (7, 11, 15, 19) e quella di sveglia restano facoltative; la notifica/popup delle 22:30 resta come rete di sicurezza.
- Provato in browser con l'orologio simulato: popup dopo una notte; non compare con pausa breve, dati freschi o mai sincronizzato.

## Progressi, primo blocco
- Pagina Progressi: **riepilogo** (anello del livello che si riempie, XP che salgono, serie, giornate piene, prove fatte), **calendario del mese** (oro = tutte le task fatte, verde = quasi, giallo = qualcosa, puntino rosso = allenamento; si tocca un giorno per il dettaglio; mesi precedenti navigabili), **record personali**, carte **Meditazione** e **Lettura** (serie, ultimi 7 giorni, tempo totale, prossimo traguardo), poi Salute, punti, **traguardi**, archivio.
- **Traguardi** (`lib/traguardi.ts`), 3 livelli ciascuno, pensati per la costanza e non per i clic: settimane di fila con almeno 3 allenamenti (4/8/12), corse in un mese (6/10/14), giornate piene (10/30/60), boss sconfitti (1/3/8), ripartenze dopo 3 giorni fermi (1/3/6), serie di meditazione e di lettura (7/21/66 giorni), tempo totale di meditazione e di lettura. Mai chilometri (non li abbiamo): solo volte.
- Gli allenamenti sono corsa, palestra e le task dell'area Allenamento, tranne la programmazione settimanale.
- Il livello sbloccato di ogni traguardo si salva (`Stato.traguardi`): non si perde annullando una task e il popup di festa (medaglia) compare una volta sola. La prima volta si registra in silenzio ciò che c'è già.
- Provato in browser con 40 giorni di storico inventato; da vedere sull'iPhone. Sonno e Allenamenti (sezioni complete, debito di sonno, power nap) sono nei blocchi 2 e 3.

## Progressi, secondo blocco: Allenamenti
- Sezione «Allenamenti» sotto il calendario: anello **0/3** della settimana (oro e luminoso quando raggiungi o superi 3), i sette giorni con l'allenamento segnato, messaggio su quanti ne servono entro domenica (o «Lunedì si riparte» se non si arriva a 3), barre delle ultime 8 settimane con la riga dell'obiettivo (verde sopra 3), serie di settimane di fila, corse / palestra / minuti in tutto.
- Si contano le task di allenamento completate (corsa, palestra, area Allenamento), sia segnate a mano sia arrivate dall'iPhone, una per task al giorno. Nessun chilometro.

## Progressi, terzo blocco: Sonno e Disciplina
- **Sonno** (sezione nei Progressi): debito di sonno (grande, verde/giallo/rosso) con obiettivo a notte regolabile (6–9 ore, predefinito 7); 14 notti a barre (blu sopra l'obiettivo, giallo 6 h o più, rosso sotto le 6 h) con la riga dell'obiettivo; toccando una barra si vedono letto e sveglia; media, migliore, più corta; regolarità di letto e sveglia sulle ultime 7 notti (± minuti).
- **Debito di sonno** (`lib/sonnoProgressi.ts`): ogni notte sotto l'obiettivo aggiunge i minuti mancanti; ogni notte sopra li toglie solo a metà; mai sotto zero. Le notti senza dato non contano.
- **Disciplina** (`lib/disciplina.ts`, in cima ai Progressi): punteggio 0–100, media pesata di Sonno (5), Allenamento (4), Ordine in casa (3), Lettura (2), Meditazione (1) — l'ordine scelto da Stefano. Sonno: notti degli ultimi 14 giorni rispetto all'obiettivo (servono almeno 3 notti). Allenamento: media degli ultimi 28 giorni rispetto a 3 a settimana. Ordine/Lettura/Meditazione: task fatte su quelle previste negli ultimi 14 giorni. Le voci senza dati escono dal calcolo e i pesi si ridistribuiscono. Mostra il confronto con le due settimane prima e la voce che farebbe salire di più il punteggio. Livelli: Da costruire (<40), In crescita, Solida (60), Forte (75), Di ferro (90).
- Il server tiene tutte le notti dell'invio tranne il primo giorno (potrebbe essere tagliato): un invio di 30 giorni recupera lo storico.
- Ordine delle sezioni: Disciplina, riepilogo, Sonno, Allenamenti, Calma e mente (lettura, meditazione), calendario (da rendere più piccolo), record, passi, traguardi.

## Power nap
- Sulla pagina Oggi compare «Notte corta» se stanotte hai dormito meno di 6 ore, oppure se il debito di sonno supera 4 ore e la notte è sotto l'obiettivo. Non compare dopo le 15:30, né nei giorni con la notte di lavoro (il sonno del giorno è già nel piano), né se non c'è un momento libero adatto.
- Durata 20 / 30 / 45 minuti (30 consigliato: oltre 45 si rischia di svegliarsi intontiti). Il momento: prima scelta alle 14:00, poi dalle 13:30 alle 15:00, dentro una finestra libera tra turni, appuntamenti e sonno, e comunque almeno 6 ore prima di andare a letto.
- «Pianifica» crea una task di oggi «Power nap» (area Self care, 15 punti, icona luna) con il suo momento e il promemoria. «Non oggi» la nasconde per il resto della giornata.
- Provato in browser con l'orologio simulato (notte corta, notte normale, pomeriggio tardi).

## Progressi: nuovo ordine e grafici in stile app di allenamento
- Ordine: Livello e XP (come prima), Allenamenti, Sonno, Disciplina, Calma e mente (lettura, poi meditazione), calendario (più piccolo, da rivedere), record, passi, traguardi, archivio.
- Grafici (`GraficoLinea`, `TessereKpi`): linea luminosa con i punti, griglia tratteggiata, riga dell'obiettivo, variazione in alto a destra, linea che si disegna all'apertura; sotto, tessere con numeri grandi. Allenamenti: allenamenti per settimana (8 settimane concluse; variazione = ultime 4 contro le 4 prima). Sonno: ore per notte (14 notti) con la riga dell'obiettivo. Disciplina: andamento dell'indice nelle ultime 8 settimane dentro la sua scheda.
- Disciplina: resta una scheda con il punteggio e le cinque barre (sonno, allenamento, ordine, lettura, meditazione), ora sotto Allenamenti e Sonno e con il grafico dell'andamento.

## Progressi: stile «Garmin», tendine e Disciplina compatta
- **Livello**: mostrina con il grado (scudo), sei tacche dei gradi, XP che salgono, chip «+N XP oggi», XP al giorno, barra con il riflesso e percentuale, giorni stimati al prossimo grado, XP degli ultimi 7 giorni a mini-barre; la barra pulsa quando manca poco (oltre l'85%).
- **Sonno**: ordine grafico → tessere → debito di sonno → regolarità. Le spiegazioni sono in «Approfondisci» (tendina chiusa, `Approfondisci.tsx`).
- **Tessere** più piccole (valore da 20 px).
- **Disciplina**: a sinistra le cinque voci con le barre, a destra il quadrante ad arco (270°, fasce di colore rosso/giallo/lime/verde/oro) con il punteggio e il livello, sotto il grafico dell'andamento e una frase del giorno (`fraseDisciplina`: tono diretto, scelta in base alla fascia e fissa per la giornata). I dettagli del calcolo stanno in «Approfondisci».
- Il carattere resta quello attuale (niente Barlow).

## Sonno: minuti scritti e debito come promemoria
- Tutti i valori del sonno hanno i minuti scritti («6 h 19 min»): grafico, tessere, debito, riga dell'obiettivo.
- Il debito di sonno è un promemoria piccolo (una riga con barra sottile e l'obiettivo regolabile), subito sotto il grafico e prima delle tessere. La spiegazione è nell'«Approfondisci».

## Correzione: il debito di sonno non sale più aggiungendo sonno
- Oggi (giornata ancora in corso) può solo ridurre il debito, mai aumentarlo: un dato parziale (per esempio 3 ore del mattino, prima del riposino) non genera deficit finché la giornata non è chiusa. Il deficit di una giornata si conta dal giorno dopo. Vale anche per la proposta di power nap (`PowerNap`).
- Prova numerica: debito 59 min senza dato di oggi; con oggi 3 h → 59; 5 h → 59; 8 h → 29.

## Sonno tra un turno e l'altro (cicli)
- Con i turni il sonno si spezza e non sta in un giorno solo: il debito e la voce Sonno della Disciplina ora si calcolano sui **cicli** (`lib/cicliSonno.ts`). Un ciclo va dalla fine di un turno alla fine del successivo (e ogni 24 ore nei giorni senza turni, con i cicli tagliati a 36 ore al massimo). Il sonno necessario è proporzionale alla durata: obiettivo × ore del ciclo ÷ 24 (ciclo di 18 ore → 5 h 15 per un obiettivo di 7 ore).
- Il sonno di ogni ciclo è la somma delle sessioni (o della parte che cade nel ciclo). I cicli senza dati (nessun sonno) non contano, il ciclo in corso può solo ridurre il debito.
- Il server salva le **sessioni di sonno** (`sonni`: inizio, fine, minuti di sonno vero; le notti vicine si fondono se separate da meno di 90 minuti di veglia) e le restituisce; ogni invio sostituisce le sessioni del periodo. Finché non sono arrivate (serve il deploy e una sincronizzazione), si usa il vecchio calcolo giorno per giorno.
- Nella riga del debito: «Ultimo ciclo tra turni: X dormiti su Y necessari». Provato in browser con 14 notti inventate.

## Il debito di sonno scade dopo 14 giorni
- Il debito guarda solo gli ultimi 14 giorni (`GIORNI_DEBITO`), sia con il calcolo giorno per giorno sia con i cicli: una notte corta di tre settimane fa non pesa più. Provato: due notti molto corte a inizio mese non cambiano il debito di oggi (59 minuti con e senza).

## Riserva di sonno e stato verde
- Quando il debito è zero (o c'è una riserva) la riga diventa **verde** con la spunta e la scritta «Dovresti essere ben riposato!». Se c'è sonno in più, compare «Riserva +N min».
- La **riserva** (`passoDebito` in `cicliSonno.ts`) si riempie con il sonno in più quando il debito è finito (per intero, fino a 2 ore) e si consuma per prima con le notti corte, prima che il debito risalga. Vale con entrambi i calcoli (giorno per giorno e cicli) e scade con il resto dopo 14 giorni.
- Provato con numeri: notte corta + notte lunga → debito 0; quattro notti da 10 h → riserva 120 min; riserva 120 poi notte da 5 h → debito 0, riserva 0.

## Momento consigliato che scorre con l'ora
- Le task che si adattano ai turni hanno come momento consigliato l'intera finestra libera più lunga del giorno (es. «10:30–18:30»). Prima l'orario restava quello di inizio finché la finestra non finiva (alle 19 si leggeva ancora «14:00»). Ora, se la finestra è ampia e già iniziata, l'inizio si porta all'ora attuale (arrotondata al quarto d'ora) e la fine a due ore dopo (o fino alla fine della finestra). Un orario scelto a mano non cambia.
- Provato con l'orologio simulato: 10:00 → 10:30–18:30; 13:20 → 13:30–15:30; 17:10 → 17:15–18:30; 18:50 → «nessun momento libero oggi».

## L'orario scelto a mano scade
- Un momento che hai scelto tu (la matita sulla scheda) resta com'è finché c'è ancora il tempo di fare la task; quando passa e la task non è fatta, l'app propone il prossimo momento libero della giornata («Nuovo momento», con «spostato»), come per gli orari automatici. L'orario scelto resta salvato (il pulsante «auto» lo toglie).
- Provato con l'orologio simulato: scelto 14:00–14:30 → alle 10:00 e alle 13:50 resta così; alle 14:20 → 14:30–15:00 «spostato»; alle 17:10 → 17:15–17:45; alle 18:50 → «nessun momento libero oggi».

## Orario modificabile con durata e spia del bucato
- **Modifica del momento**: spostando l'orario di inizio, quello di fine lo segue mantenendo la durata (13:00–13:15, inizio a 16:00 → 16:00–16:15). Se cambi la fine a mano, la nuova durata è quella e vale per i prossimi spostamenti dell'inizio.
- **Spia del bucato** (`SpiaSeguito`): le task che arrivano dopo un'altra («Stendi il bucato» dopo la lavatrice) compaiono in Oggi sotto il blocco del turno (nella vista estesa, sotto «La tua giornata»), non più nell'elenco. Scheda che lampeggia come una spia: **verde** nella prima ora, **gialla** dopo un'ora, **rossa** dopo un'ora e mezza con l'icona di priorità e lampeggio più veloce. Il timer parte da quando il ciclo è finito (la task si apre) e mostra da quanto il bucato è bagnato in lavatrice (mm:ss, poi h:mm:ss). Pulsante «Steso!» per segnarla fatta.
- **Notifiche del bucato**: una a fine ciclo e poi una ogni 30 minuti (fino a 12 ore) finché non la segni fatta; dal terzo promemoria in poi l'emoji è 🚨 e il testo dice da quanto è bagnato. Mentre dormi non ti sveglia (la prima slitta al risveglio, le altre si saltano). Il piano si rimanda a ogni cambiamento: segnata come fatta, le notifiche si spengono.
- Provato in browser con l'orologio simulato: spia verde a 40 min, gialla a 70, rossa a 100; l'elenco non la duplica; «Steso!» la completa; notifiche ogni 30 minuti e 0 dopo il «fatto».

## «Ritira e svuota lo stendino»
- Quando segni «Stendi il bucato» come fatto, dopo **30 ore** si apre «Ritira e svuota lo stendino» (15 XP) con la notifica «Il bucato è asciutto: ritira e svuota lo stendino.»; poi la notifica si **ripete ogni 12 ore** (fino a 4 giorni) con «Ancora da fare: non dimenticarlo.» finché non la completi. Vale anche per le «Stendi il bucato» già in attesa, create prima di questa regola.
- Struttura: `SpecSeguito` (`dopoMin`, `titolo`, `testo`, `punti`, `ripetiMin`, `poi`): ogni seguito può avere il suo seguito e il suo intervallo di ripetizione. Da 60 minuti in su il seguito è una task normale, sotto è la «spia» (solo il bucato).
- I seguiti **ancora da fare non spariscono più** il giorno dopo: si riportano ogni giorno a «oggi» fino a quando non li completi; quelli fatti si ripuliscono dopo un giorno.
- Il lento («ogni 12 ore») non salta mai: se cade nel sonno, slitta al risveglio.
- Provato in browser: «Steso» → nasce lo stendino tra 30 ore con ripetizione 720 min; uno stendino di due giorni prima ancora da fare resta in lista con la data riportata a oggi.

## Piano turni / account / backup (solo discussione, nessun codice)
- Il piano completo, i fatti sul codice, le decisioni, le questioni aperte e il prompt per creare l'Excel dei turni stanno in `docs/turni-multiutente.md`. La discussione si porta avanti su un'altra scheda; qui si continua a parlare solo di Keepway.

## «Pianificazione… → Pianificato» nel popup della pianificazione automatica
- Quando nel popup scegli la proposta e tocchi «Pianifica», il contenuto del popup cambia: per circa 1 secondo «Pianificazione…» con un anello verde che gira, poi «Pianificato» con una grande spunta verde che si disegna (con un piccolo rimbalzo e un bagliore) e «N giorni nel tuo piano», con il suono di salita. Dopo circa 1,2 secondi la task si salva e il popup si chiude. Con le animazioni spente nelle Impostazioni, la conferma è immediata.

## Pianificazione automatica: «Quando» per primo, oggi solo da adesso in poi, animazione delle task che si compilano
- Nella scheda «Nuova task» → «Quando», **«Pianificazione automatica» è la prima opzione**.
- **Correzione dell'orario di oggi**: il pianificatore proponeva per oggi un orario già passato (alle 23:40 «oggi alle 13:00»). Ora per oggi si considera solo ciò che è ancora da venire (dal prossimo quarto d'ora): alle 10:00 propone oggi dalle 10:30; alle 23:40 oggi non c'è più e la proposta riparte da domani. Vale per le proposte, per i giorni fissati di oggi e per il ricalcolo del piano. Provato con l'orologio simulato.
- **Animazione**: dopo «Pianifica», per circa 2 secondi le task nuove si compilano una dopo l'altra (titolo, poi riga per riga giorno e orario che si «scrivono», con una piccola spunta verde per ciascuna e una barra di avanzamento); poi «Pianificato» con la grande spunta verde (come prima), e il popup si chiude.

## Semafori del Trieste Marine Terminal
- Il sito del terminal mostra due semafori («Empty cntr yard» e «Full cntr yard»). Nel suo codice li riempie uno script con la risposta dell'indirizzo pubblico `https://www.trieste-marine-terminal.com/arrivals.php`, campo `semaphores` (testo di lettere: la prima è Empty, la seconda Full; `G` = verde = «Open – operation ongoing», altro = chiuso). Letto il 5/11: `RRRR` (bora).
- **Server** (`worker/index.js`): controlla il sito ogni 5 minuti (cron) e, se l'app lo chiede e il dato ha più di 4 minuti, lo rilegge; ricorda lo stato in `meta` (chiave `terminal`, con un controllo che evita notifiche doppie se due richieste arrivano insieme). Se il sito non risponde tiene lo stato di prima e lo segnala (`fallito`). Nuova rotta `GET /api/terminal`. Nuova tabella `terminal_finestre`.
- **Notifiche**: a ogni cambio di stato, ai soli telefoni dentro una loro finestra: da 3 ore prima dell'inizio di un turno a mezz'ora dopo la fine (es. turno 13:00–19:00 → attive dalle 10:00 alle 19:30). Le finestre le calcola l'app dai turni (`finestreTerminal` in `lib/terminal.ts`, comprese modifiche e straordinari) e le manda al server insieme al piano delle notifiche (quindi si aggiornano quando apri l'app). Testi: «Terminal operativo» (verde), «Operazioni sospese» (rosso), «Operativo in parte» (uno e uno). Interruttore in Impostazioni: «Avvisi dei semafori del terminal».
- **Pagina Oggi**: due luci che pulsano piano a destra della scheda del turno, con sotto «Terminal operativo» / «Operazioni sospese» / «Operativo in parte» / «Stato non disponibile»; se il dato è vecchio (più di 20 minuti o sito non raggiungibile) compare «dato delle HH:MM». La scheda del turno ora ha il nome del turno e l'orario su due righe.
- Provato: server con database finto (cambio di stato → un solo telefono avvisato, sito giù → stato mantenuto), finestre sul calendario vero (turno 4 il 4/11 → 16:00–01:30; turno 3 il 5/11 → 10:00–19:30), interfaccia in browser nei cinque stati.
- Cautela: è un indirizzo del sito non documentato come servizio pubblico; può cambiare senza avviso. Un solo controllo ogni 5 minuti.

## Semafori del terminal: controllo più discreto
- Il sito del terminal si interroga **solo in prossimità dei turni** (da 10 minuti prima dell'inizio della finestra, cioè da 3 ore e 10 minuti prima del turno, fino a mezz'ora dopo la fine) e **ogni 10 minuti** (prima 5, sempre). Fuori dalle finestre non si chiede niente al sito: l'app mostra l'ultimo stato noto, con «dato delle HH:MM» se è vecchio. Un dato di meno di 9 minuti non si rilegge. L'unica eccezione è la primissima lettura, quando ancora non c'è nessuno stato.
- Il `robots.txt` del sito non vieta `/arrivals.php` e chiede 10 secondi tra una richiesta e l'altra; noi siamo molto sopra. L'identificazione resta onesta («Keepway/1.0, uso personale»). Se Stefano lavora lì, conviene avvisare chi gestisce il sito.
- Provato con database finto: fuori dalle finestre 0 richieste al sito; a 5 minuti dall'inizio 1 richiesta; cambio di stato → un solo telefono avvisato.

## La settimana: modalità settimanale in Oggi, vista d'insieme, obiettivi e rito della domenica
- **Transizione**: in Oggi, toccando un giorno qualsiasi della striscia, il box ricompensa sfuma (dissolvenza con un leggero sfocato) e si chiude, la striscia dei giorni sale in alto e resta fissa mentre scorri (ora 14 giorni), e alla fine si apre il giorno toccato. Un selettore «Giorno | Vista d'insieme» e il pulsante «Esci» (che riporta il box) stanno sotto la striscia.
- **Vista d'insieme**: la settimana (frecce per cambiare) con un blocco per giorno: turno, **carico** (Recupero, Essenziale, Leggero, Normale, Pesante: task e appuntamenti rispetto al tempo libero tra turni e sonno) e **tutto** quello che c'è: task di ogni tipo (ogni giorno, giorni fissi, automatiche) e appuntamenti, con l'orario. In alto un avviso sui giorni a carico alto, con i giorni più leggeri dove spostare qualcosa.
- **Obiettivi della settimana**: Allenamenti (3), Notti sopra l'obiettivo di sonno (5), Giornate piene (3) e uno tuo scritto a parole (si spunta a mano); barre verdi quando raggiunti. Si vedono in modalità settimanale; si scelgono nel rito.
- **Rito della domenica** («Prepara la settimana»): una scheda in Oggi dalla domenica alle 12:00 e il lunedì, finché non lo fai; tre passi (com'è andata la settimana scorsa → la settimana che arriva con la vista d'insieme e i giorni carichi → gli obiettivi), poi «Settimana pronta» con la spunta verde. Notifica la domenica alle 18:30 (e il lunedì alle 10:00 se non l'hai fatto).
- La vecchia task «Programmazione Allenamenti Settimanali» è tolta: compariva solo se esisteva almeno una task automatica nell'area Allenamento (per questo la domenica non c'era) e portava solo alla pagina Task. Ora il rito vale sempre.
- Provato in browser (orologio simulato): transizione, striscia fissa, vista d'insieme, rito dei tre passi (scheda assente il sabato e la domenica mattina, presente la domenica pomeriggio e il lunedì finché non confermi, poi sparisce).
- Resta da fare: avvisare dei **cambi di piano** con il motivo e chiedere conferma.

## Avviso sui cambi di piano, con il motivo e la conferma
- Quando il piano automatico cambia **da solo** (un turno spostato, un appuntamento nuovo, una modifica ai turni...), l'app confronta il piano nuovo con quello che avevi già visto (`pianoVisto`, `lib/cambiPiano.ts`). Se un giorno è saltato crea un **cambio**: in Oggi compare la scheda «Il piano è cambiato» con la task, il giorno di prima e quello nuovo (o «tolta»), **il motivo** («Venerdì 31 non va più bene: notte + sera: giornata di recupero», oppure «ora il piano preferisce un altro giorno…») e due pulsanti: **«Va bene»** (il piano nuovo resta) e **«Tieni Mercoledì 29»** (la task torna al giorno di prima, che diventa fissato; solo se quel giorno è ancora possibile).
- Notifica «Il piano è cambiato — Pulizia stufa: apri per confermare», 10 minuti dopo l'ultima volta che hai usato l'app (si sposta o sparisce se la riapri; non ti sveglia).
- **Non** avvisa per le scelte tue (creare o modificare una task, accendere o spegnere un giorno, fissare i giorni, rifare la proposta): in quel caso il piano nuovo è quello visto. Non avvisa nemmeno quando la quota della settimana è già raggiunta con task fatte, né dopo aver fatto una task «ogni N giorni» (le date si ricontano).
- Provato: logica con dati finti (primo giro silenzioso, giorno saltato → cambio con motivo, nessun duplicato, conferma, scelta dell'utente senza avviso) e interfaccia in browser (carta con motivo e pulsanti, «Tieni» fissa i giorni e lascia gli altri cambi in attesa).

## Correzione degli spazi in Oggi
- Il box ricompensa era attaccato alla striscia dei giorni: la regola della transizione azzerava per errore il margine sotto. Ora lo spazio è quello normale della pagina (20 px, misurato nel browser), anche dopo «Esci»; in modalità settimanale resta un po' d'aria sopra la striscia.

## Modalità settimanale: vuoto sopra i giorni, sfumatura, obiettivi in fondo
- **Vuoto sopra la striscia dei giorni (iPhone)**: la striscia riservava sempre lo spazio della barra di stato (`env(safe-area-inset-top)`), che sull'iPhone è alto e restava vuoto finché non scorrevi. Ora quello spazio compare solo quando la striscia è davvero in cima allo schermo (un sensore sulla pagina, `data-ferma`). Nel browser da computer quello spazio è zero, per questo non si vedeva nelle prove.
- **Sfumatura del box ricompensa**: ora sfuma per prima, lentamente (opacità da 1 a 0 in circa 0,7 s, con sfocatura e un piccolo spostamento verso l'alto), e la chiusura dello spazio parte 0,2 s dopo, mentre i giorni salgono; il giorno toccato si apre alla fine (0,9 s). Misurato: opacità 1 → 0,67 → 0,32 → 0,02 → 0 mentre la striscia sale da 352 a 147 px.
- **Obiettivi della settimana**: in modalità settimanale stanno **per ultimi**, sotto le task.

## Modalità settimanale: intestazione, spazi e transizione immediata
- **Intestazione**: in modalità settimanale, «Compatta | Estesa» (che senza il box ricompensa non servono) diventa **«Giorno | Settimana»**, e «Fuori casa» diventa **«‹ Indietro»**. Sotto la striscia dei giorni non c'è più la riga con il selettore e «Esci».
- **Spazi**: sopra la striscia dei giorni sono 20 px, come in tutta la pagina (misurato: prima 35 per un elemento invisibile che avevo messo; l'elemento è stato tolto e la striscia si ferma in alto con un controllo sullo scorrimento). Il giorno selezionato (ingrandito) ha spazio sopra e sotto e non è più tagliato; lo spazio è isolato (`flow-root`) per non spostare niente.
- **Transizione**: tocchi un giorno e il giorno si apre **subito** (prima si apriva dopo 0,9 s); il box sfuma e i giorni salgono **insieme** (0,55 s, nessun ritardo). Con «Indietro», torna a oggi **subito**, il box ricompare e i giorni scendono insieme. Misurato: a 125 ms il box è a metà opacità (0,51) e la striscia è già salita da 331 a 169 px.

## Stanze diverse ogni giorno nella settimana e transizione più lenta con bagliore
- **Difetto**: nella vista della settimana (e in ogni giorno futuro) «Sistema una stanza» mostrava sempre la stessa stanza (la prossima «non ancora fatta»). Ora la rotazione si proietta in avanti: una stanza al giorno, in ordine, tra quelle ancora da fare nel giro; finito il giro si ricomincia (es. cucina → bagno → soggiorno → camera → cucina → bagno). Se oggi hai già fatto una stanza, domani è la successiva. La vista d'insieme mostra anche il nome della stanza del giorno. È una stima: se salti un giorno, la rotazione si riallinea da sola.
- **Transizione del box ricompensa**: più lenta di mezzo secondo (da 0,55 a 1,1 s) sia quando sparisce sia quando ricompare, con sfumatura dell'opacità in 0,8 s. **Bagliore leggero** dentro il box, ambra, sia in entrata (mentre sfuma) sia in uscita (mentre ricompare); spento se le animazioni sono spente nelle Impostazioni.

## Build fallita su Cloudflare: cache di Turbopack danneggiata
- **Errore** (registro di Cloudflare, 2/11): `Failed to restore build output from build cache. Skipping.` poi `turbo-persistence … range start index … out of range` e `Aborted (core dumped)`. Cloudflare ricarica la cartella `.next/cache` della build precedente; se è danneggiata, Turbopack (il compilatore di Next 16) ci va a leggere e si schianta. Non è un errore del nostro codice: qui la build da zero funzionava.
- **Riprodotto** rovinando di proposito un file della cache locale: la build si schianta con lo stesso tipo di errore.
- **Correzione**: in `next.config.ts` `experimental.turbopackFileSystemCacheForBuild: false` (nessuna cache su disco). Provato: con la cache rovinata ancora presente la build riesce, e non ne crea di nuove. Il sito è piccolo: senza cache la build dura pochi secondi in più.

## Transizione del box: dissolvenza vera in uscita e in entrata, bagliore visibile
- **Problema**: dopo aver rallentato l'animazione, in uscita lo spazio si chiudeva più in fretta di quanto il box sfumasse (il box veniva «tagliato», non si dissolveva); in entrata il box compariva solo a fine corsa; il bagliore era dentro il box e spariva insieme a lui.
- **Uscita** (1,1 s): il box sfuma subito (0,7 s); lo spazio parte con 0,25 s di ritardo, mentre i giorni salgono. Misurato: opacità del box 0,94 → 0,73 → 0,38 → 0,04 mentre lo spazio resta a 179 px fino a 250 ms e poi si chiude.
- **Entrata** (1,1 s): lo spazio si apre subito e in modo regolare (curva dolce) e il box si dissolve in ingresso mentre si apre (da 100 ms). Misurato: spazio 5 → 39 → 102 → 151 → 171 → 179 px con box 0 → 0,08 → 0,29 → 0,68 → 0,95 → 1.
- **Bagliore**: uno strato ambra separato che segue il box (dentro e intorno, non sfuma con lui), con il massimo a circa un terzo in uscita e a metà in entrata. Spento se le animazioni sono spente.

## Transizione del box: bagliore bianco e uscita senza scatto
- Il bagliore ora è bianco (in uscita e in entrata).
- Causa dello scatto in uscita: la chiusura partiva con 0,25 s di ritardo (tutto fermo, poi i giorni salivano di colpo), il bagliore finiva prima del movimento, e la striscia dei giorni saltava di 8 px quando diventava fissa.
- Ora la chiusura parte subito, dura 1,1 s con curva dolce, dissolvenza e bagliore sono in contemporanea (picco a metà movimento), e il margine sotto la striscia è sempre presente, quindi niente salto.

## Transizione del box: bagliore che si spegne prima della chiusura
- In uscita il bagliore ora raggiunge il massimo al 28% e torna a zero al 65% della transizione, quindi si fonde con lo sfondo prima che il box sia chiuso del tutto.
- La dissolvenza del box in uscita usa le stesse durate e la stessa curva dell'entrata (0,85 s opacità/sfocatura, 0,95 s movimento), per avere la stessa fluidità.

## Bagliore: parte e finisce nel colore dello sfondo
- In uscita il bagliore si spegne del tutto al 58% (prima era 65%), con il box ancora visibile.
- In entrata il bagliore resta spento fino al 42%, poi sale (massimo al 75%) e si spegne a fine movimento: nasce dallo sfondo invece di comparire subito.

## Bagliore: niente alone esterno (quadrato chiaro all'angolo)
- Segnalato un angolo quadrato più chiaro fuori dal bordo arrotondato del box (iPhone). Probabile causa: l'ombra esterna del bagliore, che Safari disegna come rettangolo quando è animata insieme all'angolo arrotondato.
- Ora il bagliore è solo interno al box (ombra interna + filo bianco sottile): non può uscire dai bordi. Non verificabile su iPhone dal sandbox.

## Angolo quadrato chiaro a riposo (box ricompensa)
- Il difetto restava a transizione finita, quindi non era il bagliore. Cause probabili (Safari iPhone): l'ombra esterna del box (`RiepilogoOggi`) disegnata come rettangolo quando il box è su un livello a parte (`will-change` su `.sfuma`, animazioni interne).
- Tolti `will-change` da `.sfuma` e dal bagliore, e l'ombra esterna del box (resta quella interna e il bordo colorato). Non verificabile su iPhone dal sandbox; se serve l'alone si può rimettere con un altro metodo.

## Angolo quadrato: trovata la causa vera (animazione «alone»)
- L'animazione `alone` del box (lampo di fine ricalcolo) finiva con un'ombra esterna chiara e restava applicata per sempre (`both`): su iPhone veniva disegnata come rettangolo oltre l'angolo arrotondato.
- Ora parte e finisce senza ombra esterna e non resta applicata a fine animazione (`backwards`). Il picco dell'alone resta uguale.

## Due correzioni dopo la prova su iPhone
- Primo bagliore all'apertura: il picco dell'alone aveva un'ombra esterna che su Safari usciva dalla curva come un angolino. Ora il picco è solo interno al box (più intenso, stesso tempo).
- Box che spariva di colpo e restava la sagoma del bagliore: tolto `will-change` da `.sfuma` aveva fatto perdere la dissolvenza su Safari. Rimesso su `.sfuma`; il bagliore perde il filo bianco sul bordo (restava come sagoma) ed è solo luce interna.

## Dissolvenza del box con animazioni a fotogrammi
- Su iPhone il box spariva di colpo (uscita) e riappariva di colpo (entrata) mentre il bagliore restava come sagoma. Le «transition» di opacità e sfocatura sul box non erano affidabili su Safari.
- Ora uscita ed entrata usano animazioni `@keyframes` (`box-via`, `box-torna`, 0,95 s, stessa curva), attivate dallo stato del bagliore. Stato finale invariato.

## Ritorno alla dissolvenza fluida (come nel commit 4e9f3eb), tenendo solo la correzione dell'angolino
- Ripristinate le transizioni di opacità/sfocatura/movimento del box e il bagliore con alone esterno, come nella versione che funzionava su iPhone. Tolte le animazioni a fotogrammi.
- Tenuto solo ciò che toglie l'angolino a riposo: l'animazione `alone` non lascia più ombra esterna (`backwards`) e il box non ha l'ombra esterna statica. Il picco dell'alone è solo interno.

## Ritorno esatto alla versione fluida 4e9f3eb (globals.css e RiepilogoOggi)
- Anche dopo il ripristino parziale la dissolvenza del box su Safari non era fluida. Ripristinati i due file esattamente come nel commit 4e9f3eb (l'ultima versione confermata fluida). Torna di conseguenza l'angolino chiaro a riposo: lo si affronta solo dopo aver confermato che la dissolvenza è tornata.

## Angolino, passo 1 (una sola modifica sulla versione fluida)
- Solo `.ricalcolo`: l'animazione `alone` non resta più applicata a fine corsa (`both` → `backwards`). Il resto è identico a 4e9f3eb. Se la dissolvenza resta fluida e l'angolino sparisce, fine; altrimenti si prova il passo 2.

## Angolino, passo 2 (una sola modifica)
- Il passo 1 non ha cambiato nulla. Ora solo `RiepilogoOggi`: tolta l'ombra esterna statica del box (resta quella interna). Il resto è identico al passo 1. Se la dissolvenza si rompe, la causa è questa e si annulla.

## Angolino e bagliore rettangolare: ritaglio con la curva
- Il box ora è ritagliato con `clip-path: inset(0 round 1rem)`: qualunque cosa Safari disegni fuori dalla curva (ombre, strati) non si vede più. Vale come rimedio indipendente dalla causa.
- Il bagliore è solo interno e ritagliato con la stessa curva, quindi segue la forma del box e non esce come rettangolo.

## Contenitori del box con la stessa curva
- Ipotesi dell'utente: il livello rettangolare dietro il box (non il bagliore) crea l'angolino. Ora i contenitori `.collassa > div` e `.sfuma` hanno lo stesso raggio del box (1rem), così anche il loro livello è tondo.

## Notifica del terminal: formato fisso con luci
- Il testo è sempre «Operatività Terminal :» e sotto «Empty cntr 🔴 | Full cntr 🟢» (🔴 chiuso, 🟢 aperto). Niente più titoli diversi per operativo/sospeso/in parte. I dati letti erano giusti (l'inversione segnalata era un malinteso: sul sito Empty chiuso e Full aperto, come nella notifica). Il Worker va ridistribuito da Cloudflare.

## La giornata resta aperta fino al sonno + task di una volta che tornano
- **Giorno di lavoro** (`lib/giornoLogico.ts`): dopo la mezzanotte «oggi» resta il giorno di ieri finché non succede una di queste: una sessione di sonno (dai dati di Salute già scaricati) tocca il periodo dopo la mezzanotte; comincia un turno (es. turno 1 alle 01:00); sono le 05:00 (limite massimo, se i dati del sonno non sono ancora arrivati); oppure si tocca «Chiudi» nel riquadro che compare in Oggi (`GiornataAperta`). Si ricalcola ogni 30 secondi e subito dopo «Chiudi».
- Le task segnate in quel periodo contano per il giorno aperto (le scrive lo store con il giorno di lavoro). I minuti «adesso» dei componenti (`minutiNelGiorno`) superano 1440 dopo la mezzanotte (00:30 = 1470), così il pianificatore e i momenti suggeriti non propongono la mattina di ieri.
- **Task che tornano**: le stanze e le task «ogni N giorni» già si ripianificavano da sole (non fatte = si riparte dall'ultima volta fatta, appena possibile). Aggiunto: le task di una sola volta non fatte si riportano a oggi (fino a 14 giorni indietro), non solo i «seguiti».
- Limite noto: se il sonno non viene sincronizzato, la giornata si chiude da sola alle 05:00 (o all'inizio del turno).

## «In ritardo»: promemoria piccolo e discreto
- Sotto il titolo di una task non fatta compare «· in ritardo da ieri» / «da N giorni» (ambra tenue, 11 px). Vale per: task di una sola volta riportate (`riportataDa`), task «ogni N giorni» oltre il giorno in cui erano da rifare (ultima volta + N), stanza a rotazione dall'ultima stanza fatta. Le abitudini quotidiane non l'hanno mai. Logica in `lib/ritardo.ts`.

## Ieri si può riprendere
- La striscia dei giorni parte da ieri (chip «Ieri», poi «Oggi»). Toccando «Ieri» si apre la modalità settimanale sul giorno di ieri, con le task previste per ieri: «Fatto» le segna per ieri (`completa` accetta `data`), «Annulla» le toglie. Componente `GiornoIeri`.
- La regola «solo da guardare» resta per tutti gli altri giorni (futuri e più vecchi di ieri).
- Dopo la mezzanotte, con la giornata ancora aperta, «Oggi» è il giorno aperto e «Ieri» quello prima.

## Semafori: tocco = aggiorna, con «Aggiorno...»
- I semafori in Oggi sono un pulsante: al tocco il testo sotto diventa «Aggiorno...» (pulsa piano, almeno 1 secondo) e si rilegge subito lo stato dal server (`/api/terminal?aggiorna=1`).
- Worker: la lettura su richiesta salta il limite delle finestre dei turni (l'ha chiesta l'utente), ma al massimo una al minuto (`TMT_MANUALE_MS`): niente richieste a raffica al sito del terminal. Serve il deploy del Worker; senza, il tocco mostra «Aggiorno...» e rilegge l'ultimo dato del server.

## Sonno: il numero grande del grafico è la media (ora si legge)
- In «Ore di sonno» il numero grande in alto a destra è la media delle notti (non l'ultima notte) e non aveva etichetta: confondeva con il dato dell'ultima notte. Ora sotto c'è «MEDIA 14 NOTTI». L'ultima notte è nella tessera «Ultima notte».
- Il calcolo server delle notti (`worker/sonno.js`) non è stato toccato: unisce i pezzi di sonno vero (senza «sveglio» e «a letto»), fonde quelli separati da meno di 90 minuti e assegna la notte al giorno in cui finisce.

## Sonno: il numero grande è l'ultima notte, la media sotto in piccolo
- In «Ore di sonno» il numero grande è ora l'ultima notte, con la scritta «ULTIMA NOTTE»; sotto, più piccolo, «media N notti · X h XX min».

## Backup e ripristino (Impostazioni → Backup)
- `lib/backup.ts` + `BackupImpostazioni.tsx`. «Crea backup»: un file `keepway-backup-AAAA-MM-GG.json` con `keepway.v1` (tutto: task, completamenti, impostazioni...), il codice Salute, la giornata chiusa e la presenza. Su iPhone si apre il foglio di condivisione (Salva su File, AirDrop, Note); altrove si scarica.
- Non entrano: i dati Salute e i semafori (si riscaricano), l'identità delle notifiche del telefono (`keepway.device`: si rifà da sola, due telefoni non devono condividerla).
- «Ripristina da file»: prima controlla che sia un backup di Keepway (app, formato, dati principali), mostra cosa contiene (task, completamenti, date) e chiede conferma. Prima di sostituire tiene una copia dei dati di adesso in `keepway.prima-del-ripristino`. Poi ricarica l'app.
- Il file contiene il codice personale della Salute: va tenuto privato.
- Non c'è backup automatico nel cloud né account: è il passo 1 del piano in `turni-multiutente.md`.
- Provato: esporto, svuoto lo storage, importo (file sbagliato rifiutato, file giusto ripristinato con i completamenti e il codice).

## Recap turni: «Andamento del mese» (punti sulla paga base)
- `lib/punteggioMese.ts` + `turni/AndamentoMese.tsx` (in cima al Recap, sopra le voci). Punti: turno lineare 0; cambio turno pagato dall'azienda +25 (uno per gruppo, nel giorno in cui si compie); doppio consecutivo (2+3, 3+4) +25 sempre; 1+4 +25 solo se nato da straordinario o da cambio pagato (quello del roster di base non è pagato); straordinario +75 per ogni turno extra; assenza −15 per giorno. Esempi verificati: cambio + doppio il giorno dopo = 50; riposo con 2 straordinari consecutivi = 175; base 1 + straordinario 4 = 100.
- Il grafico è cumulato (da inizio mese, fino a oggi se il mese è in corso), con la linea dello zero «paga base». Colore dal valore: verde normale sullo zero, sempre più acceso salendo; rosso normale sotto lo zero, sempre più acceso scendendo (`colorePerValore` in `GraficoLinea`).
- Da fare: «da sinistra a destra» (anche per il sonno): lo screenshot promesso non è arrivato; nel codice la linea si disegna già da sinistra a destra.

## Turni: il 1+4 resta blu
- Nel calendario del mese e nell'elenco dei turni il 1+4 del roster è blu, come ogni altro turno di lavoro (prima era viola e si confondeva con lo straordinario, che è viola). Gli straordinari restano viola nella striscia sotto il blocco. I colori dei singoli turni nei puntini della striscia dei giorni e nel bordo della scheda non sono cambiati.

## Nuova icona: spunta azzurra
- L'icona è una spunta azzurra (`#29a3f0`, come il vecchio visualizzatore) con un leggero bagliore su fondo blu notte quasi nero; sostituisce la bussola. File in `public/icons` (180, 192, 512, 1024 px, quadrati e opachi: iOS arrotonda da solo gli angoli). iOS tiene l'icona vecchia: per vederla va tolta e rimessa l'app dalla Home (prima backup da Impostazioni → Backup).

## Benvenuto al risveglio
- `Benvenuto.tsx`, `lib/benvenuto.ts`, `lib/meteo.ts`. Compare solo alla prima apertura dopo una pausa lunga (6 ore o più dall'ultimo uso, cioè dopo una notte o dopo il sonno seguito a un turno di notte) e solo se l'ultimo benvenuto è di più di 8 ore fa; non compare se arrivi da una notifica (`?da=notifica`, aggiunto in `sw.js`), né se è spento in Impostazioni. In Impostazioni: interruttore, «Come ti chiamo» (default Stefano) e «Rivedi il benvenuto» (`/oggi/?benvenuto=1`, per provarlo quando vuoi).
- Contenuto, scritto a cascata come una persona (tocco per saltare, «riduci movimento» = tutto subito): saluto con l'ora, sonno di stanotte con frase e grafico delle ultime 7 notti, turno di oggi, meteo di Trieste («circa N gradi», Open-Meteo, senza chiave), le task di oggi non ancora fatte in ordine di orario, il turno di domani. Pulsanti: LET'S GO! (resta in Oggi) e Aggiungi qualcosa (apre Task).
- Sonno non ancora sincronizzato: non si finge di aggiornare. Si controlla il server (max 2,6 s: «Controllo i dati…»), e se la notte non c'è lo dice («non è ancora arrivato dall'iPhone») con un pulsante «Sincronizza ora» (apre il Comando Rapido). Se il meteo non risponde, la riga manca.
- Tolto il popup «sincronizza» del mattino (resta quello della sera, dopo le 22:30).

## «Rivedi il benvenuto» funziona anche senza ricaricare
- Il benvenuto vive sopra tutte le schermate e decideva se comparire solo all'avvio: toccando «Rivedi il benvenuto» in Impostazioni (navigazione interna) non succedeva niente. Ora il pulsante manda un segnale (`keepway:benvenuto`) che lo riapre subito, anche se è spento o già visto.

## Benvenuto: ritocchi dopo la prova
- Animazione più veloce; saluto più piccolo; turno scritto «turno 3 - (13:00-19:00)» (il trattino non va a capo dentro l'orario).
- Il grafico del sonno è solo grafico (`senzaIntestazione`) e compare anche se la notte non è ancora arrivata (con le notti che ci sono).
- Le task hanno la forma delle task (barra colorata, icona dell'area, titolo, orario), non un elenco puntato.
- Niente emoji: a sinistra di ogni frase c'è un'icona disegnata coerente (sole/luna per il saluto, letto, valigetta per il turno, icona del meteo dal codice del tempo, calendario, lista).
- LET'S GO! e Aggiungi qualcosa stanno in fondo alla pagina, dentro il contenuto, e la pagina scende da sola mentre compare altro (si ferma se scorri tu).

## Benvenuto: tutto in una pagina
- Layout compatto: saluto con icona; frase del sonno solo testo (se non c'è: «Il sonno di questa notte non è ancora sincronizzato» con il tasto piccolo SINCRONIZZA sulla stessa riga); grafico; «Da Roster hai il turno 3 - (13:00-19:00)» su una riga, sotto in piccolo «Domani: turno …»; meteo solo testo con il termometro in coda, della stessa dimensione; «Oggi la tua giornata prevede:» e le task molto più piccole (una riga: icona, titolo, orario). Il turno di domani non è più in fondo.
- LET'S GO! / Aggiungi qualcosa: la pagina si dissolve verso l'alto con un bagliore azzurro di bordo (0,65 s, stile del box ricompensa) e sotto compare Oggi; poi si apre ciò che hai scelto. Con «riduci movimento» è immediato.

## Nuova home di Oggi + colori dell'icona
- Struttura di Oggi: data, striscia dei giorni (parte da Ieri), turno + semafori, [spia, appuntamenti], **Adesso** (la prima task non fatta, nella sua scheda che respira con un bordo azzurro), **Prossimo**, **Altre task · il resto di oggi** (le prime 3, poi «+ N altre»; le fatte in fondo), scheda **Sonno** (con il debito in alto a destra: ambra se c'è, verde «in pari»), e in fondo la **barra del livello** (3 anelli piccoli, livello, XP al prossimo; tocco = Progressi; piccolo impulso quando completi una task). Tutto con le schede task di prima: timer, versione minima, stanza, «salta» funzionano come sempre.
- Il box grande (`RiepilogoOggi`) è in cima a Progressi. Gli anelli sono in tre blu (#8fd3ff, #29a3f0, #6d7cff). Il suo «tempo che resta» ora usa il giorno di lavoro (dopo mezzanotte supera 1440).
- Tolti da Oggi: il box grande con la transizione che lo faceva dissolvere (resta il CSS, non usato), Compatta/Estesa (la timeline `Timeline.tsx` non è più collegata). «Fuori casa» è ancora nell'intestazione.
- Palette: sfondo #0a0f16, schede #0f1a28, testo #e8f1fa, accento azzurro #29a3f0 (tema chiaro #1e88e5); l'ambra resta come `--ambra` e nei colori scritti a mano (attenzione, energia, debito). Colori del tema in `layout.tsx` e manifest aggiornati.

## Home: ritocchi dopo la prova
- Benvenuto: l'icona del saluto sta dopo il nome («Buon pomeriggio Stefano ☼»), compare quando il nome è scritto.
- Oggi: la task «Adesso» ha il bordo sinistro azzurro (non il colore dell'area, che stonava) ed è più grande (`evidenza` in `TaskCard`: padding, icona e titolo più grandi).
- Tolta la scritta «Prossimo»: le prossime task stanno direttamente sulla **linea del tempo** (`Timeline`, con gli appuntamenti, l'orario sopra ogni scheda, la riga rossa «adesso», il «già passato» e «Quando vuoi» per le task senza orario). Per questo non c'è più il box «Appuntamenti di oggi» separato.
- Il box ricompensa ridotto sta in alto a sinistra, al posto di «Oggi» (resta un titolo nascosto per l'accessibilità); la data è a destra sotto «Fuori casa» (in vista settimanale lì c'è il selettore Giorno/Settimana).

## «Fatta» animata, pulsanti riordinati, orario accanto al titolo, settimana dalla data
- Scheda aperta di una task: premendo **Fatta** (o **Versione minima**) la scheda si illumina di verde, il contenuto sfuma e al centro si disegna una spunta (0,7 s); poi la task si segna e la scheda si chiude. Con le animazioni spente è immediato. Ordine dei pulsanti: **Inizia! · Versione minima · Fatta** (Apri, quando c'è, dopo Inizia).
- L'orario consigliato sta accanto al titolo, tra parentesi: «Pulizia stufa (10:30–10:45)». Via il bollino che stava a cavallo del bordo nella linea del tempo (resta solo per gli appuntamenti) e via la riga dell'orario sotto il titolo; sotto resta solo «spostato» / «prima di dormire» se serve.
- Vista settimanale da Oggi: la data in alto a destra (con l'icona del calendario) è ora un pulsante che apre direttamente la vista d'insieme della settimana. Toccare un giorno della striscia (anche Oggi) apre ancora la modalità settimanale su quel giorno. Prima non c'era nessun indizio visibile: con il box grande che si dissolveva era evidente, ora no.

## Ritocchi alle schede task
- «Adesso»: l'orario torna sotto il titolo (con l'orologio), perché accanto al titolo si sovrapponeva alla fiamma della serie e ai punti. Per tutte le altre task l'orario resta accanto al titolo.
- Scheda aperta: **Inizia! · Minima (3′) · Fatta** sulla stessa riga (testo corto, niente a capo; se c'è «Apri» possono andare su due righe).
- «Fatta» più dopaminica e di 1,5 s: la scheda rimbalza e si illumina, un lampo la attraversa, due onde e 16 coriandoli colorati partono dal centro, la spunta rimbalza e «+N XP» compare sotto. La task si segna alla fine. Con le animazioni spente è immediato.

## «Fatta»: suono nell'animazione, uscita della scheda, sezione «Task completate»
- Il suono della task completata parte con l'animazione (non dopo): `completa` accetta `suonoGia` e il popup dei punti non lo ripete (la fanfara del nuovo livello e quella del timer restano).
- Dopo l'animazione (1,5 s) la scheda scompare con un movimento (si sposta, sfuma e si chiude in altezza, 0,45 s) e le altre scivolano al suo posto; poi la task si segna.
- Le task fatte stanno nella sezione **Task completate · N**, subito prima di «Domani hai» (e della scheda Sonno), non più nella linea del tempo. Si aprono per l'«Annulla».
- I pulsanti della scheda sono grandi e uguali (altezza 44 px, colonne uguali): Inizia! · Minima · Fatta (+ Apri se c'è); sotto, Più tardi e Salta oggi in due colonne uguali.

## Principio di design
- Ordine e simmetria sempre (come insegna Jobs): elementi dello stesso tipo hanno la stessa dimensione, lo stesso spazio e lo stesso allineamento; le righe di pulsanti si dividono in colonne uguali; niente elementi che si sovrappongono o che vanno a capo a caso. Si controlla ogni volta che si tocca un'interfaccia.

## Etichette di Oggi
- «Adesso» (la scheda in evidenza) ora si chiama **NEXT**; la sezione «Quando vuoi» (task senza orario) ora si chiama **BEFORE SLEEP**. La riga rossa della linea del tempo con l'ora corrente resta «adesso HH:MM».
- In sospeso: trascinare le task sulla linea del tempo (tenere premuto, `user-select: none` per evitare la selezione del testo); manca la scelta fra «prende l'orario subito dopo quella sopra» e «scambia l'orario».

## Benvenuto: anche gli appuntamenti
- «Oggi la tua giornata prevede:» ora comprende gli appuntamenti e i promemoria di oggi (non ancora fatti), nello stesso elenco delle task e in ordine di orario; quelli senza ora («tutto il giorno») stanno in cima. Stessa forma piccola delle task, con il colore della priorità a sinistra e l'orario in azzurro per distinguerli (es. «Psicologa 16:30–17:30»). Se non c'è niente: «Oggi non hai task né appuntamenti. Giornata libera.»
