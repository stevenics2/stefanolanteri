"use client";

import { CalendarDays, ListChecks, Settings, Sun, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Le 5 schermate dell'app, nell'ordine in cui compaiono in basso.
const voci = [
  { href: "/oggi", etichetta: "Oggi", Icona: Sun },
  { href: "/task", etichetta: "Task", Icona: ListChecks },
  { href: "/turni", etichetta: "Turni", Icona: CalendarDays },
  { href: "/progressi", etichetta: "Progressi", Icona: TrendingUp },
  { href: "/impostazioni", etichetta: "Impostazioni", Icona: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {voci.map(({ href, etichetta, Icona }) => {
          const attiva = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${attiva ? "text-accent" : "text-muted"}`}
              >
                <Icona size={22} strokeWidth={attiva ? 2.2 : 1.7} />
                {etichetta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
