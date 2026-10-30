import type { Modifica } from "@/lib/tipi";

// La striscia colorata sotto il turno modificato.
export function bandaDi(m: Modifica | undefined): { testo: string; classe: string } | null {
  if (!m) return null;
  if (m.tipo === "straordinario") return { testo: "ORE DI STRAORDINARIO", classe: "bg-violet-600" };
  if (m.tipo === "cambio_azienda") return { testo: "CAMBIO TURNO PAGATO DA AZIENDA", classe: "bg-emerald-600" };
  if (m.tipo === "cambio_personale") return { testo: "CAMBIO TURNO PERSONALE", classe: "bg-slate-600" };
  return null;
}

export function Banda({ m }: { m: Modifica | undefined }) {
  const b = bandaDi(m);
  if (!b) return null;
  return <div className={`${b.classe} px-3 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-wide text-white`}>{b.testo}</div>;
}
