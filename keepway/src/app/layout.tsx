import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "./components/BottomNav";
import Providers from "./components/Providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Keepway",
  description: "La struttura del porto, anche fuori dal porto.",
  appleWebApp: { capable: true, title: "Keepway", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/192.png", apple: "/icons/180.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // usa tutto lo schermo, notch compreso
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${geistSans.variable} h-full antialiased`}>
      {/* Il body è sempre un po' più alto dello schermo (vedi globals.css): su iPhone la barra fissa in basso sta al bordo
          solo se la pagina può scorrere, anche di poco, e con una pagina corta (es. Recap) altrimenti si alza. */}
      <head>
        {/* Il tema si applica prima del primo disegno, così non c'è il lampo scuro quando scegli il chiaro */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('keepway-tema')==='chiaro')document.documentElement.dataset.tema='chiaro'}catch(e){}" }} />
      </head>
      <body className="flex flex-col">
        <Providers>
          <main className="flex-1 px-4 pb-28 pt-[var(--pt-pagina)]">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
