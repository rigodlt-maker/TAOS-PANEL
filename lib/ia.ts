// TAOS funciona sin IA de pago: el resumen del día se arma con reglas (lib/resumen-sencillo.ts).
import type { DatosPanel } from "./panel";
import { resumenSencillo } from "./resumen-sencillo";

export type ResumenIA = {
  hoy_en_una_linea: string;
  prioridades: { titulo: string; motivo: string }[];
  correos: { id: string; categoria: "responder_hoy" | "informativo"; resumen: string }[];
  alertas: string[];
  sugerencia: string | null;
};
export type Momento = "manana" | "noche";

export function iaDisponible(): boolean {
  return false;
}

export async function resumenIA(momento: Momento, datos: DatosPanel): Promise<ResumenIA> {
  return resumenSencillo(momento, datos);
}
