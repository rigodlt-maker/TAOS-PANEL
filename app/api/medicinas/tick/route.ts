import { esDemo } from "@/lib/demo";
import { firmar, guardarMedicinas, leerMedicinas, porAvisar, textoDosis } from "@/lib/medicinas";
import { enviarPush, type AvisoPush } from "@/lib/push";

export const dynamic = "force-dynamic";

// "Despertador" de las medicinas: lo llama el servidor de TAOS cada 15 minutos (el plan gratis de Vercel solo permite
// tareas diarias). Manda el aviso de cada toma que ya tocó y no has marcado. Es seguro dejarlo abierto: solo avisa
// lo que toca y nunca repite un aviso (se guarda cuáles ya salieron).
export async function GET(req: Request) {
  if (esDemo()) return Response.json({ ok: true, demo: true });
  const origen = new URL(req.url).origin;
  const d = await leerMedicinas();
  const toca = porAvisar(d);
  if (!toca.length) return Response.json({ ok: true, avisos: 0 });
  const avisos: AvisoPush[] = toca.map(({ m, fecha, hora, clave }) => ({
    titulo: `💊 Hora de tu ${m.nombre}`,
    cuerpo: `${textoDosis(m)} · ${hora}${m.nota ? ` · ${m.nota}` : ""}`,
    url: "/medicinas",
    etiqueta: `medicina-${m.id}`,
    imagen: m.foto ? `${origen}/api/medicinas/foto/${m.id}?k=${firmar(m.id)}` : undefined,
    acciones: [{ action: "tomada", title: "✅ Ya me la tomé" }],
    tomar: `/api/medicinas/tomada?${new URLSearchParams({ id: m.id, fecha, hora, k: firmar(clave) })}`,
  }));
  const r = await enviarPush(avisos);
  // Se anotan como enviados aunque falle alguno: así no se repiten cada 15 minutos
  await guardarMedicinas({ ...d, enviados: [...d.enviados, ...toca.map((t) => t.clave)].slice(-200) });
  return Response.json({ ok: true, avisos: toca.length, ...r });
}
