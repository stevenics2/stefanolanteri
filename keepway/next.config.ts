import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sito statico: si genera la cartella `out/` e si pubblica su Cloudflare Pages.
  output: "export",
  trailingSlash: true, // /oggi/ -> oggi/index.html, funziona su qualunque hosting statico
  // Niente cache su disco di Turbopack: Cloudflare ricarica la cache della build precedente e, se è danneggiata, la build si schianta
  // («range start index … out of range», «Failed to restore Data for task»). Il sito è piccolo, senza cache la build dura pochi secondi in più.
  experimental: { turbopackFileSystemCacheForBuild: false },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
