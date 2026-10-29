// Tao, el asistente del Optimizador de Vida: responde con tu agenda, tareas, correo y clima, con reglas (sin IA ni costos).
import { analizarDia, esReunion } from "./agenda";
import { duracion, fechaLarga, horaLocal, sumarDias } from "./fechas";
import type { DatosPanel } from "./panel";
import { resumenSencillo } from "./resumen-sencillo";

export type LugarTao = { nombre: string; icono: string; ruta: string };
export type DatosTao = DatosPanel & { lugares: LugarTao[] };

export const EJEMPLOS_TAO = ["¿Qué tengo hoy?", "¿Qué tengo mañana?", "¿Tengo tiempo libre hoy?", "¿Qué tareas tengo?", "¿Va a llover?", "¿Qué hago primero?"];

const AYUDA =
  "Puedo ayudarte con:\n- **Agenda**: “¿qué tengo hoy?”, “¿qué tengo el viernes?”, “¿tengo tiempo libre?”\n- **Pendientes**: “¿qué tareas tengo?”, “¿qué hago primero?”\n- **Correo y clima**: “¿tengo correos importantes?”, “¿va a llover?”\n- **Lugares**: “¿cómo llego a casa?”";

export const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const diaSemana = (fecha: string) => new Date(`${fecha}T12:00:00Z`).getUTCDay();

// Qué día pregunta: hoy, mañana, pasado mañana o un día de la semana (el próximo)
export function fechaPedida(q: string, hoy: string): { fecha: string; nombre: string } {
  if (/\bpasado manana\b/.test(q)) return { fecha: sumarDias(hoy, 2), nombre: "Pasado mañana" };
  if (/\bmanana\b/.test(q) && !/\bpor la manana\b|\ben la manana\b|\besta manana\b/.test(q)) return { fecha: sumarDias(hoy, 1), nombre: "Mañana" };
  const i = DIAS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(q));
  if (i >= 0) {
    const n = (i - diaSemana(hoy) + 7) % 7;
    if (n > 0) return { fecha: sumarDias(hoy, n), nombre: `El ${DIAS[i].replace("miercoles", "miércoles").replace("sabado", "sábado")}` };
  }
  return { fecha: hoy, nombre: "Hoy" };
}

function agenda(d: DatosTao, q: string): string {
  if (!d.semana.ok) return `No pude leer tu agenda: ${amable(d.semana.error)}`;
  const { fecha, nombre } = fechaPedida(q, d.hoy);
  const dia = analizarDia(fecha, d.semana.datos);
  const todoElDia = dia.todoElDia.map((e) => `- Todo el día: **${e.titulo}**`);
  const eventos = dia.eventos.map((e) => `- ${horaLocal(e.inicio)}: **${e.titulo}**${e.lugar ? ` (${e.lugar})` : ""}${e.conflicto ? " ⚠️ se empalma" : ""}`);
  const lista = [...todoElDia, ...eventos];
  if (!lista.length) return `${nombre} (${fechaLarga(fecha)}) tienes la agenda libre. 🎉`;
  const reuniones = dia.eventos.filter(esReunion).length;
  return `${nombre} (${fechaLarga(fecha)}): ${lista.length} evento${lista.length > 1 ? "s" : ""}${reuniones ? `, ${reuniones} con otras personas` : ""} y ${duracion(dia.minutosLibres)} libres.\n${lista.join("\n")}\n\n[Ver agenda](/agenda)`;
}

function libre(d: DatosTao, q: string): string {
  if (!d.semana.ok) return `No pude leer tu agenda: ${amable(d.semana.error)}`;
  const { fecha, nombre } = fechaPedida(q, d.hoy);
  const dia = analizarDia(fecha, d.semana.datos);
  const ahora = Date.now();
  const bloques = dia.libres.filter((b) => fecha !== d.hoy || new Date(b.fin).getTime() > ahora).filter((b) => b.minutos >= 30);
  if (!bloques.length) return `${nombre} casi no tienes huecos libres de 30 minutos o más. 😅`;
  return `${nombre} tienes ${duracion(dia.minutosLibres)} libres. Los huecos más útiles:\n${bloques
    .slice(0, 5)
    .map((b) => `- ${horaLocal(b.inicio)} a ${horaLocal(b.fin)} (${duracion(b.minutos)})`)
    .join("\n")}`;
}

function tareas(d: DatosTao): string {
  if (!d.tareas.ok) return `No pude leer tus tareas: ${amable(d.tareas.error)}`;
  const t = d.tareas.datos;
  if (!t.length) return "No tienes tareas pendientes. ✅";
  const vencidas = t.filter((x) => x.vence && x.vence < d.hoy);
  const hoy = t.filter((x) => x.vence === d.hoy);
  const resto = t.filter((x) => !vencidas.includes(x) && !hoy.includes(x));
  const linea = (x: (typeof t)[number]) => `- ${x.titulo}${x.vence ? ` (${x.vence < d.hoy ? "venció" : "vence"} ${fechaLarga(x.vence)})` : ""}`;
  const partes = [
    vencidas.length ? `**Vencidas (${vencidas.length})**\n${vencidas.map(linea).join("\n")}` : "",
    hoy.length ? `**Para hoy (${hoy.length})**\n${hoy.map(linea).join("\n")}` : "",
    resto.length ? `**Después (${resto.length})**\n${resto.slice(0, 6).map(linea).join("\n")}` : "",
  ].filter(Boolean);
  return `Tienes ${t.length} pendiente${t.length > 1 ? "s" : ""}.\n\n${partes.join("\n\n")}\n\n[Ver tareas](/tareas)`;
}

function correo(d: DatosTao): string {
  if (!d.correo.ok) return `No pude leer tu correo: ${amable(d.correo.error)}`;
  const { total, correos } = d.correo.datos;
  if (!total) return "No tienes correos sin leer. 📭";
  return `Tienes ${total} correo${total > 1 ? "s" : ""} sin leer. Los más recientes:\n${correos
    .slice(0, 5)
    .map((c) => `- **${c.de}**: ${c.asunto}`)
    .join("\n")}\n\n[Ver correo](/correo)`;
}

function clima(d: DatosTao, q: string): string {
  if (!d.clima.ok) return `No pude ver el clima: ${amable(d.clima.error)}`;
  const c = d.clima.datos;
  const { fecha, nombre } = fechaPedida(q, d.hoy);
  const dia = c.dias.find((x) => x.fecha === fecha);
  if (!dia) return `Ahora: ${c.icono} ${Math.round(c.temperatura)}°, ${c.descripcion.toLowerCase()}. Solo tengo el pronóstico de hoy y mañana.`;
  const lluvia = dia.lluvia >= 60 ? "Lleva paraguas ☔." : dia.lluvia >= 30 ? "Podría llover; por si acaso, paraguas." : "Casi sin lluvia.";
  const ahora = fecha === d.hoy ? ` Ahora hace ${Math.round(c.temperatura)}°.` : "";
  return `${nombre}: ${dia.icono} ${dia.descripcion.toLowerCase()}, de ${Math.round(dia.min)}° a ${Math.round(dia.max)}°, lluvia ${dia.lluvia}%. ${lluvia}${ahora}`;
}

// Errores técnicos ("fetch failed") en palabras sencillas
const amable = (error: string) => (/fetch failed|network|ENOTFOUND|ETIMEDOUT/i.test(error) ? "no hay conexión con el servicio ahorita; intenta en un momento" : error);

export function responderTao(pregunta: string, d: DatosTao): string {
  const q = normalizar(pregunta);
  if (!q) return AYUDA;
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|que onda|hey)\b/.test(q) && q.split(" ").length <= 3) return `¡Hola! 👋\n\n${AYUDA}`;
  if (/\b(ayuda|que puedes|que sabes|como funcionas)\b/.test(q)) return AYUDA;

  if (/\b(como llego|ruta|llegar|ir a|ir al|ir para|direccion de|donde queda)\b/.test(q)) {
    const lugar = d.lugares.find((l) => q.includes(normalizar(l.nombre)));
    if (lugar) return `${lugar.icono} Para ir a **${lugar.nombre}**, abre la ruta con tráfico en vivo: ${lugar.ruta}`;
    if (d.lugares.length) return `¿A cuál? Tus lugares: ${d.lugares.map((l) => `${l.icono} ${l.nombre}`).join(", ")}. Agrega más en [Más](/mas).`;
  }

  if (/\b(llov\w*|lluvia|clima|tiempo hace|temperatura|calor|frio|paraguas|sombrilla|soleado|nublado)\b/.test(q)) return clima(d, q);
  if (/\b(libre\w*|hueco\w*|disponible|tiempo para)\b/.test(q)) return libre(d, q);
  if (/\b(prioridad\w*|primero|importante hoy|mi dia|resumen|en una linea|que hago)\b/.test(q)) {
    const r = resumenSencillo("manana", d);
    const p = r.prioridades.map((x, i) => `${i + 1}. **${x.titulo}**: ${x.motivo}`).join("\n");
    return `${r.hoy_en_una_linea}${p ? `\n\nEn este orden:\n${p}` : ""}${r.sugerencia ? `\n\n💡 ${r.sugerencia}` : ""}`;
  }
  if (/\b(tarea\w*|pendiente\w*|vencid\w*|to ?do|por hacer)\b/.test(q)) return tareas(d);
  if (/\b(correo\w*|mail\w*|email\w*|bandeja|mensaje\w*)\b/.test(q)) return correo(d);
  if (/\b(noticia\w*|que paso|que pasa en el mundo)\b/.test(q)) {
    if (!d.noticias.ok || !d.noticias.datos.length) return "No pude traer noticias ahorita. Intenta más tarde.";
    return `Lo más reciente:\n${d.noticias.datos
      .slice(0, 4)
      .map((n) => `- ${n.titulo} (${n.fuente})`)
      .join("\n")}`;
  }
  if (/\b(agrega\w*|crea\w*|agenda\w*|nuevo evento|recuerda\w*|recordatorio)\b/.test(q) && !/\bque\b/.test(q))
    return "Para agregar un evento toca el botón **Evento** (abajo a la derecha): se abre Google Calendar y aparece aquí al instante.";
  if (/\b(tengo|agenda|evento\w*|reunion\w*|cita\w*|junta\w*|hoy|manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo|semana)\b/.test(q)) return agenda(d, q);

  return `No estoy seguro de qué me preguntas. 🤔\n\n${AYUDA}`;
}
