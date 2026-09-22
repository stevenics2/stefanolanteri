# Vento Trieste

Webapp statica (HTML/CSS/JS puro, nessun backend, nessuna build) che mostra in tempo
reale la velocità del vento a Trieste, il picco massimo giornaliero con orario, il
meteo attuale con temperatura e la previsione delle ore successive. Il design
richiama la città (alabarda stilizzata nel logo, blu del mare del Golfo, rosso
d'allerta per la bora forte).

## Fonti dati e perché queste

- **[Open-Meteo](https://open-meteo.com)** — meteo attuale, temperatura, icona
  meteo e previsione oraria. API gratuita, senza chiave, con CORS abilitato:
  affidabile per l'uso diretto da browser. Licenza CC BY 4.0 (attribuzione in
  pagina).
- **[Open Data FVG — "Meteo, dati delle stazioni regionali"](https://www.dati.friuliveneziagiulia.it/Ambiente/Meteo-dati-delle-stazioni-regionali/4wxn-35av)**
  — dati delle stazioni anemometriche cittadine (Molo Fratelli Bandiera, Sgonico,
  Piattaforma Paloma, ecc.), presi dal portale Open Data della Regione
  (formato Socrata), **licenza IODL 2.0**: riuso esplicitamente consentito,
  a differenza del feed "grezzo" di meteo.fvg.it.

**Perché non meteo.fvg.it direttamente**: il portale ufficiale OSMER/ARPA FVG
pubblica sì i dati delle stazioni ogni 15 minuti, ma le condizioni d'uso
riportate vietano la ripubblicazione dei dati in tempo reale prima di 24 ore
dal riferimento, salvo accordi specifici con il titolare dei dati. Per questo
l'app usa invece il dataset Open Data (stesso dato di origine, ma con licenza
di riuso esplicita).

## Limite noto: schema del dataset FVG non verificato in questa sessione

Il sandbox in cui è stata sviluppata questa app non ha accesso di rete verso
domini esterni (policy dell'ambiente), quindi non è stato possibile interrogare
dal vivo l'endpoint `dati.friuliveneziagiulia.it` per leggere i nomi esatti
delle colonne. L'app quindi:

1. al primo caricamento fa una query di "assaggio" (`$limit=5`) e **rileva
   euristicamente** i campi (nome stazione, data/ora, velocità, raffica,
   direzione, temperatura) cercando pattern tipici nei nomi delle colonne
   (`app.js`, funzione `detectField`);
2. **assume che il vento sia espresso in m/s** (standard delle reti
   meteorologiche regionali) e lo converte in km/h, a meno che il nome del
   campo non contenga esplicitamente "kmh"/"km_h";
3. se il rilevamento fallisce o il portale non risponde, mostra comunque i
   dati generali Open-Meteo per Trieste, con un avviso in pagina — l'app non
   resta mai vuota.

**Prima di considerarla definitiva**, apri l'app in un browser normale (qui
funziona, il blocco di rete è solo del sandbox di sviluppo) e controlla la
sezione "Stazioni in città": se i numeri sembrano sballati (es. raffiche a
200+ km/h in una giornata normale), è quasi certo un problema di unità — apri
`app.js`, cerca `FVG_ASSUME_MS` e mettilo a `false`. Se le stazioni restano
vuote con l'avviso di errore, apri la console del browser (F12): il messaggio
d'errore dice se è un problema di CORS, di schema non riconosciuto o di rete.

## Struttura

- `index.html` — struttura pagina.
- `style.css` — stile (palette validata per accessibilità/daltonismo per i
  colori-dato; blu mare e rosso alabarda per l'identità grafica; dark mode
  automatica + interruttore manuale).
- `app.js` — fetch dati, euristica di rilevamento schema, rendering.

## Uso e deploy

Nessuna build richiesta:

- **Locale**: apri `index.html` in un browser (o servilo con un server
  statico qualsiasi, es. `python3 -m http.server`).
- **GitHub Pages / Netlify / Vercel**: pubblica la cartella `trieste-vento/`
  così com'è.

L'app aggiorna i dati automaticamente ogni 10 minuti.

## Possibili estensioni future

- Grafico storico delle ultime 24h per stazione (oggi si mostra solo il
  picco puntuale).
- Notifiche push/browser quando la raffica supera una soglia impostabile.
- Mappa con le stazioni geolocalizzate invece della lista a card.
