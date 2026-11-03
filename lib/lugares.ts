// Lugares frecuentes con enlaces a Google Maps (se configuran en Ajustes).
// La dirección puede ser texto ("Zócalo, CDMX") o un enlace copiado de Google Maps o de Mapas de iPhone.
import { preferencias, type Lugar } from "./preferencias";

export type LugarConEnlaces = Lugar & { mapa: string; ruta: string };

export const esEnlace = (texto: string) => /^https?:\/\//i.test(texto.trim());

// De un enlace de mapas saca el lugar en texto cuando se puede (para pedir la ruta con tráfico)
export function textoDelEnlace(enlace: string): string | null {
  try {
    const u = new URL(enlace.trim());
    const p = u.searchParams;
    if (/maps\.apple\.com$/i.test(u.hostname)) return p.get("address") || p.get("daddr") || p.get("q") || (p.get("ll") ? p.get("ll") : null);
    if (/google\./i.test(u.hostname)) {
      const lugar = /\/maps\/place\/([^/]+)/.exec(u.pathname)?.[1];
      if (lugar) return decodeURIComponent(lugar.replace(/\+/g, " "));
      return p.get("query") || p.get("q") || p.get("destination") || p.get("daddr");
    }
    return null;
  } catch {
    return null;
  }
}

export function enlacesDe(direccion: string): { mapa: string; ruta: string } {
  const destino = esEnlace(direccion) ? textoDelEnlace(direccion) : direccion.trim();
  // Un enlace corto (maps.app.goo.gl) no dice el lugar: se abre tal cual
  if (!destino) return { mapa: direccion.trim(), ruta: direccion.trim() };
  return {
    // "Ir" abre la ruta en auto desde donde estés, con tráfico en tiempo real
    ruta: `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: destino, travelmode: "driving" })}`,
    mapa: esEnlace(direccion) ? direccion.trim() : `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: destino })}`,
  };
}

export async function lugaresConEnlaces(): Promise<LugarConEnlaces[]> {
  const { lugares } = await preferencias();
  return lugares.map((lugar) => ({ ...lugar, ...enlacesDe(lugar.direccion) }));
}
