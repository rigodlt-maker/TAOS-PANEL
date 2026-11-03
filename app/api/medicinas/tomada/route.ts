import { firmaValida, guardarMedicinas, leerMedicinas, marcarToma } from "@/lib/medicinas";

export const dynamic = "force-dynamic";

// Botón "Ya me la tomé" del aviso: marca la toma sin abrir la app (la dirección viene firmada en el aviso)
export async function POST(req: Request) {
  const q = new URL(req.url).searchParams;
  const [id, fecha, hora] = [q.get("id") ?? "", q.get("fecha") ?? "", q.get("hora") ?? ""];
  if (!firmaValida(`${fecha} ${id}@${hora}`, q.get("k"))) return new Response("No autorizado", { status: 401 });
  await guardarMedicinas(marcarToma(await leerMedicinas(), fecha, id, hora, true));
  return Response.json({ ok: true });
}
