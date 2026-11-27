import { cookies } from "next/headers";
import { COOKIE_SESION, mismaClave, sesionValida } from "@/lib/auth";
import { CORREO_DESTINO } from "@/lib/config";
import { enviarCorreo, tokenDeAcceso } from "@/lib/google";
import { cargarPanel } from "@/lib/panel";
import { resumenIA, type Momento, type ResumenIA } from "@/lib/ia";
import { avisoHabitos, leerHabitos } from "@/lib/habitos";
import { avisoDelDia, enviarPush, type AvisoPush } from "@/lib/push";
import { construirResumen } from "@/lib/resumen";
import type { Seccion } from "@/lib/panel";
import { esNube } from "@/lib/modo";
import { usuarioDeSesion } from "@/lib/sesion-nube";
import { paraCadaUsuario } from "@/lib/usuarios-nube";

export const dynamic = "force-dynamic";

// Vercel Cron llama aquí con "Authorization: Bearer <CRON_SECRET>".
// También funciona desde el panel si ya iniciaste sesión (botón "Enviarme el resumen").
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  const desdeCron = !!secreto && (await mismaClave(req.headers.get("authorization"), `Bearer ${secreto}`));
  const desdePanel = esNube() ? !!(await usuarioDeSesion()) : await sesionValida((await cookies()).get(COOKIE_SESION)?.value);
  if (!desdeCron && !desdePanel) return new Response("No autorizado", { status: 401 });

  const momento: Momento = new URL(req.url).searchParams.get("momento") === "noche" ? "noche" : "manana";
  // Nube F2: el cron recorre cada cuenta y manda solo la notificación (en Nube no hay Gmail conectado, D3)
  if (esNube() && desdeCron) {
    const ronda = await paraCadaUsuario(async () => {
      const datos = await cargarPanel();
      const avisos: AvisoPush[] = [avisoDelDia(momento, datos.hoy, datos.semana.ok ? datos.semana.datos : null, datos.tareas.ok ? datos.tareas.datos : null)];
      const habitos = momento === "noche" ? avisoHabitos(await leerHabitos().catch(() => ({ lista: [], hechos: {} })), datos.hoy) : null;
      if (habitos) avisos.push(habitos);
      return enviarPush(avisos);
    });
    return Response.json({ ok: ronda.fallas === 0, momento, usuarios: ronda.usuarios, fallas: ronda.fallas });
  }
  try {
    const datos = await cargarPanel();
    // Si la IA falla, el resumen se envía igual, sin esa parte
    const ia = await resumenIA(momento, datos)
      .then((r): Seccion<ResumenIA> => ({ ok: true, datos: r }))
      .catch((e): Seccion<ResumenIA> => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    if (!ia.ok) console.error("La IA falló:", ia.error);
    const { asunto, html } = construirResumen(momento, datos, ia);
    // Notificación en el celular antes del correo, así llega aunque el correo falle (solo la del cron, para no repetirla al pedir el resumen a mano)
    if (desdeCron) {
      const avisos: AvisoPush[] = [avisoDelDia(momento, datos.hoy, datos.semana.ok ? datos.semana.datos : null, datos.tareas.ok ? datos.tareas.datos : null)];
      // En la noche, si faltan hábitos de hoy, un recordatorio aparte
      const habitos = momento === "noche" ? avisoHabitos(await leerHabitos().catch(() => ({ lista: [], hechos: {} })), datos.hoy) : null;
      if (habitos) avisos.push(habitos);
      await enviarPush(avisos);
    }
    // En Nube (pedido desde el panel) no hay Gmail: el resumen llega como notificación a tu celular
    if (esNube()) await enviarPush([avisoDelDia(momento, datos.hoy, datos.semana.ok ? datos.semana.datos : null, datos.tareas.ok ? datos.tareas.datos : null)]);
    else await enviarCorreo(await tokenDeAcceso(), CORREO_DESTINO, asunto, html);
    if (desdePanel && !desdeCron) return Response.redirect(new URL("/?enviado=1", req.url), 303);
    return Response.json({ ok: true, momento, asunto });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    console.error("Error al enviar el resumen:", mensaje);
    return Response.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
