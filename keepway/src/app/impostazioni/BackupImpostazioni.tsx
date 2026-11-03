"use client";

import { Archive, Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { creaBackup, leggiBackup, ripristinaBackup, segnaBackupFatto, ultimoBackup, type Backup, type RiepilogoBackup } from "@/lib/backup";
import { dataEuropea, dataOraEuropea } from "@/lib/date";

// Backup e ripristino: tutto Keepway in un file, da tenere al sicuro (iCloud Drive, Note, email a te stesso).
export default function BackupImpostazioni() {
  const [ultimo, setUltimo] = useState<number | null>(() => ultimoBackup());
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [proposta, setProposta] = useState<{ backup: Backup; riepilogo: RiepilogoBackup } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const esporta = async () => {
    const { testo, nome } = creaBackup();
    const f = new File([testo], nome, { type: "application/json" });
    try {
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: "Backup Keepway" }); // foglio di condivisione: «Salva su File», AirDrop, Note...
      } else {
        const url = URL.createObjectURL(f);
        const a = document.createElement("a");
        a.href = url;
        a.download = nome;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      segnaBackupFatto();
      setUltimo(Date.now());
      setMessaggio("Backup creato. Tienilo in un posto sicuro: dentro ci sono i tuoi dati e il tuo codice personale della Salute.");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMessaggio("Non sono riuscito a creare il file. Riprova.");
    }
  };

  const scelto = async (f: File | undefined) => {
    if (!f) return;
    const esito = leggiBackup(await f.text());
    if (!esito.ok) {
      setProposta(null);
      setMessaggio(esito.errore);
    } else {
      setMessaggio(null);
      setProposta({ backup: esito.backup, riepilogo: esito.riepilogo });
    }
    if (file.current) file.current.value = "";
  };

  const r = proposta?.riepilogo;
  return (
    <div id="backup" className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Archive size={15} /> Backup</h2>
      <div className="space-y-3 rounded-2xl bg-card p-4">
        <p className="text-sm text-muted">Tutto quello che hai in Keepway (task, serie, punti, impostazioni) in un solo file. Se cambi telefono o cancelli l&apos;app, lo rimetti da qui e non perdi niente.</p>
        <p className="text-xs text-muted">{ultimo ? `Ultimo backup: ${dataOraEuropea(ultimo)}` : "Non hai ancora fatto nessun backup."}</p>
        <div className="flex flex-wrap gap-2">
          <button data-suono="via" onClick={esporta} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-black">
            <Download size={16} /> Crea backup
          </button>
          <button data-suono="via" onClick={() => file.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-ov/10 px-4 py-2 text-sm font-semibold">
            <Upload size={16} /> Ripristina da file
          </button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void scelto(e.target.files?.[0])} />
        </div>
        {messaggio && <p className="text-sm text-amber-300">{messaggio}</p>}
        {proposta && r && (
          <div className="space-y-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm">
            <div className="font-semibold">Questo backup contiene:</div>
            <ul className="space-y-0.5 text-muted">
              <li>{r.task} task e {r.completamenti} completamenti{r.primo && r.ultimo ? ` (dal ${dataEuropea(r.primo)} al ${dataEuropea(r.ultimo)})` : ""}</li>
              <li>creato il {dataOraEuropea(Date.parse(r.creato))}</li>
            </ul>
            <p className="text-xs text-amber-200">Rimettendolo, i dati di questo telefono vengono sostituiti da quelli del file. Prima ne tengo una copia di sicurezza.</p>
            <div className="flex gap-2">
              <button data-suono="via" onClick={() => { try { ripristinaBackup(proposta.backup); } catch (e) { setMessaggio((e as Error).message); setProposta(null); } }} className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-black">Ripristina</button>
              <button data-suono="indietro" onClick={() => setProposta(null)} className="rounded-full bg-ov/10 px-4 py-1.5 text-sm">Annulla</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
