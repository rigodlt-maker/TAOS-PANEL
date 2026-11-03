// Mis hábitos: palomitas diarias y rachas. Se guardan dentro de tus ajustes (panel_config.datos.habitos),
// así no hace falta SQL nuevo. Solo se guardan los últimos 120 días de palomitas.
import { cache } from "react";
import { esDemo } from "./demo";
import { fechaLocal, sumarDias } from "./fechas";
import { cliente, idDelDueno, pushConfigurado } from "./push";

export type Habito = { id: string; nombre: string; icono: string };
export type Habitos = { lista: Habito[]; hechos: Record<string, string[]> };

export const SUGERIDOS: Habito[] = [
  { id: "dormir", nombre: "Dormir 7 horas", icono: "😴" },
  { id: "agua", nombre: "Tomar 2 litros de agua", icono: "💧" },
  { id: "sin-celular", nombre: "No ver el celular al despertar", icono: "📵" },
  { id: "caminar", nombre: "Caminar 20 minutos", icono: "🚶" },
  { id: "leer", nombre: "Leer 10 minutos", icono: "📖" },
  { id: "respirar", nombre: "Respirar 5 minutos", icono: "🧘" },
  { id: "fruta", nombre: "Comer fruta o verdura", icono: "🍎" },
  { id: "cama", nombre: "Tender la cama", icono: "🛏️" },
];

export const ICONOS_HABITO = ["✅", "😴", "💧", "📵", "🚶", "📖", "🧘", "🍎", "🛏️", "🏋️", "🦷", "💊", "🙏", "✍️", "🎸", "🌱", "🧹", "💰"];

const VACIO: Habitos = { lista: [], hechos: {} };
const DIAS_GUARDADOS = 120;

export function limpiarHabitos(d: unknown): Habitos {
  const v = (d && typeof d === "object" ? d : {}) as Partial<Habitos>;
  const lista = Array.isArray(v.lista)
    ? v.lista
        .filter((h) => h && typeof h.id === "string" && typeof h.nombre === "string" && h.nombre.trim())
        .slice(0, 12)
        .map((h) => ({ id: h.id.slice(0, 40), nombre: h.nombre.trim().slice(0, 50), icono: (h.icono || "✅").slice(0, 8) }))
    : [];
  const ids = new Set(lista.map((h) => h.id));
  const hechos: Record<string, string[]> = {};
  if (v.hechos && typeof v.hechos === "object")
    for (const [fecha, l] of Object.entries(v.hechos))
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && Array.isArray(l)) {
        const del = l.filter((id): id is string => typeof id === "string" && ids.has(id));
        if (del.length) hechos[fecha] = [...new Set(del)];
      }
  return { lista, hechos };
}

// Días seguidos cumpliendo un hábito. Si hoy todavía no lo marcas, la racha cuenta hasta ayer (no se pierde en la mañana).
export function racha(h: Habitos, id: string, hoy: string): number {
  let dia = h.hechos[hoy]?.includes(id) ? hoy : sumarDias(hoy, -1);
  let n = 0;
  while (h.hechos[dia]?.includes(id)) {
    n++;
    dia = sumarDias(dia, -1);
  }
  return n;
}

// Días seguidos con TODOS tus hábitos cumplidos
export function rachaCompleta(h: Habitos, hoy: string): number {
  if (!h.lista.length) return 0;
  const completo = (dia: string) => h.lista.every((x) => h.hechos[dia]?.includes(x.id));
  let dia = completo(hoy) ? hoy : sumarDias(hoy, -1);
  let n = 0;
  while (completo(dia)) {
    n++;
    dia = sumarDias(dia, -1);
  }
  return n;
}

export const pendientesDeHoy = (h: Habitos, hoy: string) => h.lista.filter((x) => !h.hechos[hoy]?.includes(x.id));

export function marcar(h: Habitos, id: string, fecha: string): Habitos {
  if (!h.lista.some((x) => x.id === id)) return h;
  const del = h.hechos[fecha] ?? [];
  const nuevo = del.includes(id) ? del.filter((x) => x !== id) : [...del, id];
  const hechos = { ...h.hechos, [fecha]: nuevo };
  if (!nuevo.length) delete hechos[fecha];
  // Solo los últimos 120 días
  const limite = sumarDias(fecha, -DIAS_GUARDADOS);
  for (const f of Object.keys(hechos)) if (f < limite) delete hechos[f];
  return { ...h, hechos };
}

export function agregar(h: Habitos, nombre: string, icono: string): Habitos {
  const limpio = nombre.trim().slice(0, 50);
  if (!limpio || h.lista.length >= 12) return h;
  const sugerido = SUGERIDOS.find((s) => s.nombre === limpio);
  let id = sugerido?.id ?? (limpio.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "habito");
  while (h.lista.some((x) => x.id === id)) id = `${id}-2`;
  return { ...h, lista: [...h.lista, { id, nombre: limpio, icono: icono || sugerido?.icono || "✅" }] };
}

export function quitar(h: Habitos, id: string): Habitos {
  return limpiarHabitos({ ...h, lista: h.lista.filter((x) => x.id !== id) });
}

// ---------- Guardado ----------
const g = globalThis as unknown as { __habitosDemo?: Habitos };

function demo(): Habitos {
  if (!g.__habitosDemo) {
    const hoy = fechaLocal();
    const lista = SUGERIDOS.slice(0, 4);
    const hechos: Record<string, string[]> = {};
    for (let i = 1; i <= 9; i++) hechos[sumarDias(hoy, -i)] = lista.filter((_, j) => j < 3 || i % 3).map((x) => x.id);
    hechos[hoy] = [lista[0].id];
    g.__habitosDemo = { lista, hechos };
  }
  return g.__habitosDemo;
}

export const leerHabitos = cache(async (): Promise<Habitos> => {
  if (esDemo()) return demo();
  if (!pushConfigurado()) return VACIO;
  try {
    const { data, error } = await cliente().from("panel_config").select("datos").eq("user_id", await idDelDueno()).maybeSingle();
    if (error || !data) return VACIO;
    return limpiarHabitos((data.datos as { habitos?: unknown } | null)?.habitos);
  } catch {
    return VACIO;
  }
});

export async function guardarHabitos(h: Habitos) {
  if (esDemo()) {
    g.__habitosDemo = h;
    return;
  }
  const db = cliente();
  const uid = await idDelDueno();
  const { data } = await db.from("panel_config").select("datos").eq("user_id", uid).maybeSingle();
  const datos = { ...((data?.datos as Record<string, unknown> | null) ?? {}), habitos: h };
  const { error } = await db.from("panel_config").upsert({ user_id: uid, datos, updated_at: new Date().toISOString() });
  if (error) throw new Error(/does not exist|schema cache/i.test(error.message) ? "Falta crear la tabla en Supabase: entra a Menú › Ajustes › Configurar base de datos." : error.message);
}

// Aviso de la noche si faltan hábitos de hoy
export function avisoHabitos(h: Habitos, hoy: string) {
  const faltan = pendientesDeHoy(h, hoy);
  if (!h.lista.length || !faltan.length) return null;
  return {
    titulo: faltan.length === h.lista.length ? "🌱 Hoy no has marcado tus hábitos" : `🌱 Te ${faltan.length === 1 ? "falta 1 hábito" : `faltan ${faltan.length} hábitos`} de hoy`,
    cuerpo: `${faltan.slice(0, 3).map((x) => `${x.icono} ${x.nombre}`).join(" · ")}. ¡Aún estás a tiempo!`,
    url: "/habitos",
    etiqueta: "habitos",
  };
}
