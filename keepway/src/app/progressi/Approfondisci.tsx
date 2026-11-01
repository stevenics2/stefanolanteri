"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

// Le spiegazioni lunghe stanno qui: una tendina chiusa, per occupare poco spazio.
export default function Approfondisci({ children, etichetta = "Approfondisci" }: { children: React.ReactNode; etichetta?: string }) {
  const [aperta, setAperta] = useState(false);
  return (
    <div className="mt-2">
      <button data-suono="nessuno" onClick={() => setAperta((a) => !a)} aria-expanded={aperta} className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
        {etichetta} <ChevronDown size={14} className="transition-transform duration-300" style={{ transform: aperta ? "rotate(180deg)" : undefined }} />
      </button>
      <div className="tendina" data-aperta={aperta}>
        <div>
          <div className="space-y-1.5 pt-2 text-[11px] leading-relaxed text-muted">{children}</div>
        </div>
      </div>
    </div>
  );
}
