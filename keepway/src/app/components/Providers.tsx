"use client";

import { StoreProvider } from "@/lib/store";
import AvvisoAnnulla from "./AvvisoAnnulla";
import FeedbackTocco from "./FeedbackTocco";
import FestaOverlay from "./FestaOverlay";
import RecapFlash from "./RecapFlash";
import Ricompense from "./Ricompense";
import TemaApplicato from "./TemaApplicato";
import SincronizzaNotifiche from "./SincronizzaNotifiche";
import SincronizzaSalute from "./SincronizzaSalute";
import AvvisoSalute from "./AvvisoSalute";
import Benvenuto from "./Benvenuto";
import SbloccaTraguardi from "./SbloccaTraguardi";
import TimerSchermo from "./TimerSchermo";

// Tutto ciò che deve vivere sopra ogni schermata: dati, timer e ricompense.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
      <TimerSchermo />
      <Ricompense />
      <AvvisoAnnulla />
      <RecapFlash />
      <FestaOverlay />
      <FeedbackTocco />
      <TemaApplicato />
      <SincronizzaNotifiche />
      <SincronizzaSalute />
      <Benvenuto />
      <AvvisoSalute />
      <SbloccaTraguardi />
    </StoreProvider>
  );
}
