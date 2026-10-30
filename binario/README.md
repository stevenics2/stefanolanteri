# Binario

Webapp personale (PWA) per portare nella vita di tutti i giorni la struttura del lavoro in porto.
Documenti di progetto in `docs/`.

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # controllo di produzione
```

Stack: Next.js (App Router) + TypeScript + Tailwind. Backend (Supabase) in arrivo.

## Pubblicazione (Cloudflare Pages)

Il sito è statico (`output: "export"`): `npm run build` crea la cartella `out/`.

- Repo: `stefanolanteri`, branch di produzione `insightbinary`, root directory `binario`.
- Build command: `npm run build`. Build output directory: `out`.
- Variabile d'ambiente: `NODE_VERSION=22` (c'è anche `.node-version`).
