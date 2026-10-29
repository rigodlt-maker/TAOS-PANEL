import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { alertasCruzadas, analizarDia } from "./agenda";
import { fechaLarga, horaLocal, sumarDias } from "./fechas";
import type { DatosPanel } from "./panel";
import { resumenSencillo } from "./resumen-sencillo";

const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const Esquema = z.object({
  hoy_en_una_linea: z.string(),
  prioridades: z.array(z.object({ titulo: z.string(), motivo: z.string() })),
  correos: z.array(
    z.object({
      id: z.string(),
      categoria: z.enum(["responder_hoy", "informativo"]),
      resumen: z.string(),
    }),
  ),
  alertas: z.array(z.string()),
  sugerencia: z.string().nullable(),
});

export type ResumenIA = z.infer<typeof Esquema>;
export type Momento = "manana" | "noche";

const sistema = (nombre: string, ciudad: string) => `Eres el asistente personal de ${nombre || "la persona"}, que vive en ${ciudad}. Con los datos de su agenda, tareas y correos le preparas un resumen que pueda leer en menos de 90 segundos.

Escribe en español de México, en tono cercano y directo. Usa solo los datos que recibes: si algo no aparece, no lo inventes ni lo supongas.

- hoy_en_una_linea: una frase con el número de reuniones, las horas libres y lo más importante del día.
- prioridades: máximo 3, ordenadas por importancia, cada una con un motivo breve que salga de los datos.
- correos: clasifica cada correo recibido por su id. "responder_hoy" si hace una pregunta directa, pide algo con fecha o viene de una persona (no de un sistema automático); "informativo" para boletines, avisos y notificaciones. El resumen es de una línea.
- alertas: solo correos que mencionan una fecha, cita o reunión que no aparece en la agenda. No repitas las alertas que ya vienen detectadas. Lista vacía si no hay.
- sugerencia: si el día está sobrecargado (pocas horas libres para lo pendiente o reuniones encimadas), una sugerencia concreta para reorganizarlo. Si no, null.`;

function armarEntrada(momento: Momento, datos: DatosPanel) {
  const fecha = momento === "noche" ? sumarDias(datos.hoy, 1) : datos.hoy;
  const semana = datos.semana.ok ? datos.semana.datos : [];
  const tareas = datos.tareas.ok ? datos.tareas.datos : [];
  const dia = analizarDia(fecha, semana);
  return JSON.stringify({
    resumen_para: momento === "noche" ? `mañana ${fechaLarga(fecha)}` : `hoy ${fechaLarga(fecha)}`,
    agenda: [
      ...dia.todoElDia.map((e) => ({ hora: "todo el día", titulo: e.titulo })),
      ...dia.eventos.map((e) => ({
        hora: `${horaLocal(e.inicio)}–${horaLocal(e.fin)}`,
        titulo: e.titulo,
        reunion: e.asistentes > 1 || !!e.videollamada,
        se_empalma: e.conflicto,
      })),
    ],
    horas_libres: Math.round((dia.minutosLibres / 60) * 10) / 10,
    tareas: tareas.slice(0, 20).map((t) => ({ titulo: t.titulo, vence: t.vence ?? null })),
    correos: datos.correo.ok
      ? datos.correo.datos.correos.map((c) => ({ id: c.id, de: c.de, asunto: c.asunto, fragmento: c.fragmento }))
      : [],
    alertas_ya_detectadas: alertasCruzadas(semana, tareas, datos.hoy),
  });
}

async function pedirResumen(entrada: string, system: string): Promise<ResumenIA> {
  const cliente = new Anthropic();
  const respuesta = await cliente.beta.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    // Si el modelo declina por sus filtros de seguridad, la API reintenta con otro modelo
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(Esquema) },
    system,
    messages: [{ role: "user", content: entrada }],
  });
  if (respuesta.stop_reason === "refusal") throw new Error("La IA no pudo procesar los datos de hoy.");
  if (!respuesta.parsed_output) throw new Error("La IA respondió en un formato inesperado.");
  return respuesta.parsed_output;
}

// Mientras los datos no cambien, se reutiliza el mismo resumen hasta por una hora
const resumenEnCache = unstable_cache(pedirResumen, ["resumen-ia-v1"], { revalidate: 3600 });

export function iaDisponible(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Sin llave de Anthropic se usa la versión gratuita con reglas fijas
export async function resumenIA(momento: Momento, datos: DatosPanel): Promise<ResumenIA> {
  if (!iaDisponible()) return resumenSencillo(momento, datos);
  return resumenEnCache(armarEntrada(momento, datos), sistema(datos.prefs.nombre, datos.prefs.ciudad.nombre));
}
