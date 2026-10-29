// Lugares frecuentes con enlaces a Google Maps (se configuran en Ajustes)
import { preferencias, type Lugar } from "./preferencias";

export type LugarConEnlaces = Lugar & { mapa: string; ruta: string };

export async function lugaresConEnlaces(): Promise<LugarConEnlaces[]> {
  const { lugares } = await preferencias();
  return lugares.map((lugar) => ({
    ...lugar,
    // "Ir" abre la ruta en auto desde donde estés, con tráfico en tiempo real
    ruta: `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: lugar.direccion, travelmode: "driving" })}`,
    mapa: `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: lugar.direccion })}`,
  }));
}
