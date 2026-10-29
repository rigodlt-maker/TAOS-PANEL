import { cookies } from "next/headers";
import { COOKIE_SESION, sesionValida } from "@/lib/auth";
import { CORREO_DESTINO } from "@/lib/config";
import { enviarCorreo, tokenDeAcceso } from "@/lib/google";
import { cargarPanel } from "@/lib/panel";
import { resumenIA, type Momento, type ResumenIA } from "@/lib/ia";
import { avisoDelDia, enviarPush } from "@/lib/push";
import { construirResumen } from "@/lib/resumen";
import type { Seccion } from "@/lib/panel";

export const dynamic = "force-dynamic";

// Vercel Cron llama aquí con "Authorization: Bearer <CRON_SECRET>".
// También funciona desde el panel si ya iniciaste sesión (botón "Enviarme el resumen").
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  const desdeCron = !!secreto && req.headers.get("authorization") === `Bearer ${secreto}`;
  const desdePanel = await sesionValida((await cookies()).get(COOKIE_SESION)?.value);
  if (!desdeCron && !desdePanel) return new Response("No autorizado", { status: 401 });

  const momento: Momento = new URL(req.url).searchParams.get("momento") === "noche" ? "noche" : "manana";
  try {
    const datos = await cargarPanel();
    // Si la IA falla, el resumen se envía igual, sin esa parte
    const ia = await resumenIA(momento, datos)
      .then((r): Seccion<ResumenIA> => ({ ok: true, datos: r }))
      .catch((e): Seccion<ResumenIA> => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    if (!ia.ok) console.error("La IA falló:", ia.error);
    const { asunto, html } = construirResumen(momento, datos, ia);
    // Notificación en el celular antes del correo, así llega aunque el correo falle (solo la del cron, para no repetirla al pedir el resumen a mano)
    if (desdeCron) await enviarPush(avisoDelDia(momento, datos.hoy, datos.semana.ok ? datos.semana.datos : null, datos.tareas.ok ? datos.tareas.datos : null));
    await enviarCorreo(await tokenDeAcceso(), CORREO_DESTINO, asunto, html);
    if (desdePanel && !desdeCron) return Response.redirect(new URL("/?enviado=1", req.url), 303);
    return Response.json({ ok: true, momento, asunto });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    console.error("Error al enviar el resumen:", mensaje);
    return Response.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
