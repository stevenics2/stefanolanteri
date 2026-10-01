# Tally Room Reviews

Web app in stile booking per recensire le **tally room** delle navi.
Gira interamente sul piano gratuito di Cloudflare (Pages + D1 + R2).

## Cosa fa
- Cerca una nave per nome; se non c'è, la aggiungi.
- Voto a stelle, spunte comfort (220V, clima, sedie, tavolo, pulizia, luci, Wi-Fi, bagno), note e fino a 3 foto.
- **Aggiorna la scheda**: ogni nuovo invio è un aggiornamento con data. La scheda mostra voto e comfort calcolati sulle **ultime 5 recensioni**, quindi una stanza che peggiora si vede subito. Lo storico resta consultabile.
- Recensioni **anonime**, pubblicate solo dopo **approvazione manuale** in `/admin`.
- Le navi della tua lista (nome + voto) si importano da `/admin`. Il voto importato vale finché non arriva la prima recensione.
- Anti-spam: campo nascosto per i bot e massimo 5 invii all'ora per connessione. Pulsante "Segnala" su ogni recensione.
- Le foto vengono ridotte sul telefono (circa 200-300 KB) prima dell'invio, così lo spazio gratuito dura a lungo.

## Pubblicazione (una tantum, circa 15 minuti)
Serve un account Cloudflare gratuito e Node.js.

```bash
cd tallyroom
npm install
npx wrangler login

# 1. database
npx wrangler d1 create tallyroom          # copia il database_id in wrangler.toml
npm run db:remote                         # crea le tabelle

# 2. spazio foto
npx wrangler r2 bucket create tallyroom-photos

# 3. pubblica il sito
npx wrangler pages project create tally-room --production-branch main
npx wrangler pages deploy public --project-name tally-room

# 4. segreti (password admin e sale per l'hash degli IP)
npx wrangler pages secret put ADMIN_PASSWORD --project-name tally-room
npx wrangler pages secret put SALT --project-name tally-room
```

Il sito sarà su `https://tally-room.pages.dev`. Gli stessi binding D1 e R2 sono letti da `wrangler.toml`.
Se il deploy non li collega, aggiungili da dashboard: Pages > tally-room > Settings > Bindings (DB = tallyroom, PHOTOS = tallyroom-photos).

Poi apri `/admin`, entra con la password e incolla la tua lista navi (`nome;voto`, vedi `ships-example.csv`).

## Sviluppo in locale
```bash
npm install
npm run db:local
npm run dev        # http://localhost:8788  (admin: password "admin", da .dev.vars)
```
Crea un file `.dev.vars` con `ADMIN_PASSWORD=...` e `SALT=...`. Non viene committato.

## Limiti del piano gratuito (indicativi)
D1 5 GB, R2 10 GB senza costi di traffico, 100.000 richieste al giorno alle funzioni. Largamente sufficienti per uso di categoria.

## Struttura
- `public/` frontend statico (`index.html`, `app.js`, `admin.html`, `admin.js`)
- `functions/api/[[path]].js` API
- `schema.sql` tabelle del database
