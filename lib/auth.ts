export const COOKIE_SESION = "panel_sesion";
export const DURACION_SESION = 60 * 60 * 24 * 90; // 90 días, en segundos

const texto = new TextEncoder();

// Llave para firmar la sesión. Mezcla tu contraseña con la llave secreta de Supabase (que nunca sale de Vercel):
// quien vea la cookie no puede adivinar tu contraseña con ella, y cambiar PANEL_PASSWORD cierra todas las sesiones.
async function llave(): Promise<CryptoKey | null> {
  const clave = process.env.PANEL_PASSWORD;
  if (!clave) return null;
  const material = texto.encode(`panel-de-vida|${process.env.SUPABASE_SECRET_KEY ?? ""}|${clave}`);
  return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

const aBase64Url = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function deBase64Url(valor: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(valor.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

// Compara en tiempo constante: el tiempo de respuesta no delata cuántos caracteres coinciden
export async function mismaClave(recibida: string | null | undefined, esperada: string): Promise<boolean> {
  const huella = async (t: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", texto.encode(t)));
  const [a, b] = await Promise.all([huella(recibida ?? ""), huella(esperada)]);
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i] ^ b[i];
  return diferencia === 0;
}

export async function claveCorrecta(intento: string): Promise<boolean> {
  const correcta = process.env.PANEL_PASSWORD;
  return !!correcta && (await mismaClave(intento, correcta));
}

// Cookie de sesión: "<vence>.<firma>". Caduca sola y no contiene tu contraseña
export async function crearSesion(): Promise<string> {
  const k = await llave();
  if (!k) throw new Error("Falta PANEL_PASSWORD");
  const vence = Math.floor(Date.now() / 1000) + DURACION_SESION;
  const firma = await crypto.subtle.sign("HMAC", k, texto.encode(`sesion:${vence}`));
  return `${vence}.${aBase64Url(firma)}`;
}

export async function sesionValida(valorCookie?: string): Promise<boolean> {
  // Sin contraseña configurada = modo demostración (datos ficticios), abierto
  if (!process.env.PANEL_PASSWORD) return true;
  if (!valorCookie) return false;
  const [vence, firma] = valorCookie.split(".");
  if (!/^\d+$/.test(vence ?? "") || Number(vence) < Date.now() / 1000 || !firma) return false;
  const bytes = deBase64Url(firma);
  const k = await llave();
  if (!bytes || !k) return false;
  return crypto.subtle.verify("HMAC", k, bytes, texto.encode(`sesion:${vence}`));
}
