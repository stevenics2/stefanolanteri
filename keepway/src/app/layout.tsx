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
      <body className="min-h-full flex flex-col">
        {/* pb extra: spazio per la barra in basso e la safe area dell'iPhone */}
        <Providers>
          <main className="flex-1 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
