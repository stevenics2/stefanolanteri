import {
  Activity, Bike, BellRing, BookOpen, Brain, Briefcase, CalendarDays, Car, CookingPot, Dumbbell, Flower2, Footprints, GlassWater, House,
  PenLine, PersonStanding, Repeat, ShoppingCart, Smile, Snowflake, Sparkles, Stethoscope, Target, UtensilsCrossed, Waves, WashingMachine, Wind,
  type LucideIcon,
} from "lucide-react";
import type { Task } from "@/lib/tipi";

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
  yoga: PersonStanding,
  // abitudini e casa
  libro: BookOpen,
  loto: Flower2,
  piatti: UtensilsCrossed,
  pulizia: Sparkles,
  acqua: GlassWater,
  respiro: Wind,
  diario: PenLine,
  cucina: CookingPot,
  spesa: ShoppingCart,
  lavatrice: WashingMachine,
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

// Quale icona dare a una task: quella scelta a mano; altrimenti, da cosa è la task (libro per la lettura, fiore di loto per
// la meditazione...), riconosciuta dal nome; altrimenti quella dell'area.
const PAROLE: [RegExp, string][] = [
  [/lettur|leggi|libro/i, "libro"],
  [/medit|mindful/i, "loto"],
  [/piatti|stoviglie/i, "piatti"],
  [/stanza|pulis|pulizi|ordin|riordin|aspira|spolver/i, "pulizia"],
  [/lavatrice|bucato/i, "lavatrice"],
  [/cucin|cena|pranzo|colazione/i, "cucina"],
  [/spesa/i, "spesa"],
  [/acqua|bere|bicchier/i, "acqua"],
  [/respir|sospiro|breath/i, "respiro"],
  [/diario|scriv|vittorie|gratitudine|svuota/i, "diario"],
  [/corsa|corri|running/i, "corsa"],
  [/camminat|passeggiat/i, "camminata"],
  [/palestra|pesi|forza|allenament/i, "palestra"],
  [/doccia fredda|bagno freddo|freddo/i, "freddo"],
  [/stretching|mobilit/i, "stretching"],
  [/yoga/i, "yoga"],
];

export function iconaTask(task: Pick<Task, "titolo" | "icona" | "tipo">, iconaArea: string): string {
  if (task.icona) return task.icona;
  if (task.tipo === "stanza") return "pulizia";
  return PAROLE.find(([re]) => re.test(task.titolo))?.[1] ?? iconaArea;
}
