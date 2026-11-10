import { huellaDe } from "@/lib/guardar";
import { cambiarMedicinas, firmaValida, marcarToma } from "@/lib/medicinas";

export const dynamic = "force-dynamic";

// Botón "Ya me la tomé" del aviso: marca la toma sin abrir la app (la dirección viene firmada en el aviso)
export async function POST(req: Request) {
  const q = new URL(req.url).searchParams;
  const [id, fecha, hora] = [q.get("id") ?? "", q.get("fecha") ?? "", q.get("hora") ?? ""];
  if (!firmaValida(`${fecha} ${id}@${hora}`, q.get("k"))) return new Response("No autorizado", { status: 401 });
  // Marcar (nunca desmarcar) sobre lo guardado en ese momento; si el botón llega dos veces, se aplica una sola
  const clave = `${fecha} ${id}@${hora}`;
  await cambiarMedicinas((d) => marcarToma(d, fecha, id, hora, true), { id: `tomada:${clave}`, huella: huellaDe(clave) });
  return Response.json({ ok: true });
}
