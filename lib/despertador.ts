// S14-C · Despertador de medicinas: cada 15 minutos el servidor de TAOS llama (firmado) y aquí se manda cada aviso
// que ya tocó. Orden seguro:
//   1. Tomar el turno de 15 minutos (si otro ya lo tiene o ya lo terminó, no se repite).
//   2. Apartar cada aviso por celular ANTES de mandarlo (dos revisiones nunca mandan el mismo a la vez).
//   3. Volver a leer tus medicinas: si ya la marcaste, la quitaste o cambiaste el horario, ese aviso se cancela.
//   4. Mandar y anotar el resultado de cada uno; solo quien tiene la ficha vigente puede anotarlo.
// Límite honesto: el servicio de notificaciones y la base de datos no comparten transacción. Si el servicio acepta un aviso
// y el servidor se cae antes de anotarlo, ese aviso puede volver a llegar una vez. Nunca se marca una medicina como tomada.
import { horarios, hora12, leerMedicinasEstricto, porAvisar, revisionDe, textoDosis, tomada, firmar, type Medicina, type Medicinas } from "./medicinas";
import { DESFASE } from "./config";
import { cliente, enviarA, idDelDueno, idDispositivo, suscripciones, type AvisoPush, type SuscripcionPush } from "./push";
import type { Tick } from "./tick-firma";

export const LEASE_SEG = 120; // mayor que lo que tarda un lote (envíos en paralelo con 10 s de límite cada uno)
export const MAX_LOTE = 40;
const MAX_LOTES = 4; // por turno: hasta 160 avisos (15 medicinas × 10 celulares)
const PLAZO_ENVIO_MS = (LEASE_SEG - 30) * 1000; // pasado esto la ficha podría vencer: lo que falte se devuelve a la cola

type Item = { medicina_id: string; revision: string; fecha: string; hora: string; dispositivo: string; toma_en?: string };
type Resultado = Item & { estado: "aceptado" | "invalido" | "pendiente" | "cancelado"; espera_seg?: number };
const claveItem = (x: Item) => `${x.medicina_id}|${x.revision}|${x.fecha}|${x.hora}|${x.dispositivo}`;
// Contrato preciso de "falta el SQL 1.3": la función no existe (PostgREST PGRST202) o la tabla no existe (42P01 / PGRST205)
const faltaSql = (e: { code?: string }) => ["PGRST202", "PGRST205", "42P01", "42883"].includes(e.code ?? "");

export type ResultadoTick = { status: number; estado: string; aceptados?: number; pendientes?: number; cancelados?: number; lotes?: number };

// Todo lo que el despertador usa de afuera (así las pruebas lo corren contra Postgres real y servicios falsos)
export type Dependencias = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
  leer: () => Promise<Medicinas>;
  suscripciones: () => Promise<SuscripcionPush[]>;
  enviar: (s: SuscripcionPush, a: AvisoPush) => Promise<"aceptado" | "invalido" | "pendiente">;
  limpiar: (ahora: number) => Promise<void>;
  usuario: () => Promise<string>;
  reloj: () => number;
};

const deps = (): Dependencias => ({
  rpc: async (fn, args) => {
    const r = await cliente().rpc(fn, args);
    return { data: r.data, error: r.error };
  },
  leer: leerMedicinasEstricto,
  suscripciones,
  enviar: enviarA,
  limpiar,
  usuario: idDelDueno,
  reloj: Date.now,
});

function aviso(m: Medicina, fecha: string, hora: string, origen: string): AvisoPush {
  return {
    titulo: `💊 Hora de tu ${m.nombre}`,
    cuerpo: `${textoDosis(m)} · ${hora12(hora)}${m.nota ? ` · ${m.nota}` : ""}`,
    url: "/medicinas",
    // Misma etiqueta para la misma toma: si llegara dos veces, el celular reemplaza la primera (no se ven dos)
    etiqueta: `medicina-${m.id}-${fecha}-${hora}`,
    imagen: m.foto ? `${origen}/api/medicinas/foto/${m.id}?k=${firmar(m.id)}` : undefined,
    acciones: [{ action: "tomada", title: "✅ Ya me la tomé" }],
    tomar: `/api/medicinas/tomada?${new URLSearchParams({ id: m.id, fecha, hora, k: firmar(`${fecha} ${m.id}@${hora}`) })}`,
  };
}

export async function ejecutarTick(tick: Tick, origen: string, ahora = Date.now(), d: Dependencias = deps()): Promise<ResultadoTick> {
  const uid = await d.usuario();
  const rec = await d.rpc("panel_tick_reclamar", { p_usuario: uid, p_slot: tick.slot, p_jti: tick.jti, p_lease_seg: LEASE_SEG });
  if (rec.error) return faltaSql(rec.error) ? { status: 503, estado: "falta_sql" } : { status: 500, estado: "error" };
  const { estado, token } = rec.data as { estado: string; token?: string };
  if (estado !== "reclamado" || !token) return { status: estado === "en_curso" ? 202 : 200, estado };

  const terminar = (e: string, detalle: string) => d.rpc("panel_tick_terminar", { p_usuario: uid, p_slot: tick.slot, p_token: token, p_estado: e, p_detalle: detalle });
  let enMano: Item[] = []; // apartados por este turno y todavía sin anotar
  const devolver = async (motivo: string) => {
    // Lo apartado vuelve a la cola en 5 minutos (nunca se cancela por un error)
    if (enMano.length) await d.rpc("panel_avisos_acusar", { p_usuario: uid, p_token: token, p_resultados: enMano.map((x) => ({ ...x, estado: "pendiente", espera_seg: 300 })) }).catch(() => {});
    enMano = [];
    console.error("Despertador:", motivo);
  };
  try {
    // Limpieza diaria por tiempo transcurrido (una sola revisión la gana)
    const toca = await d.rpc("panel_limpieza_toca", { p_usuario: uid, p_horas: 24 });
    if (!toca.error && toca.data === true) await d.limpiar(ahora).catch(() => {});

    // 1) Descubrir: TODAS las tomas que tocan × todos los celulares (sin recortar; la cola decide el lote)
    const lectura = await d.leer();
    const subs = await d.suscripciones();
    const porId = new Map(subs.map((s) => [idDispositivo(s.endpoint), s] as [string, SuscripcionPush]));
    const items: Item[] = porAvisar({ ...lectura, enviados: [] }, ahora).flatMap(({ m, fecha, hora }) =>
      [...porId.keys()].map((dispositivo) => ({ medicina_id: m.id, revision: revisionDe(m), fecha, hora, dispositivo, toma_en: new Date(Date.parse(`${fecha}T${hora}:00${DESFASE}`)).toISOString() })),
    );

    const total = { aceptado: 0, pendiente: 0, cancelado: 0, invalido: 0 };
    const inicio = d.reloj();
    let lotes = 0;
    for (; lotes < MAX_LOTES; lotes++) {
      // 2) Apartar un lote de la cola (incluye reintentos de tomas viejas que ya no se "descubren")
      const apartados = await d.rpc("panel_avisos_reclamar", { p_usuario: uid, p_items: lotes === 0 ? items : [], p_token: token, p_lease_seg: LEASE_SEG, p_limite: MAX_LOTE });
      if (apartados.error) throw new Error(apartados.error.message);
      const mios = (apartados.data as Item[]).map((x) => ({ medicina_id: x.medicina_id, revision: x.revision, fecha: String(x.fecha).slice(0, 10), hora: x.hora, dispositivo: x.dispositivo }));
      enMano = mios;
      if (!mios.length) break;

      // 3) Justo antes de mandar: volver a leer. Si falla la lectura, error (se devuelve a la cola, no se cancela)
      const fresco = await d.leer();
      const resultados: Resultado[] = await Promise.all(
        mios.map(async (x): Promise<Resultado> => {
          const m = fresco.lista.find((y) => y.id === x.medicina_id);
          const vigente = m && revisionDe(m) === x.revision && horarios(m).includes(x.hora) && !tomada(fresco, x.fecha, m.id, x.hora);
          if (!vigente) return { ...x, estado: "cancelado" }; // lectura correcta que confirma: ya no toca
          const s = porId.get(x.dispositivo);
          if (!s) return { ...x, estado: "invalido" }; // ese celular ya no tiene avisos
          if (d.reloj() - inicio > PLAZO_ENVIO_MS) return { ...x, estado: "pendiente", espera_seg: 60 };
          return { ...x, estado: await d.enviar(s, aviso(m, x.fecha, x.hora, origen)) };
        }),
      );
      const acuse = await d.rpc("panel_avisos_acusar", { p_usuario: uid, p_token: token, p_resultados: resultados });
      if (acuse.error) throw new Error(acuse.error.message);
      enMano = [];
      for (const r of resultados) total[r.estado]++;
      if (mios.length < MAX_LOTE || d.reloj() - inicio > PLAZO_ENVIO_MS) {
        lotes++;
        break;
      }
    }
    const detalle = `${total.aceptado} aceptados, ${total.pendiente} por reintentar, ${total.cancelado} cancelados${total.invalido ? `, ${total.invalido} celulares sin avisos` : ""}`;
    const final = total.pendiente ? "fallido" : "completado";
    await terminar(final, lotes ? detalle : subs.length ? "nada que avisar" : "sin celulares con avisos");
    return { status: 200, estado: final, aceptados: total.aceptado, pendientes: total.pendiente, cancelados: total.cancelado, lotes };
  } catch (e) {
    await devolver((e as Error).message);
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
    if (error) return { faltaSql: faltaSql(error), ultima: null };
    const u = data?.[0];
    return { faltaSql: false, ultima: u ? { cuando: u.actualizado as string, estado: u.estado as string, detalle: (u.detalle as string | null) ?? null } : null };
  } catch {
    return { faltaSql: false, ultima: null };
  }
}

export { claveItem };
