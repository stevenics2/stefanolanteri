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
  const indice = voci.findIndex((v) => pathname.startsWith(v.href));
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-ov/10 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {/* La barretta gialla sopra la voce attiva scivola da una voce all'altra */}
      {indice >= 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-px left-0 flex justify-center"
          style={{ width: `${100 / voci.length}%`, transform: `translateX(${indice * 100}%)`, transition: "transform 0.55s var(--molla)" }}
        >
          <span className="h-[3px] w-9 rounded-full bg-accent shadow-[0_0_10px_1px_var(--accent)]" />
        </span>
      )}
      <ul className="flex">
        {voci.map(({ href, etichetta, Icona }) => {
          const attiva = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors duration-300 ${attiva ? "text-accent" : "text-muted"}`}>
                <span className="inline-flex" style={{ transform: attiva ? "translateY(-1px) scale(1.14)" : "none", transition: "transform 0.5s var(--molla)" }}>
                  <Icona size={22} strokeWidth={attiva ? 2.2 : 1.7} />
                </span>
                {etichetta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
