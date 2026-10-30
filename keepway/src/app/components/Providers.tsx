"use client";

import { StoreProvider } from "@/lib/store";
import AvvisoAnnulla from "./AvvisoAnnulla";
import FeedbackTocco from "./FeedbackTocco";
import Ricompense from "./Ricompense";
import SincronizzaNotifiche from "./SincronizzaNotifiche";
import TimerSchermo from "./TimerSchermo";

// Tutto ciò che deve vivere sopra ogni schermata: dati, timer e ricompense.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
      <TimerSchermo />
      <Ricompense />
      <AvvisoAnnulla />
      <FeedbackTocco />
      <SincronizzaNotifiche />
    </StoreProvider>
  );
}
