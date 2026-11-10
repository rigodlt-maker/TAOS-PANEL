// Seguridad (S17): límite de intentos de contraseña.
// Política (la misma en Supabase y en la memoria de respaldo): cada intento se APARTA antes de revisar la contraseña;
// hasta 5 por ventana de 15 minutos; al 5º se bloquea 15 minutos contados desde ese 5º. La contraseña correcta devuelve
// solo su propio intento. El contador es por instalación + dirección (huella HMAC, nunca la dirección en claro), así
// un ataque desde otra dirección no deja fuera al dueño.
// Con el SQL de seguridad 1.3 el contador vive en Supabase (uno solo para todos los servidores de Vercel). Sin él, se usa
// la memoria de cada servidor como respaldo y Ajustes avisa que falta correr el SQL.
import { createHmac } from "node:crypto";
import { cliente } from "./push";

export const MAX_INTENTOS = 5;
export const VENTANA_MS = 15 * 60 * 1000;
export const BLOQUEO_MS = 15 * 60 * 1000;

type Registro = { fallos: number; desde: number; bloqueadoHasta: number | null };
const registros = new Map<string, Registro>();

// ---------- Respaldo en memoria (misma política) ----------
export function reservarEnMemoria(clave: string, ahora = Date.now()): { permitido: boolean; esperaSeg: number } {
  let r = registros.get(clave) ?? { fallos: 0, desde: ahora, bloqueadoHasta: null };
  if (r.bloqueadoHasta && r.bloqueadoHasta > ahora) return { permitido: false, esperaSeg: Math.max(1, Math.ceil((r.bloqueadoHasta - ahora) / 1000)) };
  if (r.bloqueadoHasta || ahora - r.desde > VENTANA_MS) r = { fallos: 0, desde: ahora, bloqueadoHasta: null };
  r.fallos++;
  if (r.fallos >= MAX_INTENTOS) r.bloqueadoHasta = ahora + BLOQUEO_MS;
  registros.set(clave, r);
  if (registros.size > 5000) registros.delete(registros.keys().next().value as string); // que no crezca sin fin
  return { permitido: true, esperaSeg: 0 };
}

export function liberarEnMemoria(clave: string) {
  const r = registros.get(clave);
  if (!r) return;
  r.fallos = Math.max(0, r.fallos - 1);
  if (r.fallos < MAX_INTENTOS) r.bloqueadoHasta = null;
}

// ---------- Identidad del que intenta ----------
// En Vercel, x-real-ip y x-forwarded-for los pone la plataforma (no el navegador). Fuera de Vercel no se confía igual.
export function ipDe(req: Request): string {
  return req.headers.get("x-real-ip")?.trim() || (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocida";
}

export function claveDe(ip: string): string {
  const secreto = `${process.env.SUPABASE_SECRET_KEY ?? ""}:${process.env.PANEL_PASSWORD ?? ""}:intentos`;
  return createHmac("sha256", secreto).update(ip.toLowerCase()).digest("base64url").slice(0, 32);
}

const g = globalThis as unknown as { __intentosSinSql?: boolean };
export const intentosSinSql = () => g.__intentosSinSql === true;

// S17-A · Política de fallo (acordada con Codex): el contador de memoria SOLO se usa si la instalación todavía no tiene
// el SQL 1.3 (la función no existe: código PGRST202, contrato preciso). Con el SQL ya instalado, cualquier error de la
// base de datos = "no disponible" (503): no se revisa la contraseña ni se usa un contador aparte por servidor.
export type Reserva =
  | { permitido: true; clave: string; generacion: number; numero: number; memoria: boolean }
  | { permitido: false; clave: string; esperaSeg: number; noDisponible?: boolean };

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
const rpcReal: Rpc = (fn, args) => cliente().rpc(fn, args);

export async function reservarIntento(ip: string, rpc: Rpc = rpcReal): Promise<Reserva> {
  const clave = claveDe(ip);
  let r: Awaited<ReturnType<Rpc>>;
  try {
    r = await rpc("panel_reservar_intento", { p_clave: clave, p_max: MAX_INTENTOS, p_ventana_seg: VENTANA_MS / 1000, p_bloqueo_seg: BLOQUEO_MS / 1000 });
  } catch (e) {
    console.error("Intentos: base de datos no disponible:", (e as Error).message);
    return { permitido: false, clave, esperaSeg: 60, noDisponible: true };
  }
  if (r.error) {
    if (r.error.code === "PGRST202") {
      g.__intentosSinSql = true;
      const m = reservarEnMemoria(clave);
      return m.permitido ? { permitido: true, clave, generacion: 0, numero: 0, memoria: true } : { permitido: false, clave, esperaSeg: m.esperaSeg };
    }
    console.error("Intentos: base de datos no disponible:", r.error.code, r.error.message);
    return { permitido: false, clave, esperaSeg: 60, noDisponible: true };
  }
  g.__intentosSinSql = false;
  const fila = (Array.isArray(r.data) ? r.data[0] : r.data) as { permitido: boolean; espera_seg: number; generacion: number; numero: number } | undefined;
  if (!fila) return { permitido: false, clave, esperaSeg: 60, noDisponible: true };
  return fila.permitido
    ? { permitido: true, clave, generacion: Number(fila.generacion), numero: Number(fila.numero), memoria: false }
    : { permitido: false, clave, esperaSeg: Math.max(1, Number(fila.espera_seg)) };
}

// S17-B · Contraseña correcta: se devuelve SOLO ese intento (generación + número). Si la ventana ya cambió no toca nada,
// y devolverlo dos veces no descuenta dos.
export async function liberarIntento(reserva: Extract<Reserva, { permitido: true }>, rpc: Rpc = rpcReal) {
  if (reserva.memoria) return liberarEnMemoria(reserva.clave);
  await Promise.resolve(rpc("panel_liberar_intento", { p_clave: reserva.clave, p_generacion: reserva.generacion, p_numero: reserva.numero, p_max: MAX_INTENTOS })).then(
    () => {},
    () => {},
  );
}
