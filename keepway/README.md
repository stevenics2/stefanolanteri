# Keepway

Webapp personale (PWA) per portare nella vita di tutti i giorni la struttura del lavoro in porto.
Documenti di progetto in `docs/`.

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # controllo di produzione
```

Stack: Next.js (App Router) + TypeScript + Tailwind. Backend (Supabase) in arrivo.

## Pubblicazione (Cloudflare)

Il sito è statico (`output: "export"`): `npm run build` crea la cartella `out/`, che `wrangler.jsonc` pubblica.

- Repo `stefanolanteri`, production branch `insightbinary`, Path (root directory) `keepway`.
- Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
- Il nome del progetto su Cloudflare deve essere `keepway` (come in `wrangler.jsonc`).
- Node 22 (file `.node-version`).
