"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Quando cambi schermata la nuova entra con una dissolvenza e una piccola salita, non di colpo.
export default function TransizionePagina({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="pagina-dentro">
      {children}
    </div>
  );
}
