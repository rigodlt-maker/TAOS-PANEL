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

// Primero la conexión que guardó el botón (la más reciente, con los permisos nuevos); si no hay, GOOGLE_REFRESH_TOKEN de Vercel
export async function refreshGuardado(): Promise<string | null> {
  const deVercel = process.env.GOOGLE_REFRESH_TOKEN || null;
  if (!pushConfigurado()) return deVercel;
  try {
    const { data, error } = await cliente().from("panel_config").select("google_refresh_token").eq("user_id", await idDelDueno()).maybeSingle();
    if (error) return deVercel;
    return (data?.google_refresh_token as string | null) || deVercel;
  } catch {
    return deVercel;
  }
}

export async function guardarRefresh(token: string | null) {
  const db = cliente();
  const uid = await idDelDueno();
  // Si todavía no hay fila de ajustes, se crea; si ya hay, solo se cambia la conexión
  const { data } = await db.from("panel_config").select("user_id").eq("user_id", uid).maybeSingle();
  const r = data
    ? await db.from("panel_config").update({ google_refresh_token: token, updated_at: new Date().toISOString() }).eq("user_id", uid)
    : await db.from("panel_config").insert({ user_id: uid, google_refresh_token: token });
  if (r.error) throw new Error(/does not exist|schema cache|column/i.test(r.error.message) ? "Falta actualizar tu base de datos: entra a Más › Ajustes › Configurar base de datos." : r.error.message);
}

export const urlRegreso = (origen: string) => `${origen}/api/google/callback`;
