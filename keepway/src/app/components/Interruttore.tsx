"use client";

// L'interruttore di iOS: la pallina scorre con una molla e si allunga un po' mentre la tocchi.
export default function Interr({ valore, onChange, aria }: { valore: boolean; onChange: (v: boolean) => void; aria?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valore}
      aria-label={aria}
      data-suono="via"
      onClick={() => onChange(!valore)}
      className={`switch relative h-[31px] w-[51px] shrink-0 rounded-full ${valore ? "bg-emerald-500" : "bg-ov/20"}`}
      style={{ transition: "background-color 0.3s ease" }}
    >
      <span className="switch-pallina absolute left-[2px] top-[2px] block h-[27px] w-[27px] rounded-full bg-white shadow-md" style={{ transform: valore ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  );
}
