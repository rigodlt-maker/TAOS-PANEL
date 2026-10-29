// Tus datos del panel: nombre, ciudad (para el clima) y lugares frecuentes. Se guardan en Supabase (tabla panel_config)
// y se cambian en la pantalla Ajustes. Sin configurar, el panel funciona con valores neutros.
import { cache } from "react";
import { cliente, idDelDueno, pushConfigurado } from "./push";

export type Lugar = { nombre: string; icono: string; direccion: string };
export type Ciudad = { nombre: string; lat: number; lon: number };
export type Preferencias = { nombre: string; ciudad: Ciudad; lugares: Lugar[]; configurado: boolean };

export const CIUDAD_BASE: Ciudad = { nombre: "Ciudad de México", lat: 19.4326, lon: -99.1332 };
const BASE: Preferencias = { nombre: process.env.TU_NOMBRE ?? "", ciudad: CIUDAD_BASE, lugares: [], configurado: false };

export function limpiar(d: unknown): Preferencias {
  const v = (d && typeof d === "object" ? d : {}) as Partial<Preferencias>;
  const c = v.ciudad;
  const ciudad = c && typeof c.nombre === "string" && Number.isFinite(c.lat) && Number.isFinite(c.lon) ? { nombre: c.nombre, lat: Number(c.lat), lon: Number(c.lon) } : CIUDAD_BASE;
  const lugares = Array.isArray(v.lugares)
    ? v.lugares
        .filter((l) => l && typeof l.nombre === "string" && l.nombre.trim() && typeof l.direccion === "string" && l.direccion.trim())
        .slice(0, 12)
        .map((l) => ({ nombre: l.nombre.trim().slice(0, 40), icono: (l.icono || "📍").slice(0, 8), direccion: l.direccion.trim().slice(0, 200) }))
    : [];
  return { nombre: typeof v.nombre === "string" ? v.nombre.trim().slice(0, 40) : BASE.nombre, ciudad, lugares, configurado: true };
}

export const preferencias = cache(async (): Promise<Preferencias> => {
  // Modo demostración: datos ficticios
  if (!process.env.PANEL_PASSWORD)
    return { nombre: "Alex", ciudad: CIUDAD_BASE, configurado: true, lugares: [{ nombre: "Casa", icono: "🏡", direccion: "Zócalo, Ciudad de México" }, { nombre: "Oficina", icono: "💼", direccion: "Paseo de la Reforma 222, Ciudad de México" }, { nombre: "Gimnasio", icono: "🏋️", direccion: "Parque México, Condesa, Ciudad de México" }] };
  if (!pushConfigurado()) return BASE;
  try {
    const { data, error } = await cliente().from("panel_config").select("datos").eq("user_id", await idDelDueno()).maybeSingle();
    if (error || !data) return BASE;
    return limpiar(data.datos);
  } catch {
    return BASE;
  }
});

export async function guardarPreferencias(p: Omit<Preferencias, "configurado">) {
  const { error } = await cliente()
    .from("panel_config")
    .upsert({ user_id: await idDelDueno(), datos: p, updated_at: new Date().toISOString() });
  if (error) throw new Error(/does not exist|schema cache/i.test(error.message) ? "Falta crear la tabla en Supabase: entra a Más › Ajustes › Configurar base de datos." : error.message);
}

// Busca la ciudad en el servicio gratuito de Open-Meteo (sin llave) para ubicar el clima
export async function buscarCiudad(nombre: string): Promise<Ciudad | null> {
  const q = new URLSearchParams({ name: nombre, count: "1", language: "es", format: "json" });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${q}`, { cache: "no-store" });
  if (!res.ok) return null;
  const r = (await res.json()).results?.[0];
  return r ? { nombre: [r.name, r.admin1].filter(Boolean).join(", "), lat: r.latitude, lon: r.longitude } : null;
}
