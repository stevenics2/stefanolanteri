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
      {/* Struttura "a schermo": alta quanto lo schermo, il contenuto scorre sopra e la barra in basso resta sempre lì,
          anche quando la pagina è corta (un elemento "fisso" su iPhone a volte si sposta). */}
      <body className="flex h-dvh flex-col overflow-hidden">
        <Providers>
          <main className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-[var(--pt-pagina)]">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
