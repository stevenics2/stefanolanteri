// Segnaposto per le schermate non ancora costruite.
export default function Placeholder({ titolo, nota }: { titolo: string; nota: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold">{titolo}</h1>
      <p className="mt-2 text-muted">{nota}</p>
    </section>
  );
}
