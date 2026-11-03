// Mis medicinas y suplementos: qué tomas, cuánto (pastilla, sobre, cucharada…) y cada cuántas horas.
// Se guardan dentro de tus ajustes (panel_config.datos.medicinas), sin SQL nuevo. La foto (opcional) va pequeña, en el mismo lugar.
// Los avisos llegan de dos formas: alarmas en el calendario de tu celular (siempre suenan) y notificación de la app
// con foto y botón "Ya me la tomé" (la manda /api/medicinas/tick, que despierta el servidor de TAOS cada 15 minutos).
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { DESFASE, ZONA } from "./config";
import { esDemo } from "./demo";
import { fechaLocal, sumarDias } from "./fechas";
import { cliente, idDelDueno, pushConfigurado } from "./push";

export const UNIDADES = ["pastilla", "cápsula", "tableta", "sobre", "cucharada", "cucharadita", "gotas", "ml", "inyección", "parche", "toma"] as const;
export type Unidad = (typeof UNIDADES)[number];
export const CADA_HORAS = [4, 6, 8, 12, 24] as const;

export type Medicina = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: Unidad;
  cadaHoras: number;
  primera: string; // "08:00": la primera toma del día
  nota: string; // "con alimentos", "en ayunas"…
  foto: string | null; // imagen pequeña (data:image/jpeg;base64,…)
};
// tomas: fecha → ["id@08:00", …] · enviados: avisos ya mandados "fecha id@hora" (para no repetir)
export type Medicinas = { lista: Medicina[]; tomas: Record<string, string[]>; enviados: string[] };

const VACIO: Medicinas = { lista: [], tomas: {}, enviados: [] };
const MAX = 15;
const MAX_FOTO = 90_000; // ~65 KB de imagen

const hora = (v: string) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null);
const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const aHora = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function limpiarMedicinas(d: unknown): Medicinas {
  const v = (d && typeof d === "object" ? d : {}) as Partial<Medicinas>;
  const lista = (Array.isArray(v.lista) ? v.lista : [])
    .filter((m) => m && typeof m.id === "string" && typeof m.nombre === "string" && m.nombre.trim())
    .slice(0, MAX)
    .map((m) => ({
      id: m.id.slice(0, 40),
      nombre: m.nombre.trim().slice(0, 60),
      cantidad: Math.min(100, Math.max(0.25, Number(m.cantidad) || 1)),
      unidad: (UNIDADES as readonly string[]).includes(m.unidad) ? m.unidad : "pastilla",
      cadaHoras: (CADA_HORAS as readonly number[]).includes(Number(m.cadaHoras)) ? Number(m.cadaHoras) : 24,
      primera: hora(String(m.primera)) ?? "08:00",
      nota: typeof m.nota === "string" ? m.nota.trim().slice(0, 80) : "",
      foto: typeof m.foto === "string" && m.foto.startsWith("data:image/") && m.foto.length <= MAX_FOTO ? m.foto : null,
    }));
  const ids = new Set(lista.map((m) => m.id));
  const tomas: Record<string, string[]> = {};
  if (v.tomas && typeof v.tomas === "object")
    for (const [f, l] of Object.entries(v.tomas))
      if (/^\d{4}-\d{2}-\d{2}$/.test(f) && Array.isArray(l)) {
        const del = l.filter((x): x is string => typeof x === "string" && ids.has(x.split("@")[0]));
        if (del.length) tomas[f] = [...new Set(del)];
      }
  const enviados = Array.isArray(v.enviados) ? v.enviados.filter((x): x is string => typeof x === "string").slice(-200) : [];
  return { lista, tomas, enviados };
}

// Las horas de cada día: desde la primera toma, cada N horas, dentro de 24 h (8:00 cada 8 h → 00:00, 08:00, 16:00)
export function horarios(m: Pick<Medicina, "primera" | "cadaHoras">): string[] {
  const inicio = minutos(m.primera);
  const n = Math.max(1, Math.floor(24 / m.cadaHoras));
  return Array.from({ length: n }, (_, k) => aHora(inicio + k * m.cadaHoras * 60)).sort();
}

export const textoDosis = (m: Pick<Medicina, "cantidad" | "unidad">) => {
  const plural = m.cantidad > 1 && !["ml", "gotas"].includes(m.unidad) ? (m.unidad.endsWith("n") ? "es" : "s") : "";
  const unidad = m.unidad === "inyección" && plural ? "inyecciones" : `${m.unidad}${plural}`;
  return `${String(m.cantidad).replace(".5", "½").replace(/^0½/, "½")} ${unidad}`;
};

export const tomada = (d: Medicinas, fecha: string, id: string, h: string) => !!d.tomas[fecha]?.includes(`${id}@${h}`);

// Marca o desmarca una toma; guarda solo 30 días de historial
export function marcarToma(d: Medicinas, fecha: string, id: string, h: string, hecha = !tomada(d, fecha, id, h)): Medicinas {
  if (!d.lista.some((m) => m.id === id) || !hora(h)) return d;
  const clave = `${id}@${h}`;
  const del = (d.tomas[fecha] ?? []).filter((x) => x !== clave);
  const tomas = { ...d.tomas, [fecha]: hecha ? [...del, clave] : del };
  if (!tomas[fecha].length) delete tomas[fecha];
  for (const f of Object.keys(tomas)) if (f < sumarDias(fecha, -30)) delete tomas[f];
  return { ...d, tomas };
}

export function guardarMedicina(d: Medicinas, m: Omit<Medicina, "id"> & { id?: string }): Medicinas {
  const limpia = limpiarMedicinas({ lista: [{ ...m, id: m.id || `m${Date.now().toString(36)}` }] }).lista[0];
  if (!limpia) return d;
  const existe = d.lista.some((x) => x.id === limpia.id);
  if (!existe && d.lista.length >= MAX) return d;
  return { ...d, lista: existe ? d.lista.map((x) => (x.id === limpia.id ? limpia : x)) : [...d.lista, limpia] };
}

export const quitarMedicina = (d: Medicinas, id: string): Medicinas => limpiarMedicinas({ ...d, lista: d.lista.filter((m) => m.id !== id) });

// Las tomas de un día con su estado (para la pantalla y la tarjeta de Hoy)
export function tomasDelDia(d: Medicinas, fecha: string) {
  return d.lista
    .flatMap((m) => horarios(m).map((h) => ({ m, hora: h, hecha: tomada(d, fecha, m.id, h) })))
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

// Hora local (HH:MM) y fecha de un instante
export function ahoraLocal(t = Date.now()) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t));
  return { fecha: new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(t)), hora: p };
}
const instante = (fecha: string, h: string) => Date.parse(`${fecha}T${h}:00${DESFASE}`);

// Tomas que ya tocaron (en las últimas 2 horas), sin tomar y sin aviso enviado: las que hay que avisar ahora
export function porAvisar(d: Medicinas, t = Date.now()) {
  const hoy = ahoraLocal(t).fecha;
  const salida: { m: Medicina; fecha: string; hora: string; clave: string }[] = [];
  for (const fecha of [sumarDias(hoy, -1), hoy])
    for (const m of d.lista)
      for (const h of horarios(m)) {
        const cuando = instante(fecha, h);
        const clave = `${fecha} ${m.id}@${h}`;
        if (cuando <= t && cuando > t - 2 * 3600_000 && !tomada(d, fecha, m.id, h) && !d.enviados.includes(clave)) salida.push({ m, fecha, hora: h, clave });
      }
  return salida;
}

// ---------- Firmas: la foto y el botón "Ya me la tomé" de la notificación funcionan sin iniciar sesión ----------
const llave = () => `${process.env.SUPABASE_SECRET_KEY ?? ""}:${process.env.PANEL_PASSWORD ?? "demo"}:medicinas`;
export const firmar = (texto: string) => createHmac("sha256", llave()).update(texto).digest("base64url").slice(0, 32);
export function firmaValida(texto: string, firma: string | null) {
  const a = Buffer.from(firmar(texto));
  const b = Buffer.from(firma ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- Calendario del celular (las alarmas que suenan siempre) ----------
const ics = (t: string) => t.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
export function calendarioIcs(d: Medicinas, hoy = fechaLocal()): string {
  const dia = hoy.replaceAll("-", "");
  const eventos = d.lista.flatMap((m) =>
    horarios(m).map((h) =>
      [
        "BEGIN:VEVENT",
        `UID:taos-${m.id}-${h.replace(":", "")}@optimizador`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
        `DTSTART;TZID=${ZONA}:${dia}T${h.replace(":", "")}00`,
        "DURATION:PT10M",
        "RRULE:FREQ=DAILY",
        `SUMMARY:${ics(`💊 ${m.nombre} · ${textoDosis(m)}`)}`,
        `DESCRIPTION:${ics(`${textoDosis(m)} cada ${m.cadaHoras} h.${m.nota ? ` ${m.nota}.` : ""} Márcala en tu Optimizador de Vida.`)}`,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${ics(`Hora de tu ${m.nombre}`)}`,
        "TRIGGER:PT0M",
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n"),
    ),
  );
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TAOS//Optimizador de Vida//ES", "CALSCALE:GREGORIAN", `X-WR-TIMEZONE:${ZONA}`, ...eventos, "END:VCALENDAR", ""].join("\r\n");
}

// Enlace "Agregar a Google Calendar" de una toma (evento diario que se repite)
export function enlaceGoogle(m: Medicina, h: string, hoy = fechaLocal()) {
  const inicio = `${hoy.replaceAll("-", "")}T${h.replace(":", "")}00`;
  const fin = `${hoy.replaceAll("-", "")}T${aHora(minutos(h) + 10).replace(":", "")}00`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `💊 ${m.nombre} · ${textoDosis(m)}`,
    dates: `${inicio}/${fin}`,
    ctz: ZONA,
    recur: "RRULE:FREQ=DAILY",
    details: `${textoDosis(m)} cada ${m.cadaHoras} h.${m.nota ? ` ${m.nota}.` : ""}`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// ---------- Guardado (igual que los hábitos) ----------
const g = globalThis as unknown as { __medicinasDemo?: Medicinas };

function demo(): Medicinas {
  g.__medicinasDemo ??= {
    lista: [
      { id: "omeprazol", nombre: "Omeprazol 20 mg", cantidad: 1, unidad: "cápsula", cadaHoras: 24, primera: "07:30", nota: "En ayunas", foto: null },
      { id: "vitamina-d", nombre: "Vitamina D", cantidad: 1, unidad: "cucharadita", cadaHoras: 24, primera: "14:00", nota: "Con la comida", foto: null },
      { id: "ibuprofeno", nombre: "Ibuprofeno 400 mg", cantidad: 1, unidad: "tableta", cadaHoras: 8, primera: "08:00", nota: "Por 5 días", foto: null },
    ],
    tomas: { [fechaLocal()]: ["omeprazol@07:30", "ibuprofeno@08:00"] },
    enviados: [],
  };
  return g.__medicinasDemo;
}

export const leerMedicinas = cache(async (): Promise<Medicinas> => {
  if (esDemo()) return demo();
  if (!pushConfigurado()) return VACIO;
  try {
    const { data, error } = await cliente().from("panel_config").select("datos").eq("user_id", await idDelDueno()).maybeSingle();
    if (error || !data) return VACIO;
    return limpiarMedicinas((data.datos as { medicinas?: unknown } | null)?.medicinas);
  } catch {
    return VACIO;
  }
});

export async function guardarMedicinas(d: Medicinas) {
  if (esDemo()) {
    g.__medicinasDemo = d;
    return;
  }
  const db = cliente();
  const uid = await idDelDueno();
  const { data } = await db.from("panel_config").select("datos").eq("user_id", uid).maybeSingle();
  const datos = { ...((data?.datos as Record<string, unknown> | null) ?? {}), medicinas: limpiarMedicinas(d) };
  const { error } = await db.from("panel_config").upsert({ user_id: uid, datos, updated_at: new Date().toISOString() });
  if (error) throw new Error(/does not exist|schema cache/i.test(error.message) ? "Falta crear la tabla en Supabase: entra a Menú › Ajustes › Configurar base de datos." : error.message);
}
