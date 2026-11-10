import { esDemo } from "@/lib/demo";
import { firmar, guardarMedicinas, hora12, leerMedicinas, porAvisar, textoDosis } from "@/lib/medicinas";
import { enviarPush, type AvisoPush } from "@/lib/push";

export const dynamic = "force-dynamic";

// "Despertador" de las medicinas: lo llama el servidor de TAOS cada 15 minutos (el plan gratis de Vercel solo permite
// tareas diarias). Manda el aviso de cada toma que ya tocó y no has marcado. Es seguro dejarlo abierto: solo avisa
// lo que toca y nunca repite un aviso que ya llegó (se guarda cuáles salieron).
export async function GET(req: Request) {
  if (esDemo()) return Response.json({ ok: true, demo: true });
  const origen = new URL(req.url).origin;
  const d = await leerMedicinas();
  const toca = porAvisar(d);
  if (!toca.length) return Response.json({ ok: true, avisos: 0 });
  const avisos: AvisoPush[] = toca.map(({ m, fecha, hora, clave }) => ({
    titulo: `💊 Hora de tu ${m.nombre}`,
    cuerpo: `${textoDosis(m)} · ${hora12(hora)}${m.nota ? ` · ${m.nota}` : ""}`,
    url: "/medicinas",
    etiqueta: `medicina-${m.id}`,
    imagen: m.foto ? `${origen}/api/medicinas/foto/${m.id}?k=${firmar(m.id)}` : undefined,
    acciones: [{ action: "tomada", title: "✅ Ya me la tomé" }],
    tomar: `/api/medicinas/tomada?${new URLSearchParams({ id: m.id, fecha, hora, k: firmar(clave) })}`,
  }));
  const r = await enviarPush(avisos, avisos.length);
  // Solo se anotan los que sí llegaron a algún celular. Los que fallaron (sin señal, servicio caído o sin celulares
  // con avisos activados) se reintentan en 15 minutos, hasta 2 horas después de la hora de la toma.
  const salieron = toca.filter((_, i) => r.aceptados[i] > 0).map((t) => t.clave);
  if (salieron.length) await guardarMedicinas({ ...d, enviados: [...d.enviados, ...salieron].slice(-200) });
  return Response.json({ ok: true, avisos: toca.length, enviados: salieron.length, pendientes: toca.length - salieron.length });
}
