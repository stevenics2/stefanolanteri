import SonnoCard from "../components/SonnoCard";

export default function Pagina() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Oggi</h1>
      <SonnoCard />
      <p className="text-muted">Qui vedrai anche le task del giorno, i punti e le serie.</p>
    </section>
  );
}
