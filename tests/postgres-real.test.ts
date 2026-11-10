// Pruebas de Seguridad 1.3 contra Postgres REAL (16), con conexiones independientes y el rol service_role, como en
// Supabase. Cubre lo que pidió la reverificación de Codex: B1/B2, C1/C2/C3, S17-A/B, S03-R y carreras con 2 conexiones.
// Se activa con TAOS_PG_URL=postgres://usuario:clave@localhost/postgres (sin la variable, se salta).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { ejecutarTick, MAX_LOTE, type Dependencias } from "../lib/despertador";
import { guardarDatos } from "../lib/guardar";
import { reservarIntento, liberarIntento } from "../lib/intentos";
import { agregarMedicina, baseDeMedicina, editarMedicina, limpiarMedicinas, quitarMedicina, type Medicina, type Medicinas } from "../lib/medicinas";
import { ConflictoDeCampos, parche } from "../lib/parche";
import { idDispositivo, type SuscripcionPush } from "../lib/push";
import { A, baseNueva, clienteDe, PG, rpcDe, SQL } from "./ayuda/pg";

const t = (nombre: string, f: () => Promise<void>) => test(nombre, { skip: PG ? false : "sin TAOS_PG_URL" }, f);
const VIEJA_12 = `create table public.panel_config (user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  datos jsonb not null default '{}', updated_at timestamptz not null default now());
alter table public.panel_config add column google_refresh_token text;`;
const MED = (id: string, extra: Partial<Medicina> = {}): Medicina => ({ id, nombre: `Medicina ${id}`, cantidad: 1, unidad: "pastilla", cadaHoras: 24, primera: "08:00", nota: "", foto: null, ...extra });

async function leerDatos(c: { query: (q: string, p?: unknown[]) => Promise<{ rows: { datos: Record<string, unknown> }[] }> }) {
  return (await c.query("select datos from public.panel_config where user_id = $1", [A])).rows[0]?.datos ?? {};
}
const medicinasDe = (d: Record<string, unknown>) => limpiarMedicinas(d.medicinas);

// ---------- SQL: limpio, actualización desde 1.2, regreso a la versión anterior y segunda migración ----------

t("SQL limpio: corre dos veces; los roles públicos no ven tablas ni usan funciones; service_role sí", async () => {
  const b = await baseNueva();
  try {
    await b.dueno.query(SQL);
    await b.dueno.query("grant select, insert, update, delete on all tables in schema public to anon, authenticated");
    for (const rol of ["anon", "authenticated"]) {
      const c = await b.conectar(rol);
      await c.query(`select set_config('request.jwt.claim.sub', '${A}', false)`);
      for (const tabla of ["panel_config", "panel_google", "panel_intentos", "panel_operaciones", "panel_tick_ejecuciones", "panel_medicina_avisos", "panel_mantenimiento"])
        assert.equal((await c.query(`select count(*)::int n from public.${tabla}`)).rows[0].n, 0, `${rol} ve ${tabla}`);
      for (const q of [`select public.panel_guardar('${A}', 0, '{}')`, "select * from public.panel_reservar_intento('k')", `select public.panel_limpieza_toca('${A}')`])
        await assert.rejects(c.query(q), /permission denied/, `${rol}: ${q}`);
    }
    const s = await b.conectar();
    assert.equal((await rpcDe(s)("panel_guardar", { p_usuario: A, p_version: 0, p_cambios: { x: 1 } })).error, null);
  } finally {
    await b.cerrar();
  }
});

t("S03-R: 1.2 → 1.3 → regreso a 1.2 y reconectar Google → 1.3 otra vez: se conservan los DOS tokens y gana el nuevo", async () => {
  const b = await baseNueva(`${VIEJA_12} insert into public.panel_config (user_id, datos, google_refresh_token) values ('${A}', '{"nombre":"Alex"}', 'token-A');`);
  try {
    let g = (await b.dueno.query("select refresh_token, refresh_anterior from panel_google")).rows[0];
    assert.deepEqual(g, { refresh_token: "token-A", refresh_anterior: null });
    // Regreso a 1.2 (su código escribe la columna vieja) y se reconecta Google: token B
    const vieja = await b.conectar();
    await vieja.query(`update public.panel_config set google_refresh_token = 'token-B', updated_at = now() where user_id = '${A}'`);
    await b.dueno.query(SQL); // segunda migración
    g = (await b.dueno.query("select refresh_token, refresh_anterior from panel_google")).rows[0];
    assert.deepEqual(g, { refresh_token: "token-B", refresh_anterior: "token-A" }, "B (el más nuevo) queda como principal y A como anterior");
    assert.equal((await b.dueno.query("select google_refresh_token from panel_config")).rows[0].google_refresh_token, null);
    await b.dueno.query(SQL); // tercera vez: nada cambia
    assert.deepEqual((await b.dueno.query("select refresh_token, refresh_anterior from panel_google")).rows[0], g);
    assert.deepEqual(await leerDatos(b.dueno), { nombre: "Alex" });
  } finally {
    await b.cerrar();
  }
});

t("S14-B2: ya con 1.3, el guardado completo de la versión anterior (upsert sin versión) se RECHAZA y no pisa nada", async () => {
  const b = await baseNueva(`${VIEJA_12} insert into public.panel_config (user_id, datos) values ('${A}', '{"nombre":"Alex"}');`);
  try {
    const s = await b.conectar();
    await assert.rejects(s.query(`insert into public.panel_config (user_id, datos) values ('${A}', '{"nombre":"Viejo"}') on conflict (user_id) do update set datos = excluded.datos`), /TAOS_VERSION_ANTERIOR/);
    assert.deepEqual(await leerDatos(b.dueno), { nombre: "Alex" });
    // La versión anterior todavía puede guardar Google en su columna (no toca tus ajustes): eso lo resuelve S03-R
    await s.query(`update public.panel_config set google_refresh_token = 'x' where user_id = '${A}'`);
  } finally {
    await b.cerrar();
  }
});

t("S14-B2: si la función segura falla (permiso negado, error de red), NO se usa el guardado anterior: error y nada escrito", async () => {
  const b = await baseNueva(`${VIEJA_12} insert into public.panel_config (user_id, datos) values ('${A}', '{"nombre":"Alex"}');`);
  try {
    await b.dueno.query("revoke execute on function public.panel_guardar(uuid, bigint, jsonb, text, text) from service_role");
    const s = clienteDe(await b.conectar());
    await assert.rejects(guardarDatos(() => ({ nombre: "Otro" }), undefined, 5, s, A), /No se pudo guardar con seguridad/);
    assert.deepEqual(await leerDatos(b.dueno), { nombre: "Alex" });
  } finally {
    await b.cerrar();
  }
});

t("S14-B2: instalación sin 1.3 (no existe la columna version): se reconoce por el código 42703 y guarda como antes", async () => {
  const b = await baseNueva(`${VIEJA_12} insert into public.panel_config (user_id, datos) values ('${A}', '{"nombre":"Alex"}');`, false);
  try {
    const s = clienteDe(await b.conectar());
    assert.equal(await guardarDatos(() => ({ ciudad: "Puebla" }), undefined, 5, s, A), "ok");
    assert.deepEqual(await leerDatos(b.dueno), { nombre: "Alex", ciudad: "Puebla" });
  } finally {
    await b.cerrar();
  }
});

// ---------- S14-B1: formularios atrasados, con dos conexiones ----------

async function conMedicinas(lista: Medicina[], extra: Record<string, unknown> = {}) {
  const b = await baseNueva();
  await b.dueno.query("insert into public.panel_config (user_id, datos) values ($1, $2)", [A, JSON.stringify({ ...extra, medicinas: { lista, tomas: {}, enviados: [] } })]);
  const [x, y] = [clienteDe(await b.conectar()), clienteDe(await b.conectar())];
  const medicinas = (f: (d: Medicinas) => Medicinas) => (datos: Record<string, unknown>) => ({ medicinas: limpiarMedicinas(f(limpiarMedicinas(datos.medicinas))) });
  return { b, x, y, medicinas };
}

t("S14-B1: dos ediciones de la misma medicina desde formularios abiertos a las 08:00: la segunda da CONFLICTO y no revierte el horario", async () => {
  const { b, x, y, medicinas } = await conMedicinas([MED("m1")]);
  try {
    const base = baseDeMedicina(MED("m1"));
    const enviado = (c: Partial<Medicina>) => ({ ...base, ...c });
    // Al mismo tiempo, por dos conexiones: A cambia la hora a 09:00; B (formulario viejo) solo cambia la nota
    const r = await Promise.allSettled([
      guardarDatos(medicinas((d) => editarMedicina(d, "m1", base, enviado({ primera: "09:00" }))), undefined, 5, x, A),
      guardarDatos(medicinas((d) => editarMedicina(d, "m1", base, enviado({ nota: "con alimentos" }))), undefined, 5, y, A),
    ]);
    // Ambos se aplican sin pisarse (campos distintos) — la hora nueva NO vuelve a 08:00
    assert.deepEqual(r.map((z) => z.status), ["fulfilled", "fulfilled"]);
    let m = medicinasDe(await leerDatos(b.dueno)).lista[0];
    assert.equal(m.primera, "09:00");
    assert.equal(m.nota, "con alimentos");
    // Un tercer formulario de las 08:00 que SÍ cambia la hora (a 10:00): choca con el 09:00 de A → conflicto, nada se guarda
    await assert.rejects(guardarDatos(medicinas((d) => editarMedicina(d, "m1", base, enviado({ primera: "10:00" }))), undefined, 5, x, A), (e) => e instanceof ConflictoDeCampos && e.campos.includes("primera"));
    m = medicinasDe(await leerDatos(b.dueno)).lista[0];
    assert.equal(m.primera, "09:00");
  } finally {
    await b.cerrar();
  }
});

t("S14-B1: quitar una medicina y luego enviar su formulario de edición viejo: NO reaparece", async () => {
  const { b, x, y, medicinas } = await conMedicinas([MED("m1"), MED("m2")]);
  try {
    await guardarDatos(medicinas((d) => quitarMedicina(d, "m1")), undefined, 5, x, A);
    await assert.rejects(guardarDatos(medicinas((d) => editarMedicina(d, "m1", baseDeMedicina(MED("m1")), { ...baseDeMedicina(MED("m1")), nota: "x" })), undefined, 5, y, A), (e) => e instanceof ConflictoDeCampos && e.campos.includes("id"));
    assert.deepEqual(medicinasDe(await leerDatos(b.dueno)).lista.map((m) => m.id), ["m2"]);
    // Agregar es otra cosa: crea una nueva con id nuevo
    await guardarDatos(medicinas((d) => agregarMedicina(d, { ...MED("z"), nombre: "Nueva" }, "m3")), undefined, 5, y, A);
    assert.deepEqual(medicinasDe(await leerDatos(b.dueno)).lista.map((m) => m.id), ["m2", "m3"]);
  } finally {
    await b.cerrar();
  }
});

t("S14-B1: dos pestañas con el nombre «Original»: A guarda «Nuevo», B guarda ciudad con su nombre viejo → el nombre se queda «Nuevo»", async () => {
  const b = await baseNueva();
  try {
    await b.dueno.query("insert into public.panel_config (user_id, datos) values ($1, $2)", [A, JSON.stringify({ nombre: "Original", ciudad: { nombre: "Ciudad de México", lat: 19.4, lon: -99.1 } })]);
    const [x, y] = [clienteDe(await b.conectar()), clienteDe(await b.conectar())];
    const base = { nombre: "Original", ciudad: "Ciudad de México", lugares: [], auto: null };
    const comparable = (d: Record<string, unknown>) => ({ nombre: d.nombre, ciudad: (d.ciudad as { nombre: string }).nombre, lugares: [], auto: null });
    const guardarForm = (env: typeof base, ciudadObj?: object) => (d: Record<string, unknown>) => {
      const c = parche(comparable(d), base, env);
      return { ...c, ...("ciudad" in c ? { ciudad: ciudadObj } : {}) };
    };
    await Promise.all([
      guardarDatos(guardarForm({ ...base, nombre: "Nuevo" }), undefined, 5, x, A),
      guardarDatos(guardarForm({ ...base, ciudad: "Puebla" }, { nombre: "Puebla", lat: 19, lon: -98 }), undefined, 5, y, A),
    ]);
    const d = await leerDatos(b.dueno);
    assert.equal(d.nombre, "Nuevo");
    assert.equal((d.ciudad as { nombre: string }).nombre, "Puebla");
    // Sin base (pantalla de una versión anterior): no se adivina
    await assert.rejects(guardarDatos((dd) => parche(comparable(dd), null, { ...base, nombre: "X" }), undefined, 5, x, A), ConflictoDeCampos);
  } finally {
    await b.cerrar();
  }
});

t("S14-B1: dos tomas distintas marcadas al mismo tiempo (2 conexiones) se conservan las dos", async () => {
  const { b, x, y, medicinas } = await conMedicinas([MED("m1"), MED("m2")]);
  try {
    const { marcarToma } = await import("../lib/medicinas");
    await Promise.all([
      guardarDatos(medicinas((d) => marcarToma(d, "2026-11-10", "m1", "08:00", true)), { id: randomUUID(), huella: "a" }, 5, x, A),
      guardarDatos(medicinas((d) => marcarToma(d, "2026-11-10", "m2", "08:00", true)), { id: randomUUID(), huella: "b" }, 5, y, A),
    ]);
    assert.deepEqual(medicinasDe(await leerDatos(b.dueno)).tomas["2026-11-10"].sort(), ["m1@08:00", "m2@08:00"]);
  } finally {
    await b.cerrar();
  }
});

// ---------- S17: intentos con dos conexiones ----------

t("S17: 20 intentos repartidos en 2 conexiones al mismo tiempo: pasan exactamente 5", async () => {
  const b = await baseNueva();
  try {
    const [x, y] = [rpcDe(await b.conectar()), rpcDe(await b.conectar())];
    const r = await Promise.all(Array.from({ length: 20 }, (_, i) => reservarIntento("9.9.9.9", i % 2 ? x : y)));
    assert.equal(r.filter((z) => z.permitido).length, 5);
  } finally {
    await b.cerrar();
  }
});

t("S17-B: una liberación de la ventana vieja no descuenta la ventana nueva, y liberar dos veces no descuenta dos", async () => {
  const b = await baseNueva();
  try {
    const x = rpcDe(await b.conectar());
    const viejo = await reservarIntento("8.8.8.8", x); // t=899: login correcto que empieza
    assert.ok(viejo.permitido);
    // Pasa la ventana (t=900) y llegan 5 intentos nuevos: bloqueo
    await b.dueno.query("update panel_intentos set ventana_desde = now() - interval '16 minutes'");
    for (let i = 0; i < 5; i++) assert.ok((await reservarIntento("8.8.8.8", x)).permitido);
    assert.equal((await reservarIntento("8.8.8.8", x)).permitido, false);
    // t=901: termina el login viejo y libera su intento → no toca la ventana nueva
    if (viejo.permitido) await liberarIntento(viejo, x);
    assert.equal((await reservarIntento("8.8.8.8", x)).permitido, false, "el bloqueo nuevo sigue");
    // En una ventana limpia: liberar el mismo intento dos veces solo descuenta uno
    await b.dueno.query("delete from panel_intentos");
    const r1 = await reservarIntento("7.7.7.7", x);
    await reservarIntento("7.7.7.7", x);
    if (r1.permitido) {
      await liberarIntento(r1, x);
      await liberarIntento(r1, x);
    }
    assert.equal((await b.dueno.query("select fallos from panel_intentos")).rows[0].fallos, 1);
  } finally {
    await b.cerrar();
  }
});

t("S17-A: con el SQL 1.3, un error de la base de datos NO usa contador por servidor: no disponible (503), sin revisar la contraseña", async () => {
  const b = await baseNueva();
  try {
    await b.dueno.query("revoke execute on function public.panel_reservar_intento(text, integer, integer, integer) from service_role");
    const x = rpcDe(await b.conectar());
    const r = await Promise.all(Array.from({ length: 20 }, () => reservarIntento("6.6.6.6", x)));
    assert.equal(r.filter((z) => z.permitido).length, 0);
    assert.ok(r.every((z) => !z.permitido && z.noDisponible));
  } finally {
    await b.cerrar();
  }
});

// ---------- S14-C: despertador contra Postgres real ----------

const sub = (n: number): SuscripcionPush => ({ endpoint: `https://push.example/${n}`, p256dh: "p", auth: "a", dispositivo: `cel ${n}` });
const ZONA_HOY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
// Hora local de hace N minutos (para que la toma "ya haya tocado")
const haceMin = (min: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(Date.now() - min * 60_000));

async function despertador(lista: Medicina[], celulares: number) {
  const b = await baseNueva();
  await b.dueno.query("insert into public.panel_config (user_id, datos) values ($1, $2)", [A, JSON.stringify({ medicinas: { lista, tomas: {}, enviados: [] } })]);
  const envios: string[] = [];
  const conexion = await b.conectar();
  const dep = (sobre: Partial<Dependencias> = {}, c = conexion): Dependencias => ({
    rpc: rpcDe(c),
    leer: async () => medicinasDe(await leerDatos(b.dueno)),
    suscripciones: async () => Array.from({ length: celulares }, (_, i) => sub(i)),
    enviar: async (s, a) => (envios.push(`${a.etiqueta}|${idDispositivo(s.endpoint)}`), "aceptado"),
    limpiar: async () => {},
    usuario: async () => A,
    reloj: Date.now,
    ...sobre,
  });
  const tick = (slot = Math.floor(Date.now() / 900_000)) => ({ kid: "k", iat: Math.floor(Date.now() / 1000), slot, jti: randomUUID() });
  return { b, envios, dep, tick, conexion };
}
const estados = async (b: Awaited<ReturnType<typeof baseNueva>>) =>
  Object.fromEntries((await b.dueno.query("select estado, count(*)::int n from panel_medicina_avisos group by estado")).rows.map((r) => [r.estado, r.n]));

t("S14-C1: 15 medicinas a la misma hora × 3 celulares = 45 avisos: en UN turno salen los 45 (nadie se queda sin aviso)", async () => {
  const h = haceMin(5);
  const { b, envios, dep, tick } = await despertador(Array.from({ length: 15 }, (_, i) => MED(`m${i}`, { primera: h })), 3);
  try {
    const r = await ejecutarTick(tick(), "https://mi.vercel.app", Date.now(), dep());
    assert.equal(r.aceptados, 45);
    assert.equal(new Set(envios).size, 45);
    assert.ok(45 > MAX_LOTE && r.lotes === 2);
    assert.deepEqual(await estados(b), { aceptado: 45 });
    // El turno siguiente no repite ninguno
    await ejecutarTick(tick(Math.floor(Date.now() / 900_000) + 1), "https://mi.vercel.app", Date.now(), dep());
    assert.equal(envios.length, 45);
  } finally {
    await b.cerrar();
  }
});

t("S14-C2: si la segunda lectura falla, NO se cancela nada: todo vuelve a la cola y sale en el siguiente turno", async () => {
  const h = haceMin(5);
  const { b, envios, dep, tick } = await despertador([MED("m1", { primera: h }), MED("m2", { primera: h })], 2);
  try {
    let lecturas = 0;
    const falla = dep({ leer: async () => (++lecturas === 2 ? Promise.reject(new Error("Supabase no respondió")) : medicinasDe(await leerDatos(b.dueno))) });
    const r = await ejecutarTick(tick(), "https://mi.vercel.app", Date.now(), falla);
    assert.equal(r.estado, "error");
    assert.equal(envios.length, 0);
    assert.deepEqual(await estados(b), { pendiente: 4 }, "cero cancelados");
    await b.dueno.query("update panel_medicina_avisos set proximo = now()");
    const r2 = await ejecutarTick(tick(Math.floor(Date.now() / 900_000) + 1), "https://mi.vercel.app", Date.now(), dep());
    assert.equal(r2.aceptados, 4);
  } finally {
    await b.cerrar();
  }
});

t("S14-C2: cancelar SOLO tras una lectura correcta que confirma (la marcaste o la quitaste)", async () => {
  const h = haceMin(5);
  const { b, envios, dep, tick } = await despertador([MED("m1", { primera: h }), MED("m2", { primera: h })], 1);
  try {
    let lecturas = 0;
    const r = await ejecutarTick(tick(), "https://mi.vercel.app", Date.now(), dep({ leer: async () => {
      const d = medicinasDe(await leerDatos(b.dueno));
      return ++lecturas === 2 ? { ...d, lista: d.lista.filter((m) => m.id !== "m2") } : d; // entre leer y mandar, quitaste m2
    } }));
    assert.equal(r.aceptados, 1);
    assert.equal(r.cancelados, 1);
    assert.equal(envios.length, 1);
  } finally {
    await b.cerrar();
  }
});

t("S14-C3: un aviso que falló sigue en la cola aunque su toma ya no se «descubra» (más de 2 h) y sale cuando toca", async () => {
  const { b, envios, dep, tick } = await despertador([MED("m1", { primera: haceMin(5) })], 1);
  try {
    const r = await ejecutarTick(tick(), "https://mi.vercel.app", Date.now(), dep({ enviar: async () => "pendiente" }));
    assert.equal(r.pendientes, 1);
    // Pasan 2 h 10 min: la toma ya no está entre las que tocan, pero su reintento ya toca
    await b.dueno.query("update panel_medicina_avisos set proximo = now() - interval '1 second', toma_en = now() - interval '130 minutes'");
    const r2 = await ejecutarTick(tick(Math.floor(Date.now() / 900_000) + 1), "https://mi.vercel.app", Date.now() + 130 * 60_000, dep());
    assert.equal(r2.aceptados, 1);
    assert.equal(envios.length, 1);
  } finally {
    await b.cerrar();
  }
});

t("S14-C3: pasadas 6 h de la toma, o 8 intentos, el aviso se da por perdido (vencido/agotado), no se manda tarde", async () => {
  const { b, envios, dep, tick } = await despertador([MED("m1", { primera: haceMin(5) })], 2);
  try {
    await ejecutarTick(tick(), "https://mi.vercel.app", Date.now(), dep({ enviar: async () => "pendiente" }));
    await b.dueno.query(`update panel_medicina_avisos set proximo = now() - interval '1 second',
      toma_en = case when dispositivo = $1 then now() - interval '7 hours' else toma_en end, intentos = case when dispositivo = $1 then intentos else 8 end`, [idDispositivo(sub(0).endpoint)]);
    await ejecutarTick(tick(Math.floor(Date.now() / 900_000) + 1), "https://mi.vercel.app", Date.now(), dep());
    assert.equal(envios.length, 0);
    assert.deepEqual(await estados(b), { agotado: 1, vencido: 1 });
  } finally {
    await b.cerrar();
  }
});

t("S14-C3: la limpieza diaria va por tiempo: con dos turnos al mismo tiempo la gana uno, y no se repite antes de 24 h", async () => {
  const b = await baseNueva();
  try {
    const [x, y] = [rpcDe(await b.conectar()), rpcDe(await b.conectar())];
    const r = await Promise.all([x("panel_limpieza_toca", { p_usuario: A, p_horas: 24 }), y("panel_limpieza_toca", { p_usuario: A, p_horas: 24 })]);
    assert.deepEqual(r.map((z) => z.data).sort(), [false, true]);
    assert.equal((await x("panel_limpieza_toca", { p_usuario: A, p_horas: 24 })).data, false);
    await b.dueno.query("update panel_mantenimiento set ultima_limpieza = now() - interval '25 hours'");
    assert.equal((await y("panel_limpieza_toca", { p_usuario: A, p_horas: 24 })).data, true);
  } finally {
    await b.cerrar();
  }
});

t("S14: dos turnos al mismo tiempo (2 conexiones, mismo slot): uno trabaja, el otro no; ningún aviso sale dos veces", async () => {
  const h = haceMin(5);
  const { b, envios, dep, tick } = await despertador(Array.from({ length: 5 }, (_, i) => MED(`m${i}`, { primera: h })), 2);
  try {
    const otra = await b.conectar();
    const slot = Math.floor(Date.now() / 900_000);
    const r = await Promise.all([ejecutarTick(tick(slot), "https://mi.vercel.app", Date.now(), dep()), ejecutarTick(tick(slot), "https://mi.vercel.app", Date.now(), dep({}, otra))]);
    assert.deepEqual(r.map((z) => z.estado).sort(), ["completado", "en_curso"]);
    assert.equal(envios.length, 10);
    assert.equal(new Set(envios).size, 10);
  } finally {
    await b.cerrar();
  }
});

t("S14: 404/410 del servicio de avisos → ese celular queda 'invalido' (no se reintenta); los demás salen", async () => {
  const { b, dep, tick } = await despertador([MED("m1", { primera: haceMin(5) })], 2);
  try {
    const r = await ejecutarTick(tick(), "https://mi.vercel.app", Date.now(), dep({ enviar: async (s) => (s.endpoint.endsWith("/0") ? "invalido" : "aceptado") }));
    assert.equal(r.aceptados, 1);
    assert.deepEqual(await estados(b), { aceptado: 1, invalido: 1 });
  } finally {
    await b.cerrar();
  }
});

t("S14: pausa mayor que la ficha: otro turno retoma; el acuse viejo ya no cambia nada (límite honesto: puede llegar 2 veces, con la misma etiqueta)", async () => {
  const { b, envios, dep, tick } = await despertador([MED("m1", { primera: haceMin(5) })], 1);
  try {
    const otra = await b.conectar();
    let segundo: Promise<unknown> | null = null;
    const pausado = dep({
      enviar: async (s, a) => {
        // Mientras este turno "se congela", vencen las fichas y entra el turno siguiente por otra conexión
        await b.dueno.query("update panel_medicina_avisos set lease_hasta = now() - interval '1 second'; update panel_tick_ejecuciones set lease_hasta = now() - interval '1 second'");
        segundo = ejecutarTick(tick(Math.floor(Date.now() / 900_000) + 1), "https://mi.vercel.app", Date.now(), dep({}, otra));
        await segundo;
        envios.push(`${a.etiqueta}|${idDispositivo(s.endpoint)}`);
        return "aceptado";
      },
    });
    await ejecutarTick(tick(), "https://mi.vercel.app", Date.now(), pausado);
    assert.ok(segundo);
    assert.equal(envios.length, 2, "salió dos veces");
    assert.equal(new Set(envios).size, 1, "con la misma etiqueta: el celular muestra solo una");
    const fila = (await b.dueno.query("select estado, lease_token from panel_medicina_avisos")).rows[0];
    assert.deepEqual(fila, { estado: "aceptado", lease_token: null });
  } finally {
    await b.cerrar();
  }
});

t("S14: cambio de fecha: la toma de las 23:50 de ayer se avisa a las 00:05 de hoy", async () => {
  const { porAvisar } = await import("../lib/medicinas");
  const ahora = Date.parse("2026-11-11T06:05:00Z"); // 00:05 en CDMX (UTC-6)
  const toca = porAvisar({ lista: [MED("m1", { primera: "23:50" })], tomas: {}, enviados: [] }, ahora);
  assert.deepEqual(toca.map((x) => `${x.fecha} ${x.hora}`), ["2026-11-10 23:50"]);
  assert.ok(ZONA_HOY());
});
