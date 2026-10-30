import { ImageResponse } from "next/og";

// Icona provvisoria: una "B" gialla su fondo scuro. Si sostituisce quando abbiamo il logo vero.
export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const px = Math.min(Math.max(parseInt(size, 10) || 192, 48), 1024);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f14",
          color: "#f5a524",
          fontSize: px * 0.62,
          fontWeight: 800,
        }}
      >
        B
      </div>
    ),
    { width: px, height: px },
  );
}
