# Binario — Modulo Protocollo

> Allegato al documento di progetto `binario-progetto.md`.
> Contiene la parte **pratica e applicabile** estratta dalla mia Bibbia (Protocollo Insight), da trasformare in funzioni, task e contenuti dell'app.
> **Modulo personale:** si attiva solo nel mio account ed è separato dal resto dell'app. Se un giorno Binario sarà aperto ad altri utenti, i testi di questo modulo andranno riscritti con contenuti originali.

---

## 1. Principi di design dell'app

Questi principi vengono dalla Bibbia e devono guidare **come funziona la gamification**, non solo cosa contiene.

| Principio | Cosa significa per l'app |
|---|---|
| **Il cervello cambia con l'azione, non con le intenzioni** | Le task sono sempre azioni concrete e misurabili, mai propositi vaghi. |
| **Prima le prove, poi l'identità** | Ogni task completata è una "prova". L'app tiene un archivio delle prove accumulate (es. "47 bagni freddi fatti"). |
| **Una variabile alla volta** | Il percorso sblocca una nuova area di lavoro alla volta (vedi sezione 3). Mai più di una abitudine nuova a settimana. |
| **La dopamina arriva nel progresso, non nell'arrivo** | Barre di avanzamento ovunque, traguardi intermedi frequenti, mai solo l'obiettivo finale. |
| **Celebrare i piccoli traguardi** | Effetto di completamento su ogni task, anche la più piccola. |
| **La sorpresa dà più dopamina della ricompensa attesa** | Ricompense a sorpresa: punti bonus casuali, badge inattesi, "colpo di fortuna" occasionale. |
| **Premiare lo sforzo, non il risultato** | Punti per i minuti fatti e la costanza, non per la prestazione (es. la corsa vale per i minuti, non per il passo). |
| **Resilienza = velocità con cui torni** | Oltre alla serie di giorni consecutivi, misurare il **"tempo di rimbalzo"**: dopo un giorno saltato, quanto ci metto a ripartire. Ripartire subito dà un bonus "rimbalzo". |
| **Meglio imperfetto che fermo** | Ogni task ha una **versione minima** (es. lettura: 20 min, minima 5 min). La versione minima mantiene la serie. |
| **Rimuovere il trigger batte la forza di volontà** | Task di "preparazione ambiente" (es. preparare le scarpe da corsa la sera prima). |
| **Identità prima dell'abitudine** | Ogni area ha una frase identitaria scelta da me (es. "Sono uno che si allena"), mostrata quando completo una task di quell'area. |
| **Novità e side quest tengono alta la motivazione** | Accanto alle task principali, missioni secondarie facoltative e variabili. |
| **Vita multidimensionale** | Il riepilogo mostra l'equilibrio tra le aree: se una va male, le altre restano visibili. |

---

## 2. Libreria di pratiche

Ogni pratica può diventare una task. Per ognuna: area, durata indicativa, momento della giornata, e se è adatta ai giorni pesanti (notte o doppio turno). Ogni pratica ha una scheda **"Perché funziona"** di 2-3 righe (vedi sezione 5).

### 2.1 Kit SOS: ansia e stress acuto

Accessibile con **un solo tocco** dalla schermata Oggi (pulsante sempre visibile). Pratiche guidate con timer, istruzioni passo passo e, dove serve, animazione del respiro.

| Pratica | Durata | Note |
|---|---|---|
| **Sospiro fisiologico** (doppia inspirazione dal naso + lunga espirazione) | 1-2 min | Il modo più rapido per calmarsi. Animazione guidata. |
| **Grounding 5-4-3-2-1** (5 cose che vedi, 4 che tocchi, 3 che senti, 2 che annusi, 1 che gusti) | 2-3 min | Prima risposta all'ansia acuta. Schermata guidata step by step. |
| **Humming** (canticchiare a bocca chiusa) | 1-2 min | Stimola il nervo vago. |
| **Scuotere il corpo** (somatic shaking) | 1-2 min | Scarica la tensione fisica. |
| **Cambia stanza / esci** | 1 min | Interrompe il loop legato all'ambiente. |
| **Camminata** | 10+ min | Il movimento in avanti calma l'amigdala. |
| **Rilassamento muscolare progressivo** | 10 min | Tensione e rilascio, gruppo muscolare per gruppo. |
| **Dai un nome all'emozione** ("sto provando ansia", non "sono ansioso") | 1 min | Campo di testo libero. |
| **Worry, ansia o paura?** | 1 min | Mini-domanda per capire cosa sto vivendo: pensiero, pensiero + corpo, o minaccia reale. |

Dopo ogni uso del Kit SOS: domanda rapida "Come stai ora? (1-5)", salvata nei dati.
Nel Kit SOS deve esserci anche un pulsante **"Contatta la mia psicologa"** (numero impostabile) e una nota chiara: questi strumenti aiutano, ma non sostituiscono il supporto professionale.

### 2.2 Respirazione

| Pratica | Durata | Momento |
|---|---|---|
| Box breathing (4-4-4-4) | 3-5 min | qualsiasi |
| Respirazione diaframmatica lenta | 5 min | sera |
| Coerenza cardiaca (circa 6 respiri al minuto) | 5 min | qualsiasi |
| Wim Hof | 10-15 min | mattina, **mai in acqua o alla guida** (avviso obbligatorio) |

Tutte con animazione guidata e timer.

### 2.3 Routine del mattino

Framework **"3 M": Movimento, Mindfulness, Mindset.**

| Pratica | Durata | Note |
|---|---|---|
| Luce solare negli occhi appena sveglio | 5-10 min | Nei turni di notte: adattarla al risveglio, non all'orario |
| Check del corpo: "Di cosa ho bisogno oggi?" | 1 min | Risposta rapida a scelta (energia, calma, movimento, riposo) |
| Movimento breve | 5-10 min | |
| Pagine del mattino (scrittura libera) | 10 min | |
| Intenzione del giorno (una frase) | 1 min | Mostrata nella schermata Oggi |

### 2.4 Routine della sera

| Pratica | Durata | Note |
|---|---|---|
| **Svuota la testa** (brain dump) | 5 min | Campo di testo libero: scrivo tutto quello che gira in testa |
| **3 vittorie della giornata** | 2 min | Tre campi, anche piccole. Si salvano nell'archivio delle prove |
| Gratitudine | 2 min | Una cosa per cui sono grato |
| Rituale di chiusura | 10 min | Sempre gli stessi gesti, nello stesso ordine: diventano il segnale per il sonno |
| Lavare i piatti | 15 min | Già nella v1 |

Dopo i turni di notte la routine della sera si sposta al momento di andare a dormire, qualunque sia l'orario.

### 2.5 Corpo

| Pratica | Area | Note |
|---|---|---|
| Bagno freddo / doccia fredda | Allenamento | Registrare temperatura acqua e minuti (facoltativo). Avviso: mai da solo in acque libere |
| Corsa | Allenamento | Punti per i minuti, non per il passo |
| Camminata dopo i pasti | Allenamento | 10 min |
| Allenamento forza / palestra | Allenamento | |
| Acqua: bere durante la giornata | Abitudini | Contatore bicchieri |

### 2.6 Focus e mente

| Pratica | Area | Note |
|---|---|---|
| Blocco di focus (25-90 min) | Progetti | Timer stile Pomodoro, con pausa programmata |
| Telefono in un'altra stanza durante il blocco | Progetti | Si spunta all'avvio del blocco |
| Lettura | Abitudini | Già nella v1: 20 min, versione minima 5 min |
| 10 minuti di noia (niente telefono, niente stimoli) | Abitudini | Pratica controintuitiva: dà spazio alla testa |
| Detox da dopamina (mezza giornata o un giorno senza social) | Sfida | Sfida settimanale facoltativa |
| Modalità creatore: creare invece di consumare | Progetti | Es. "20 minuti a fare, prima di 20 minuti a scorrere" |
| Spazio di lavoro dedicato | Ordine in casa | Stesso posto, stessa playlist: il cervello associa quel posto al focus |

### 2.7 Ambiente

| Pratica | Area | Note |
|---|---|---|
| Sistemare una stanza (15 min con timer) | Ordine in casa | Già nella v1. Il disordine visivo aumenta lo stress |
| Preparare l'ambiente per domani | Ordine in casa | Es. scarpe da corsa pronte, scrivania sgombra |
| Tempo nella natura | Allenamento | Montagna, mare, parco |

### 2.8 Alimentazione (solo pratiche generali)

| Pratica | Note |
|---|---|
| Un alimento fermentato al giorno | Yogurt, kefir, ecc. |
| Diario alimentare: cosa ho mangiato e come mi sono sentito dopo | Facoltativo, per trovare collegamenti tra cibo e umore |

> Nessun piano alimentare, nessuna restrizione e **nessun integratore** come task. Le parti della Bibbia su integratori e dosaggi restano fuori dall'app: se ne parla con un medico.

### 2.9 Meditazione e mindfulness (pratica quotidiana)

**Task fissa ogni giorno:** 10 minuti, versione minima 3 minuti. Fa parte delle abitudini quotidiane, come lettura e piatti, ed è già nella v1 (con un semplice timer).

Nelle fasi successive la pratica del giorno **ruota** tra queste meditazioni guidate, oppure la scelgo io:

| Meditazione | Durata | Quando è utile |
|---|---|---|
| Respiro consapevole: attenzione al respiro, quando la mente scappa la riporti | 5-10 min | sempre, è la base |
| Body scan: attenzione che scorre su tutto il corpo | 10 min | sera, o quando c'è tensione |
| L'osservatore: guardi pensieri ed emozioni da fuori, senza seguirli | 5-10 min | giorni di testa piena |
| Ricordi felici: rivivi con calma un ricordo bello | 5 min | quando l'umore è troppo basso per la mindfulness classica |
| Gentilezza amorevole: auguri il bene a te, a chi ami, a tutti | 10 min | giorni in cui ti critichi tanto |
| Yoga nidra (rilassamento profondo guidato) | 15-20 min | dopo un turno di notte o un doppio turno |
| Meditazione prima della visualizzazione | 5 min | stagione 5: prima regoli il corpo, poi visualizzi |

**Mindfulness nelle cose di tutti i giorni**, come side quest facoltative: lavare i piatti con attenzione piena, un caffè senza telefono, una camminata in cui ascolti solo i suoni.

Ogni meditazione guidata può avere un audio registrato da me. Nella fase iniziale basta il timer con un suono di inizio e uno di fine.

---

## 3. Il percorso: sei stagioni

La struttura in 6 moduli del Protocollo Insight diventa un **percorso a stagioni**, coerente con il principio "una variabile alla volta". Ogni stagione dura **4 settimane**, ha un tema, sblocca nuove pratiche e chiude con una sfida finale (il "boss" della stagione).

| Stagione | Tema | Pratiche che sblocca | Sfida finale |
|---|---|---|---|
| **1. Vedere** | Come funziona la mia testa: la realtà è filtrata | Intenzione del giorno, 3 vittorie, svuota la testa | 20 sere su 28 con le 3 vittorie |
| **2. Regolare** | Il sistema nervoso: prima calmarsi, poi cambiare | Kit SOS completo, respirazione, routine della sera | 5 minuti di respiro per 21 giorni |
| **3. Smontare** | Le credenze che mi frenano | Domande di riflessione (sezione 4) | Completare la scheda "La storia che mi racconto" |
| **4. Agire** | Abitudini e cambiamento comportamentale | Preparazione ambiente, blocchi di focus, versione minima | Nessuna abitudine saltata per due giorni di fila |
| **5. Allenare** | Strumenti: freddo, corpo, meditazione, visualizzazione | Bagno freddo, visualizzazione, noia, natura | 12 bagni freddi in 4 settimane |
| **6. Diventare** | Identità: chi sto diventando | Frasi identitarie, archivio delle prove, lettera al me di un anno fa | Rileggere le prove accumulate e riscrivere la mia frase identitaria |

Le stagioni sono sequenziali, ma posso rifare una stagione se sento che non l'ho consolidata. Le pratiche sbloccate restano disponibili anche dopo.

---

## 4. Domande di riflessione

Da usare come **diario guidato** nell'app (una domanda al giorno o a settimana, a seconda della stagione). Risposta libera, salvata in un archivio personale consultabile.

**Conoscersi**
- Cosa è più importante per me? Cosa mi preoccupa di più? (Dove le due liste si sovrappongono, ci sono i miei valori.)
- Cosa mi ricarica e cosa mi scarica? (lista aggiornabile)
- Come mi sento dopo aver passato del tempo con questa persona?

**Le credenze**
- Qual è la frase precisa che mi dico quando mi blocco?
- Era vera in un contesto che oggi non esiste più?
- Qual è il passo successivo credibile, un solo gradino sopra dove sono ora?
- Lavoro sui trigger, in 4 passi: cosa è successo, come mi ha fatto sentire, perché, cosa posso imparare.

**Paura e ansia**
- Qual è lo scenario peggiore? Posso farci pace? E qual è lo scenario migliore?
- Quello che sento è paura o eccitazione? Il corpo è lo stesso, il nome lo scelgo io.
- Quanto lontano posso arrivare? (invece di "quanto ci metterò")

**Obiettivi** (metodo WOOP)
- Cosa voglio? Come sarebbe averlo? Qual è l'ostacolo principale, dentro di me? Cosa faccio quando si presenta?

**Fiducia e identità**
- Elenca le prove: cosa ho già fatto che dimostra che posso farcela?
- Una frase su di me che inizia con il mio nome: "Stefano è uno che…"
- Descrivi il te di tra un anno. (Scritto a mano, se possibile, poi fotografato e caricato.)

---

## 5. Schede "Perché funziona"

Ogni pratica ha una scheda breve, mostrata la prima volta che la uso e consultabile in seguito. Esempi del tono (testi da scrivere con parole mie):

- **Sospiro fisiologico:** la doppia inspirazione riapre gli alveoli dei polmoni, la lunga espirazione rallenta il cuore. È il freno più veloce che il corpo abbia.
- **Camminata:** quando cammini in avanti, gli occhi si muovono da un lato all'altro senza che tu te ne accorga. Questo movimento abbassa l'attività dell'amigdala. È lo stesso principio di una terapia per il trauma.
- **Svuota la testa:** la mente rimugina perché cerca una chiusura. Scrivere i pensieri su carta gliela dà.
- **3 vittorie:** quello che elabori prima di dormire viene fissato con più forza nella memoria. Chiudere la giornata sulle vittorie cambia come la ricorderai.
- **Luce del mattino:** la luce negli occhi al risveglio regola l'orologio interno e prepara il sonno della sera dopo.
- **Bagno freddo:** allenare il corpo a restare calmo nello shock del freddo allena anche la testa a restare calma nello stress.
- **Versione minima:** l'azione imperfetta dà al cervello una prova. L'inazione non gliene dà nessuna.

**Funzione "Lo sapevi?":** dopo il completamento di una task, ogni tanto (a sorpresa) compare una curiosità breve legata alla pratica appena fatta.

---

## 5b. Dimensione spirituale (sezione facoltativa)

**Principio, dalla mia Bibbia:** la spiritualità non si elimina, si riposiziona con onestà. Se una pratica spirituale mi fa stare meglio, quel beneficio è reale, qualunque sia la spiegazione.

- Sezione **attivabile e disattivabile** dalle impostazioni.
- Ogni pratica ha **due letture affiancate**: "Cosa dice la scienza" e "Cosa dice la tradizione". Sono io a scegliere quale usare.

| Pratica | Come funziona nell'app | Lettura scientifica | Lettura spirituale |
|---|---|---|---|
| **Frase del mattino** (es. "Oggi sono pronto a essere sorpreso") | Mostrata al risveglio, scelta da me o a rotazione | Orienta l'attenzione selettiva della giornata | Apertura a ciò che la vita porta |
| **Fidarsi e lasciar andare** | "Cosa non posso controllare oggi?" Scrivo, poi tocco "Lascio andare" | Accettazione, come nella terapia ACT | Fiducia, abbandono |
| **"Quello è per me"** | Quando provo invidia, la trasformo in una direzione: "cosa mi mostra che voglio?" | Reframing dell'attenzione | Ciò che vedi negli altri è possibile anche per te |
| **Seminare prima di dormire** | Un'intenzione per domani, scritta la sera | Ciò che elabori prima del sonno si consolida | Piantare semi |
| **Trovare un significato** | Dopo una giornata difficile: "Cosa mi sta insegnando?" | Dare senso agli eventi avversi aumenta la resilienza | Tutto ha una ragione |
| **Il me migliore esiste già** | Visualizzazione guidata della persona che sto diventando | È un percorso neurale da attivare con la ripetizione | Il sé più alto |
| **Gratitudine prima del pasto** | Promemoria facoltativo a pranzo o cena | Presenza e mangiare consapevole | Ringraziamento |
| **Il meglio è probabile quanto il peggio** | Quando vado allo scenario peggiore, l'app mi chiede anche il migliore | Bilancia il bias negativo del cervello | Fiducia |

**"La mia pratica personale":** spazio libero dove aggiungo pratiche mie (es. preghiera, Human Design, astrologia, rituali), senza spiegazioni preimpostate.

---

## 6. Sfide settimanali (esempi)

- 4 allenamenti questa settimana
- 5 sere con le 3 vittorie
- Bagno freddo 2 volte
- 3 blocchi di focus da 25 minuti
- Un pomeriggio senza social
- 7 giorni di lettura, anche nella versione minima
- Una nuova pratica dalla libreria, provata almeno 3 volte

---

## 7. Libreria di lettura (per la task "Lettura")

Elenco facoltativo da cui scegliere il libro del momento, con avanzamento in pagine o capitoli:

1. *Come nascono le emozioni* — Lisa Feldman Barrett
2. *Il corpo accusa il colpo* — Bessel van der Kolk
3. *Intelligenza emotiva* — Daniel Goleman
4. *Atomic Habits* — James Clear
5. *Behave* — Robert Sapolsky
6. *Rethinking Positive Thinking* — Gabriele Oettingen
7. *Altered Traits* — Daniel Goleman e Richard Davidson
8. *Waking the Tiger* — Peter Levine

---

## 8. Cosa resta fuori dall'app

Dalla Bibbia **non** entrano nell'app:

- script dei reel, caption, filoni per i contenuti social e regole stilistiche;
- roadmap di monetizzazione e prodotti da vendere;
- filoni AI, onde cerebrali, 432 Hz, Gateway Process;
- integratori e dosaggi;
- le spiegazioni "energetiche" presentate come scienza (le pratiche spirituali invece entrano, nella sezione 5b);
- strumenti con validità debole o poco utili per me (MBTI, linguaggi dell'amore, ciclo ormonale femminile).

**Nota:** nella Bibbia mancano le analisi delle lezioni 2, 3 e 4 del corso. Quando le aggiungerò, questo modulo andrà aggiornato.

---

## 9. Dove si colloca nella roadmap

Questo modulo arriva **dopo** la v1 e la sezione Turni (Fasi 1-2 del documento di progetto). Proposta:

- **Fase 2b:** Kit SOS e pratiche di respirazione (le più utili subito).
- **Fase 6:** percorso a stagioni, domande di riflessione, schede "Perché funziona", libreria di lettura.

Il modello dati va preparato fin dalla v1 per supportare: pratiche con versione minima, archivio delle prove, diario di riflessione e stagioni sbloccabili.
