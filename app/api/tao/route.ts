import { NextResponse } from "next/server";
import { lugaresConEnlaces } from "@/lib/lugares";
import { cargarPanel } from "@/lib/panel";
import { responderTao } from "@/lib/tao";

// Tao responde con tu agenda, tareas, correo y clima (proxy.ts ya pidió la contraseña)
export async function POST(req: Request) {
  const { pregunta } = (await req.json().catch(() => ({}))) as { pregunta?: string };
  const [datos, lugares] = await Promise.all([cargarPanel(), lugaresConEnlaces().catch(() => [])]);
  return NextResponse.json({ respuesta: responderTao(String(pregunta ?? "").slice(0, 300), { ...datos, lugares }) });
}
