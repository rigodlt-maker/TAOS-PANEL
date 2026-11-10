// S14-B · Guardar tus ajustes sin que un cambio pise a otro.
// Antes: cada pantalla leía TODO el JSON de ajustes y lo volvía a escribir completo; si dos cosas se guardaban a la vez
// (una medicina y tu ciudad, o el despertador y "Ya me la tomé"), la última borraba la otra.
// Ahora: se lee con su número de versión, se calcula SOLO la parte que cambia (p. ej. "medicinas") y se guarda con
// panel_guardar, que bloquea la fila y rechaza si alguien la cambió mientras tanto; entonces se vuelve a leer y se
// vuelve a aplicar el MISMO cambio sobre lo nuevo (hasta 5 veces). Si llega dos veces el mismo guardado (op_id),
// no se aplica dos veces. Un error al leer nunca se trata como "no hay datos": se detiene sin guardar.
import { createHash } from "node:crypto";
import { cliente, idDelDueno } from "./push";

export type Datos = Record<string, unknown>;
export type Operacion = { id: string; huella: string };

// ¿Falta correr el SQL de seguridad 1.3? (la pantalla de Ajustes lo avisa; mientras, se usa el guardado anterior)
// S14-B2 · Contrato preciso, nunca por el texto del error: la ÚNICA señal de "instalación sin 1.3" es que la columna
// panel_config.version no exista (código 42703 de Postgres). Si la columna existe, la instalación ya es 1.3 y cualquier
// error del guardado seguro se muestra y NO se escribe por la ruta anterior (además, el SQL 1.3 bloquea esa ruta).
const g = globalThis as unknown as { __faltaSqlSeguridad?: boolean };
export const faltaSqlSeguridad = () => g.__faltaSqlSeguridad === true;
type ErrorDb = { code?: string; message: string };
export const sinColumnaVersion = (e: ErrorDb) => e.code === "42703" && /\bversion\b/.test(e.message);

export const huellaDe = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("base64url").slice(0, 32);

export class ConflictoDeGuardado extends Error {}

type Cliente = Pick<ReturnType<typeof cliente>, "from" | "rpc">;

export async function guardarDatos(cambio: (datos: Datos) => Datos, op?: Operacion, intentos = 5, db: Cliente = cliente(), usuario?: string): Promise<"ok" | "repetida"> {
  const uid = usuario ?? (await idDelDueno());
  for (let i = 0; i < intentos; i++) {
    const leida = await db.from("panel_config").select("datos, version").eq("user_id", uid).maybeSingle();
    if (leida.error) {
      if (sinColumnaVersion(leida.error)) return guardarSinVersion(cambio, uid, db);
      throw new Error("No se pudieron leer tus datos; no se guardó nada. Intenta de nuevo en un momento.");
    }
    const datos = (leida.data?.datos as Datos | null) ?? {};
    const version = Number(leida.data?.version ?? 0);
    const cambios = cambio(datos);
    const r = await db.rpc("panel_guardar", { p_usuario: uid, p_version: version, p_cambios: cambios, p_op_id: op?.id ?? null, p_huella: op?.huella ?? null });
    if (r.error) {
      // Instalación a medias (columna sí, función no): avisar y no guardar
      if (r.error.code === "PGRST202") g.__faltaSqlSeguridad = true;
      console.error("panel_guardar:", r.error.code, r.error.message);
      throw new Error("No se pudo guardar con seguridad; no se cambió nada. Intenta de nuevo en un momento.");
    }
    g.__faltaSqlSeguridad = false;
    const estado = (r.data as { estado: string }).estado;
    if (estado === "ok") return "ok";
    if (estado === "repetida") return "repetida";
    if (estado === "conflicto_op") throw new ConflictoDeGuardado("Ese cambio ya se había hecho con otros datos. Revisa y vuelve a intentarlo.");
    // "version": alguien guardó primero; se vuelve a leer y a aplicar el mismo cambio
  }
  throw new ConflictoDeGuardado("Se estaban guardando varios cambios a la vez. Revisa que esté como querías y vuelve a intentarlo.");
}

// Mientras no se corre el SQL de seguridad 1.3: el guardado anterior (sin versión), pero sin escribir encima si falla la lectura
async function guardarSinVersion(cambio: (datos: Datos) => Datos, uid: string, db: Cliente): Promise<"ok"> {
  g.__faltaSqlSeguridad = true;
  const { data, error } = await db.from("panel_config").select("datos").eq("user_id", uid).maybeSingle();
  if (error) throw new Error(/does not exist|schema cache/i.test(error.message) ? "Falta crear la tabla en Supabase: entra a Menú › Ajustes › Configurar base de datos." : "No se pudieron leer tus datos; no se guardó nada.");
  const actuales = (data?.datos as Datos | null) ?? {};
  const r = await db.from("panel_config").upsert({ user_id: uid, datos: { ...actuales, ...cambio(actuales) }, updated_at: new Date().toISOString() });
  if (r.error) throw new Error(r.error.message);
  return "ok";
}
