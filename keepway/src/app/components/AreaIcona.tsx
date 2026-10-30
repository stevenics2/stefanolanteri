import {
  Activity, Bike, BellRing, Brain, Briefcase, CalendarDays, Car, Dumbbell, Flower2, Footprints, House, Repeat, Smile, Snowflake,
  Stethoscope, Target, Waves, type LucideIcon,
} from "lucide-react";

// Le icone delle aree. Nei dati si salva solo la chiave ("dumbbell", "casa"...).
export const MAPPA: Record<string, LucideIcon> = {
  // aree
  dumbbell: Dumbbell,
  target: Target,
  casa: House,
  ripeti: Repeat,
  // allenamenti
  corsa: Footprints,
  camminata: Footprints,
  palestra: Dumbbell,
  freddo: Snowflake,
  bici: Bike,
  nuoto: Waves,
  stretching: Activity,
  yoga: Flower2,
  // appuntamenti e promemoria
  dottore: Stethoscope,
  dentista: Smile,
  psicologa: Brain,
  lavoro: Briefcase,
  auto: Car,
  calendario: CalendarDays,
  promemoria: BellRing,
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
