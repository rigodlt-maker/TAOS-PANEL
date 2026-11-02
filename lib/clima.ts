import { ZONA } from "./config";
import type { Ciudad } from "./preferencias";

export type Dia = { fecha: string; max: number; min: number; lluvia: number; descripcion: string; icono: string };
export type Escena = "sol" | "luna" | "nubes" | "lluvia" | "tormenta" | "nieve" | "niebla";
export type Clima = { temperatura: number; descripcion: string; icono: string; dias: Dia[]; escena: Escena };

// Fondo animado de la pantalla Hoy según el clima de ahora
export function escenaDe(codigo: number, deDia: boolean): Escena {
  if (codigo >= 95) return "tormenta";
  if ((codigo >= 51 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return "lluvia";
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return "nieve";
  if (codigo === 45 || codigo === 48) return "niebla";
  if (codigo === 3) return "nubes";
  return deDia ? "sol" : "luna";
}

// Códigos WMO que usa Open-Meteo
function describir(codigo: number): { descripcion: string; icono: string } {
  if (codigo === 0) return { descripcion: "Despejado", icono: "☀️" };
  if (codigo <= 2) return { descripcion: "Parcialmente nublado", icono: "⛅" };
  if (codigo === 3) return { descripcion: "Nublado", icono: "☁️" };
  if (codigo <= 48) return { descripcion: "Niebla", icono: "🌫️" };
  if (codigo <= 57) return { descripcion: "Llovizna", icono: "🌦️" };
  if (codigo <= 67) return { descripcion: "Lluvia", icono: "🌧️" };
  if (codigo <= 77) return { descripcion: "Nieve", icono: "❄️" };
  if (codigo <= 82) return { descripcion: "Chubascos", icono: "🌧️" };
  return { descripcion: "Tormenta", icono: "⛈️" };
}

export async function obtenerClima(ciudad: Ciudad): Promise<Clima> {
  const params = new URLSearchParams({
    latitude: String(ciudad.lat),
    longitude: String(ciudad.lon),
    current: "temperature_2m,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    timezone: ZONA,
    forecast_days: "2",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`El servicio del clima respondió ${res.status}`);
  const d = await res.json();
  return {
    temperatura: Math.round(d.current.temperature_2m),
    ...describir(d.current.weather_code),
    escena: escenaDe(d.current.weather_code, d.current.is_day !== 0),
    dias: (d.daily.time as string[]).map((fecha, i) => ({
      fecha,
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      lluvia: d.daily.precipitation_probability_max[i] ?? 0,
      ...describir(d.daily.weather_code[i]),
    })),
  };
}
