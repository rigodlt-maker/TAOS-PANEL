// S14-C · Despertador de medicinas: cada 15 minutos el servidor de TAOS llama (firmado) y aquí se manda cada aviso
// que ya tocó. Orden seguro:
//   1. Tomar el turno de 15 minutos (si otro ya lo tiene o ya lo terminó, no se repite).
//   2. Apartar cada aviso por celular ANTES de mandarlo (dos revisiones nunca mandan el mismo a la vez).
//   3. Volver a leer tus medicinas: si ya la marcaste, la quitaste o cambiaste el horario, ese aviso se cancela.
//   4. Mandar y anotar el resultado de cada uno; solo quien tiene la ficha vigente puede anotarlo.
// Límite honesto: el servicio de notificaciones y la base de datos no comparten transacción. Si el servicio acepta un aviso
// y el servidor se cae antes de anotarlo, ese aviso puede volver a llegar una vez. Nunca se marca una medicina como tomada.
import { horarios, hora12, leerMedicinasDirecto, porAvisar, revisionDe, textoDosis, tomada, firmar, type Medicina } from "./medicinas";
import { cliente, enviarA, idDelDueno, idDispositivo, suscripciones, type AvisoPush, type SuscripcionPush } from "./push";
import type { Tick } from "./tick-firma";

const LEASE_SEG = 120; // mayor que lo que tarda un lote (envíos en paralelo con 10 s de límite cada uno)
const MAX_LOTE = 40;

type Item = { medicina_id: string; revision: string; fecha: string; hora: string; dispositivo: string };
const claveItem = (x: Item) => `${x.medicina_id}|${x.revision}|${x.fecha}|${x.hora}|${x.dispositivo}`;
const faltaSql = (m: string) => /panel_tick|panel_avisos|could not find the function|schema cache|does not exist/i.test(m);

export type ResultadoTick = { status: number; estado: string; aceptados?: number; pendientes?: number; cancelados?: number };

function aviso(m: Medicina, fecha: string, hora: string, origen: string): AvisoPush {
  return {
    titulo: `💊 Hora de tu ${m.nombre}`,
    cuerpo: `${textoDosis(m)} · ${hora12(hora)}${m.nota ? ` · ${m.nota}` : ""}`,
    url: "/medicinas",
    etiqueta: `medicina-${m.id}-${fecha}-${hora}`,
    imagen: m.foto ? `${origen}/api/medicinas/foto/${m.id}?k=${firmar(m.id)}` : undefined,
    acciones: [{ action: "tomada", title: "✅ Ya me la tomé" }],
    tomar: `/api/medicinas/tomada?${new URLSearchParams({ id: m.id, fecha, hora, k: firmar(`${fecha} ${m.id}@${hora}`) })}`,
  };
}

export async function ejecutarTick(tick: Tick, origen: string, ahora = Date.now()): Promise<ResultadoTick> {
  const db = cliente();
  const uid = await idDelDueno();
  const rec = await db.rpc("panel_tick_reclamar", { p_usuario: uid, p_slot: tick.slot, p_jti: tick.jti, p_lease_seg: LEASE_SEG });
  if (rec.error) return faltaSql(rec.error.message) ? { status: 503, estado: "falta_sql" } : { status: 500, estado: "error" };
  const { estado, token } = rec.data as { estado: string; token?: string };
  if (estado !== "reclamado" || !token) return { status: estado === "en_curso" ? 202 : 200, estado };

  const terminar = (e: string, detalle: string) => db.rpc("panel_tick_terminar", { p_usuario: uid, p_slot: tick.slot, p_token: token, p_estado: e, p_detalle: detalle });
  try {
    // Limpieza una vez al día (lo viejo ya no sirve): recibos de guardados, avisos e intentos de contraseña
    if (tick.slot % 96 === 0) await limpiar(ahora);

    const d = await leerMedicinasDirecto();
    const toca = porAvisar({ ...d, enviados: [] }, ahora);
    const subs = await suscripciones();
    const porId = new Map(subs.map((s) => [idDispositivo(s.endpoint), s] as [string, SuscripcionPush]));
    const items: Item[] = toca
      .flatMap(({ m, fecha, hora }) => [...porId.keys()].map((dispositivo) => ({ medicina_id: m.id, revision: revisionDe(m), fecha, hora, dispositivo })))
      .slice(0, MAX_LOTE);
    if (!items.length) {
      await terminar("completado", subs.length ? "nada que avisar" : "sin celulares con avisos");
      return { status: 200, estado: "completado", aceptados: 0 };
    }
    const apartados = await db.rpc("panel_avisos_reclamar", { p_usuario: uid, p_items: items, p_token: token, p_lease_seg: LEASE_SEG });
    if (apartados.error) throw new Error(apartados.error.message);
    const mios = (apartados.data as (Item & { fecha: string })[]).map((x) => ({ ...x, fecha: String(x.fecha).slice(0, 10) }));

    // Justo antes de mandar: ¿sigue tocando?
    const fresco = await leerMedicinasDirecto();
    const resultados = await Promise.all(
      mios.map(async (x) => {
        const m = fresco.lista.find((y) => y.id === x.medicina_id);
        const s = porId.get(x.dispositivo);
        const vigente = m && revisionDe(m) === x.revision && horarios(m).includes(x.hora) && !tomada(fresco, x.fecha, m.id, x.hora);
        const estado = !vigente || !s ? "cancelado" : await enviarA(s, aviso(m!, x.fecha, x.hora, origen));
        return { ...x, estado };
      }),
    );
    const acuse = await db.rpc("panel_avisos_acusar", { p_usuario: uid, p_token: token, p_resultados: resultados });
    if (acuse.error) throw new Error(acuse.error.message);
    const cuenta = (e: string) => resultados.filter((r) => r.estado === e).length;
    const r = { aceptados: cuenta("aceptado"), pendientes: cuenta("pendiente"), cancelados: cuenta("cancelado") };
    await terminar(r.pendientes ? "fallido" : "completado", `${r.aceptados} aceptados, ${r.pendientes} por reintentar, ${r.cancelados} cancelados`);
    return { status: 200, estado: r.pendientes ? "fallido" : "completado", ...r };
  } catch (e) {
    console.error("Despertador:", (e as Error).message);
    await terminar("fallido", "error interno").then(
      () => {},
      () => {},
    );
    return { status: 500, estado: "error" };
  }
}

async function limpiar(ahora: number) {
  const db = cliente();
  const hace = (dias: number) => new Date(ahora - dias * 86_400_000).toISOString();
  await Promise.allSettled([
    db.from("panel_operaciones").delete().lt("creado", hace(30)),
    db.from("panel_medicina_avisos").delete().lt("actualizado", hace(30)),
    db.from("panel_intentos").delete().lt("actualizado", hace(2)),
  ]);
}

// Para Ajustes: cuándo revisó por última vez y qué pasó (o si falta correr el SQL de seguridad 1.3)
export async function estadoDespertador(): Promise<{ faltaSql: boolean; ultima: { cuando: string; estado: string; detalle: string | null } | null }> {
  try {
    const { data, error } = await cliente()
      .from("panel_tick_ejecuciones")
      .select("actualizado, estado, detalle")
      .eq("user_id", await idDelDueno())
      .order("actualizado", { ascending: false })
      .limit(1);
    if (error) return { faltaSql: faltaSql(error.message), ultima: null };
    const u = data?.[0];
    return { faltaSql: false, ultima: u ? { cuando: u.actualizado as string, estado: u.estado as string, detalle: (u.detalle as string | null) ?? null } : null };
  } catch {
    return { faltaSql: false, ultima: null };
  }
}

export { claveItem };
