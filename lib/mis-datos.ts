// Nube F2 · Tus datos del Optimizador: descargarlos (cualquier modo) y borrar tu cuenta (TAOS Nube).
// Con la llave secreta, pero SIEMPRE con tu user_id explícito (el de tu sesión o, en tu versión propia, el del dueño).
import type { SupabaseClient } from "@supabase/supabase-js";

export const APP_DATOS = "Optimizador de Vida";
// Tablas del Optimizador con datos de cada persona (todas se borran en cascada con la cuenta)
export const TABLAS_MIAS = ["panel_config", "panel_google", "panel_mantenimiento", "panel_medicina_avisos", "panel_operaciones", "panel_tick_ejecuciones", "push_subscriptions"] as const;
// Columnas que nunca salen en la descarga: las llaves de tu conexión con Google (con ellas alguien podría entrar a tu cuenta)
const OCULTAS: Record<string, string[]> = { panel_google: ["refresh_token", "refresh_anterior"], panel_config: ["google_refresh_token"] };
export const CARPETAS_ARCHIVOS = ["estados-de-cuenta", "documentos"] as const;

const noInstalada = (e: { code?: string; message: string }) => ["42P01", "PGRST205", "PGRST204"].includes(e.code ?? "") || /does not exist|could not find the|schema cache/i.test(e.message);

export async function exportarMisDatos(db: SupabaseClient, usuario: string, tablas: readonly string[] = TABLAS_MIAS) {
  const datos: Record<string, unknown[] | "no instalada"> = {};
  for (const t of tablas) {
    const q = db.from(t).select("*").eq("user_id", usuario);
    const { data, error } = t === "push_subscriptions" ? await q.eq("app", "panel") : await q;
    if (error) {
      if (noInstalada(error)) datos[t] = "no instalada";
      else throw new Error(`No se pudo leer ${t}: ${error.message}`);
      continue;
    }
    datos[t] = (data ?? []).map((fila: Record<string, unknown>) => {
      const limpia = { ...fila };
      for (const c of OCULTAS[t] ?? []) if (c in limpia) limpia[c] = limpia[c] ? "(guardado, no se incluye)" : null;
      return limpia;
    });
  }
  return { app: APP_DATOS, generado: new Date().toISOString(), usuario, datos };
}

// Borra para siempre: tus archivos de las apps TAOS y después tu usuario (Postgres borra en cascada todas tus filas)
export async function borrarCuenta(admin: SupabaseClient, usuario: string): Promise<{ archivos: number }> {
  if (!/^[0-9a-f-]{36}$/i.test(usuario)) throw new Error("Usuario inválido");
  let archivos = 0;
  for (const carpeta of CARPETAS_ARCHIVOS) {
    for (let vuelta = 0; vuelta < 50; vuelta++) {
      const { data, error } = await admin.storage.from(carpeta).list(usuario, { limit: 100 });
      if (error || !data?.length) break;
      const rutas = data.map((a) => `${usuario}/${a.name}`);
      const quitar = await admin.storage.from(carpeta).remove(rutas);
      if (quitar.error) throw new Error(`No se pudieron borrar tus archivos: ${quitar.error.message}`);
      archivos += rutas.length;
    }
  }
  const { error } = await admin.auth.admin.deleteUser(usuario);
  if (error) throw new Error(`No se pudo borrar tu cuenta: ${error.message}`);
  return { archivos };
}
