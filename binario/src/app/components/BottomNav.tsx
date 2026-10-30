"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Le 5 schermate dell'app, nell'ordine in cui compaiono in basso.
const voci = [
  { href: "/oggi", etichetta: "Oggi", icona: "☀️" },
  { href: "/task", etichetta: "Task", icona: "✅" },
  { href: "/turni", etichetta: "Turni", icona: "🗓️" },
  { href: "/progressi", etichetta: "Progressi", icona: "📈" },
  { href: "/impostazioni", etichetta: "Impostazioni", icona: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {voci.map((v) => {
          const attiva = pathname.startsWith(v.href);
          return (
            <li key={v.href} className="flex-1">
              <Link
                href={v.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  attiva ? "text-accent" : "text-muted"
                }`}
              >
                <span className="text-xl leading-none">{v.icona}</span>
                {v.etichetta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
