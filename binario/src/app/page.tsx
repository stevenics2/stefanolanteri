import { redirect } from "next/navigation";

// La home dell'app è la schermata "Oggi".
export default function Home() {
  redirect("/oggi");
}
