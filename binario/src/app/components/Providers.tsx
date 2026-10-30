"use client";

import { StoreProvider } from "@/lib/store";
import Ricompense from "./Ricompense";
import TimerSchermo from "./TimerSchermo";

// Tutto ciò che deve vivere sopra ogni schermata: dati, timer e ricompense.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
      <TimerSchermo />
      <Ricompense />
    </StoreProvider>
  );
}
