# Guida: aggiornare e pubblicare stefanolanteri.it

## Come è fatto
Sito statico: solo file `index.html`, `style.css`, `privacy.html` e le cartelle `fonts/` e `img/`. Nessun database, nessun programma da installare, nulla che si possa rompere con un aggiornamento.

## Cosa modifichi e dove
| Cosa | Dove |
|---|---|
| Testi | `index.html`, tra i tag `<p>` e `<h2>` |
| Link social | `index.html`, cerca `instagram.com` e `youtube.com` |
| Email | `index.html` e `privacy.html`, cerca `EMAIL@DA-INSERIRE.it` |
| Foto | metti `img/stefano.jpg` e segui il commento nell'hero |
| Colori | `style.css`, blocco `:root` in alto |
| Parola evidenziata in teal | racchiudila in `<span class="ev">...</span>` |

Passare a @stefanolanteri: basta sostituire `stevensinsight` con `stefanolanteri` nei link di Instagram.

## Hosting consigliato: Cloudflare Pages (gratis)
1. Crea un account su cloudflare.com.
2. Workers & Pages, Create, Pages, Connect to Git, scegli il repository.
3. Build command: lascia vuoto. Build output directory: `sito`.
4. Deploy. Ogni volta che aggiorni i file su GitHub, il sito si aggiorna da solo.

## Collegare stefanolanteri.it (DNS)
Il metodo più semplice è spostare la gestione DNS su Cloudflare.
1. In Cloudflare: Add a site, inserisci `stefanolanteri.it`, piano Free.
2. Cloudflare ti dà due nameserver (es. `xxx.ns.cloudflare.com`).
3. Dal pannello del registrar dove hai comprato il dominio, sostituisci i nameserver con quelli di Cloudflare. La propagazione richiede da pochi minuti a qualche ora.
4. In Pages, scheda Custom domains, aggiungi `stefanolanteri.it` e `www.stefanolanteri.it`. Cloudflare crea i record da solo e attiva l'HTTPS.

## stevensinsight.com
Tienilo e fai un redirect verso stefanolanteri.it, così i vecchi link continuano a funzionare.
1. Aggiungi anche `stevensinsight.com` a Cloudflare come sopra.
2. Rules, Redirect Rules, nuova regola: se hostname è `stevensinsight.com` (e `www.`), reindirizza a `https://stefanolanteri.it` con codice 301.
3. Nel DNS serve un record A `@` verso `192.0.2.1`, con nuvoletta arancione (proxied), solo per far passare il traffico dal redirect.

## Prima di pubblicare
- [ ] Sostituire `EMAIL@DA-INSERIRE.it`
- [ ] Aggiungere la foto
- [ ] Indicare il fornitore di hosting nella privacy policy
- [ ] Far rivedere la privacy policy a chi di dovere (è una bozza)
