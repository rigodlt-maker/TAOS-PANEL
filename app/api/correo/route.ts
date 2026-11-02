import { modificarCorreo, tokenDeAcceso, type AccionCorreo } from "@/lib/google";

export const dynamic = "force-dynamic";

const ACCIONES: AccionCorreo[] = ["papelera", "archivar", "leido"];

// Papelera, archivar o marcar como leído (proxy.ts ya pidió la contraseña del panel)
export async function POST(req: Request) {
  const { id, accion } = (await req.json().catch(() => ({}))) as { id?: string; accion?: string };
  if (typeof id !== "string" || !ACCIONES.includes(accion as AccionCorreo)) return Response.json({ ok: false, error: "Petición incompleta" }, { status: 400 });
  try {
    await modificarCorreo(await tokenDeAcceso(), id, accion as AccionCorreo);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
