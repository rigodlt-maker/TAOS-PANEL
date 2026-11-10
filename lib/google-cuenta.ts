// Conexión con Google desde la app: el botón "Conectar con Google" guarda tu permiso (refresh token)
// en tu Supabase. Así no hay que conseguirlo a mano. Si no hay, se usa GOOGLE_REFRESH_TOKEN de Vercel.
import { cliente, idDelDueno, pushConfigurado } from "./push";

export const ALCANCES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  // Para mandar a la papelera, archivar o marcar como leído desde la app
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/tasks.readonly",
];

export const googleConfigurado = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// S03: la conexión vive en su propia tabla (panel_google), que solo lee el servidor. Si todavía no se corre el SQL de
// seguridad 1.3, se lee la columna anterior. Primero la que guardó el botón; si no hay, GOOGLE_REFRESH_TOKEN de Vercel.
// S03-R · "Falta la tabla" se reconoce SOLO por su código (42P01 de Postgres / PGRST205 de Supabase). Cualquier otro
// error se muestra: nunca se trata como "no hay conexión" ni se escribe en otro lado.
const faltaTabla = (e: { code?: string }) => e.code === "42P01" || e.code === "PGRST205";
export class ErrorGoogleGuardado extends Error {}

export type TokensGoogle = { principal: string | null; anterior: string | null };

export async function tokensGuardados(): Promise<TokensGoogle> {
  const deVercel = process.env.GOOGLE_REFRESH_TOKEN || null;
  if (!pushConfigurado()) return { principal: deVercel, anterior: null };
  const db = cliente();
  const uid = await idDelDueno();
  const nueva = await db.from("panel_google").select("refresh_token, refresh_anterior").eq("user_id", uid).maybeSingle();
  if (!nueva.error) return { principal: (nueva.data?.refresh_token as string | undefined) || deVercel, anterior: (nueva.data?.refresh_anterior as string | null | undefined) ?? null };
  if (!faltaTabla(nueva.error)) throw new ErrorGoogleGuardado("No se pudo leer tu conexión con Google; intenta de nuevo en un momento.");
  const vieja = await db.from("panel_config").select("google_refresh_token").eq("user_id", uid).maybeSingle();
  if (vieja.error) throw new ErrorGoogleGuardado("No se pudo leer tu conexión con Google; intenta de nuevo en un momento.");
  return { principal: (vieja.data?.google_refresh_token as string | null) || deVercel, anterior: null };
}

export async function refreshGuardado(): Promise<string | null> {
  return (await tokensGuardados()).principal;
}

// Si Google rechaza la principal y la anterior sí sirve (S03-R), la anterior pasa a ser la principal
export async function promoverAnterior(token: string) {
  const db = cliente();
  const r = await db.from("panel_google").update({ refresh_token: token, refresh_anterior: null, updated_at: new Date().toISOString() }).eq("user_id", await idDelDueno()).eq("refresh_anterior", token);
  if (r.error) console.error("Google: no se pudo actualizar la conexión", r.error.code);
}

export async function guardarRefresh(token: string | null) {
  const db = cliente();
  const uid = await idDelDueno();
  const r = token
    ? await db.from("panel_google").upsert({ user_id: uid, refresh_token: token, refresh_anterior: null, updated_at: new Date().toISOString() })
    : await db.from("panel_google").delete().eq("user_id", uid);
  if (!r.error) return;
  if (!faltaTabla(r.error)) throw new ErrorGoogleGuardado("No se pudo guardar tu conexión con Google; intenta de nuevo en un momento.");
  // Sin el SQL 1.3 todavía: como antes, en la columna de ajustes
  const { data, error } = await db.from("panel_config").select("user_id").eq("user_id", uid).maybeSingle();
  if (error) throw new ErrorGoogleGuardado("No se pudo guardar tu conexión con Google; intenta de nuevo en un momento.");
  const v = data
    ? await db.from("panel_config").update({ google_refresh_token: token, updated_at: new Date().toISOString() }).eq("user_id", uid)
    : await db.from("panel_config").insert({ user_id: uid, google_refresh_token: token });
  if (v.error) throw new Error(v.error.code === "42703" ? "Falta actualizar tu base de datos: entra a Menú › Ajustes › Configurar base de datos." : v.error.message);
}

export const urlRegreso = (origen: string) => `${origen}/api/google/callback`;
