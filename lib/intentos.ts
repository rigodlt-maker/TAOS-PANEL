// Seguridad (S17): límite de intentos de contraseña por dirección. Después de 5 fallos en 15 minutos,
// esa dirección espera 15 minutos. Se guarda en la memoria del servidor (gratis, sin tablas): cada
// servidor de Vercel lleva su cuenta, así que es una barrera extra junto con la pausa de 2 s.
export const MAX_INTENTOS = 5;
export const VENTANA_MS = 15 * 60 * 1000;

type Registro = { fallos: number; desde: number };
const registros = new Map<string, Registro>();

function vigente(ip: string, ahora: number): Registro | undefined {
  const r = registros.get(ip);
  if (r && ahora - r.desde > VENTANA_MS) {
    registros.delete(ip);
    return undefined;
  }
  return r;
}

/** Minutos que faltan para poder intentar otra vez (0 = puede intentar). */
export function minutosDeEspera(ip: string, ahora = Date.now()): number {
  const r = vigente(ip, ahora);
  if (!r || r.fallos < MAX_INTENTOS) return 0;
  return Math.max(1, Math.ceil((r.desde + VENTANA_MS - ahora) / 60000));
}

export function anotarFallo(ip: string, ahora = Date.now()) {
  const r = vigente(ip, ahora) ?? { fallos: 0, desde: ahora };
  r.fallos++;
  registros.set(ip, r);
  if (registros.size > 5000) registros.delete(registros.keys().next().value as string); // que no crezca sin fin
}

export function limpiarIntentos(ip: string) {
  registros.delete(ip);
}

export function ipDe(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "desconocida";
}
