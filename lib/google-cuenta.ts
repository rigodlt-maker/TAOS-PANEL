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
const faltaTabla = (m: string) => /panel_google|does not exist|schema cache|could not find/i.test(m);

export async function refreshGuardado(): Promise<string | null> {
  const deVercel = process.env.GOOGLE_REFRESH_TOKEN || null;
  if (!pushConfigurado()) return deVercel;
  try {
    const db = cliente();
    const uid = await idDelDueno();
    const nueva = await db.from("panel_google").select("refresh_token").eq("user_id", uid).maybeSingle();
    if (!nueva.error) return (nueva.data?.refresh_token as string | undefined) || deVercel;
    if (!faltaTabla(nueva.error.message)) return deVercel;
    const vieja = await db.from("panel_config").select("google_refresh_token").eq("user_id", uid).maybeSingle();
    return (vieja.data?.google_refresh_token as string | null) || deVercel;
  } catch {
    return deVercel;
  }
}

export async function guardarRefresh(token: string | null) {
  const db = cliente();
  const uid = await idDelDueno();
  const r = token
    ? await db.from("panel_google").upsert({ user_id: uid, refresh_token: token, updated_at: new Date().toISOString() })
    : await db.from("panel_google").delete().eq("user_id", uid);
  if (!r.error) return;
  if (!faltaTabla(r.error.message)) throw new Error(r.error.message);
  // Sin el SQL 1.3 todavía: como antes, en la columna de ajustes
  const { data } = await db.from("panel_config").select("user_id").eq("user_id", uid).maybeSingle();
  const v = data
    ? await db.from("panel_config").update({ google_refresh_token: token, updated_at: new Date().toISOString() }).eq("user_id", uid)
    : await db.from("panel_config").insert({ user_id: uid, google_refresh_token: token });
  if (v.error) throw new Error(/does not exist|schema cache|column/i.test(v.error.message) ? "Falta actualizar tu base de datos: entra a Menú › Ajustes › Configurar base de datos." : v.error.message);
}

export const urlRegreso = (origen: string) => `${origen}/api/google/callback`;
