import { firmaValida, leerMedicinas } from "@/lib/medicinas";

export const dynamic = "force-dynamic";

// La foto de una medicina para el aviso del celular (que no lleva sesión): solo con la firma correcta
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!firmaValida(id, new URL(req.url).searchParams.get("k"))) return new Response("No autorizado", { status: 401 });
  const foto = (await leerMedicinas()).lista.find((m) => m.id === id)?.foto;
  const partes = foto?.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!partes) return new Response("Sin foto", { status: 404 });
  return new Response(Buffer.from(partes[2], "base64"), { headers: { "Content-Type": partes[1], "Cache-Control": "private, max-age=86400" } });
}
