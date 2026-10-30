import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sito statico: si genera la cartella `out/` e si pubblica su Cloudflare Pages.
  output: "export",
  trailingSlash: true, // /oggi/ -> oggi/index.html, funziona su qualunque hosting statico
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
