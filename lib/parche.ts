// S14-B1 · Un formulario viejo no pisa lo que cambió otra pantalla.
// Cada formulario de edición manda, escondida, la "base": cómo estaban los campos cuando se abrió la pantalla.
// Al guardar (sobre lo guardado EN ESE MOMENTO, dentro del guardado con versión) se aplica campo por campo:
//   · campo que no tocaste (igual a la base): se queda lo que hay ahora, aunque otra pantalla lo haya cambiado;
//   · campo que tocaste y nadie más cambió: se guarda lo tuyo;
//   · campo que tocaste y otra pantalla también cambió (distinto): CONFLICTO, no se guarda nada y se te muestra lo
//     que escribiste para que decidas.
// Sin base (pantalla abierta con una versión anterior de la app) no se adivina: se pide recargar.
import { ConflictoDeGuardado } from "./guardar";

const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export class ConflictoDeCampos extends ConflictoDeGuardado {
  constructor(
    mensaje: string,
    public campos: string[],
  ) {
    super(mensaje);
  }
}

export function leerBase(texto: unknown): Record<string, unknown> | null {
  try {
    const v = JSON.parse(String(texto ?? ""));
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

// actual/base/enviado en la misma forma comparable. Devuelve SOLO los campos que hay que escribir.
export function parche<T extends Record<string, unknown>>(actual: T, base: Record<string, unknown> | null, enviado: Partial<T>, nombres: Record<string, string> = {}): Partial<T> {
  if (!base) throw new ConflictoDeCampos("Esta pantalla se abrió con una versión anterior de la app. Recárgala y vuelve a guardar.", []);
  const salida: Partial<T> = {};
  const choques: string[] = [];
  for (const k of Object.keys(enviado) as (keyof T & string)[]) {
    if (igual(enviado[k], base[k])) continue; // no lo tocaste
    if (igual(actual[k], base[k]) || igual(actual[k], enviado[k])) salida[k] = enviado[k];
    else choques.push(k);
  }
  if (choques.length)
    throw new ConflictoDeCampos(
      `Mientras editabas, otra pantalla cambió ${choques.map((c) => nombres[c] ?? c).join(", ")}. No se guardó nada.`,
      choques,
    );
  return salida;
}

// Borrador: lo que escribiste, para volver a mostrarlo si hubo conflicto (solo texto corto, nunca fotos)
export const borradorAUrl = (b: Record<string, unknown>) => Buffer.from(JSON.stringify(b)).toString("base64url");
export function borradorDeUrl(t: string | undefined): Record<string, unknown> | null {
  if (!t || t.length > 6000) return null;
  try {
    return leerBase(Buffer.from(t, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
