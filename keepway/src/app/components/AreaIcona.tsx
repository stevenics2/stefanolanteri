import { Dumbbell, House, Repeat, Target, type LucideIcon } from "lucide-react";

// Le icone delle aree. Nei dati si salva solo la chiave ("dumbbell", "casa"...).
const MAPPA: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  target: Target,
  casa: House,
  ripeti: Repeat,
};

// Icona dentro un riquadro arrotondato del colore dell'area.
export default function AreaIcona({ nome, colore, size = 18, badge = true }: { nome: string; colore: string; size?: number; badge?: boolean }) {
  const Icona = MAPPA[nome] ?? Repeat;
  if (!badge) return <Icona size={size} color={colore} strokeWidth={1.8} />;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size * 1.9, height: size * 1.9, background: `${colore}26` }}
    >
      <Icona size={size} color={colore} strokeWidth={1.8} />
    </span>
  );
}
