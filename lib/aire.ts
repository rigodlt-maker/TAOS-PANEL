// Aire y salud: calidad del aire e índice UV de tu ciudad (Open-Meteo, gratis y sin llave).
import { ZONA } from "./config";
import type { Ciudad } from "./preferencias";

export type Nivel = { texto: string; color: string; consejo: string };
export type Aire = { aqi: number; calidad: Nivel; uv: number; rayos: Nivel };

// Índice de calidad del aire (escala de EUA, 0–500), con las palabras que usa México
export function calidadDelAire(aqi: number): Nivel {
  if (aqi <= 50) return { texto: "Buena", color: "#3ecf6e", consejo: "Buen día para actividades al aire libre." };
  if (aqi <= 100) return { texto: "Aceptable", color: "#e6c84f", consejo: "Si eres sensible, evita el ejercicio intenso afuera." };
  if (aqi <= 150) return { texto: "Mala", color: "#f08c3a", consejo: "Mejor haz ejercicio bajo techo." };
  if (aqi <= 200) return { texto: "Muy mala", color: "#e5484d", consejo: "Evita actividades al aire libre." };
  return { texto: "Extremadamente mala", color: "#9b5cff", consejo: "Quédate en interiores si puedes." };
}

export function indiceUV(uv: number): Nivel {
  if (uv < 3) return { texto: "Bajo", color: "#3ecf6e", consejo: "" };
  if (uv < 6) return { texto: "Moderado", color: "#e6c84f", consejo: "Usa bloqueador si sales al mediodía." };
  if (uv < 8) return { texto: "Alto", color: "#f08c3a", consejo: "Bloqueador y gorra." };
  if (uv < 11) return { texto: "Muy alto", color: "#e5484d", consejo: "Evita el sol de 11 a 4." };
  return { texto: "Extremo", color: "#9b5cff", consejo: "Evita el sol directo." };
}

export async function obtenerAire(ciudad: Ciudad): Promise<Aire> {
  const q = new URLSearchParams({ latitude: String(ciudad.lat), longitude: String(ciudad.lon), current: "us_aqi,uv_index", timezone: ZONA });
  const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}`, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`El servicio de calidad del aire respondió ${res.status}`);
  const d = await res.json();
  const aqi = Math.round(d.current?.us_aqi ?? 0);
  const uv = Math.round((d.current?.uv_index ?? 0) * 10) / 10;
  return { aqi, calidad: calidadDelAire(aqi), uv, rayos: indiceUV(uv) };
}
