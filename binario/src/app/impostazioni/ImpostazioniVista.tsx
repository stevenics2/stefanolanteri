"use client";

import { useStore } from "@/lib/store";

export default function ImpostazioniVista() {
  const { pronto, stato, impostazioni, setFrase, azzera } = useStore();
  if (!pronto) return null;

  const esporta = () => {
    const blob = new Blob([JSON.stringify(stato, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "binario-dati.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const riga = "flex items-center justify-between rounded-2xl bg-card p-4";
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">Impostazioni</h1>

      <div className="space-y-2">
        <label className={riga}>
          <span>Suoni</span>
          <input type="checkbox" className="h-5 w-5" checked={stato.impostazioni.suoni} onChange={(e) => impostazioni({ suoni: e.target.checked })} />
        </label>
        <label className={riga}>
          <span>Animazioni e coriandoli</span>
          <input type="checkbox" className="h-5 w-5" checked={stato.impostazioni.animazioni} onChange={(e) => impostazioni({ animazioni: e.target.checked })} />
        </label>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">La persona che vuoi diventare</h2>
        <p className="text-sm text-muted">Una frase per area: compare ogni volta che completi una task di quell&apos;area.</p>
        {stato.aree.map((a) => (
          <label key={a.id} className="block text-sm text-muted">
            {a.icona} {a.nome}
            <input
              value={a.frase}
              onChange={(e) => setFrase(a.id, e.target.value)}
              className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-foreground outline-none"
            />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">I tuoi dati</h2>
        <p className="text-sm text-muted">Per ora i dati restano su questo telefono. Con gli account arriverà il salvataggio online.</p>
        <button onClick={esporta} className="w-full rounded-2xl bg-white/10 py-3">Esporta i dati (JSON)</button>
        <button
          onClick={() => confirm("Cancellare tutto e ripartire da zero?") && azzera()}
          className="w-full rounded-2xl bg-red-500/15 py-3 text-red-300"
        >
          Cancella tutti i dati
        </button>
      </div>
    </section>
  );
}
