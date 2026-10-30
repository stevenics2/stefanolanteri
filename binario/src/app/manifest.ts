import type { MetadataRoute } from "next";

// Rende l'app installabile ("Aggiungi a Home") su iPhone e Android.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Binario",
    short_name: "Binario",
    description: "La struttura del porto, anche fuori dal porto.",
    lang: "it",
    start_url: "/oggi",
    display: "standalone",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
