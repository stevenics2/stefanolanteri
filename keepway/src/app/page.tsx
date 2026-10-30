"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// La home dell'app è la schermata "Oggi".
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/oggi/");
  }, [router]);
  return null;
}
