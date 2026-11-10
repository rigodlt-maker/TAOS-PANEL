import { ejecutarTick } from "@/lib/despertador";
import { esDemo } from "@/lib/demo";
import { origenCanonico, verificarTick } from "@/lib/tick-firma";

export const dynamic = "force-dynamic";

const SIN_CACHE = { "Cache-Control": "no-store" };

// S14: el despertador ya no se puede llamar abierto. Solo POST firmado por el servidor de TAOS (ver lib/tick-firma.ts).
export function GET() {
  return new Response(null, { status: 405, headers: { ...SIN_CACHE, Allow: "POST" } });
}

export async function POST(req: Request) {
  if (esDemo()) return Response.json({ ok: true, demo: true }, { headers: SIN_CACHE });
  // Antes de leer nada tuyo: firma, hora, turno y destinatario (esta instalación)
  const v = await verificarTick(req);
  if (!v.ok) return new Response(null, { status: v.status, headers: SIN_CACHE });
  const r = await ejecutarTick(v.tick, origenCanonico()!);
  // La respuesta no lleva nombres ni dosis: solo el estado del turno y cuántos avisos
  return Response.json({ ok: r.status < 300, estado: r.estado, aceptados: r.aceptados, pendientes: r.pendientes }, { status: r.status, headers: SIN_CACHE });
}
