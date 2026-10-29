export const COOKIE_SESION = "panel_sesion";

// Huella de la contraseña: así la contraseña nunca se guarda tal cual en el navegador
export async function huellaDeClave(clave: string): Promise<string> {
  const bytes = new TextEncoder().encode(`panel-de-vida:${clave}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sesionValida(valorCookie?: string): Promise<boolean> {
  const clave = process.env.PANEL_PASSWORD;
  if (!clave || !valorCookie) return false;
  return valorCookie === (await huellaDeClave(clave));
}
