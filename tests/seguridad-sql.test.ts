// Ensayo del SQL de seguridad 1.3 (S03 · S17 · S14) en Postgres real (PGlite), igual que lo correría Supabase
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const SQL = readFileSync("supabase/instalar.sql", "utf8");
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

async function base() {
  const db = new PGlite();
  // Lo mínimo de Supabase: esquema auth, auth.uid() y los roles
  await db.exec(`create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon; create role authenticated; create role service_role;
    insert into auth.users values ('${A}'), ('${B}');`);
  return db;
}
const uno = async <T>(db: PGlite, q: string, p: unknown[] = []) => (await db.query<T>(q, p)).rows[0];

test("instalar sobre la versión anterior: corre dos veces, conserva tus datos y mueve la conexión de Google (S03)", async () => {
  const db = await base();
  // Instalación vieja (1.2): panel_config con el token adentro
  await db.exec(`create table public.panel_config (user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade, datos jsonb not null default '{}', updated_at timestamptz not null default now());
    alter table public.panel_config add column google_refresh_token text;
    insert into public.panel_config (user_id, datos, google_refresh_token) values ('${A}', '{"nombre":"Alex","medicinas":{"lista":[]}}', 'tok-secreto');`);
  await db.exec(SQL);
  await db.exec(SQL); // segunda vez: sin errores
  const fila = await uno<{ datos: unknown; google_refresh_token: string | null; version: number }>(db, "select datos, google_refresh_token, version from panel_config");
  assert.deepEqual(fila.datos, { nombre: "Alex", medicinas: { lista: [] } });
  assert.equal(fila.google_refresh_token, null);
  assert.equal(Number(fila.version), 0);
  assert.equal((await uno<{ refresh_token: string }>(db, "select refresh_token from panel_google"))!.refresh_token, "tok-secreto");
});

test("nadie más que el servidor puede leer ajustes, Google, intentos ni usar las funciones (S03 · S14-18)", async () => {
  const db = await base();
  await db.exec(SQL);
  await db.exec(`insert into panel_config (user_id, datos) values ('${A}', '{"x":1}'); insert into panel_google values ('${A}', 'tok');`);
  // Aunque otra app vuelva a dar permisos a todas las tablas (como el SQL de Finanzas), RLS sin reglas no deja ver nada
  await db.exec("grant select, insert, update, delete on all tables in schema public to authenticated");
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${A}', false);`);
  for (const t of ["panel_config", "panel_google", "panel_intentos", "panel_operaciones", "panel_tick_ejecuciones", "panel_medicina_avisos"])
    assert.equal(Number((await uno<{ n: number }>(db, `select count(*) n from ${t}`))!.n), 0, t);
  await assert.rejects(db.query(`select public.panel_guardar('${A}', 0, '{"x":2}')`));
  await assert.rejects(db.query(`select * from public.panel_reservar_intento('k')`));
  await db.exec("reset role");
});

test("S17: 20 intentos al mismo tiempo: solo pasan 5 a revisar la contraseña; el 5º bloquea 15 minutos", async () => {
  const db = await base();
  await db.exec(SQL);
  const r = await Promise.all(Array.from({ length: 20 }, () => uno<{ permitido: boolean; espera_seg: number }>(db, "select * from panel_reservar_intento('ip-1')")));
  assert.equal(r.filter((x) => x!.permitido).length, 5);
  assert.ok(r.filter((x) => !x!.permitido).every((x) => x!.espera_seg > 880 && x!.espera_seg <= 900));
  // Otra dirección no se bloquea (el dueño no queda fuera por un ataque desde otro lado)
  assert.equal((await uno<{ permitido: boolean }>(db, "select * from panel_reservar_intento('ip-2')"))!.permitido, true);
  // Contraseña correcta en ip-2: devuelve solo su intento (generación 0, intento 1)
  await db.query("select panel_liberar_intento('ip-2', 0, 1)");
  assert.equal(Number((await uno<{ fallos: number }>(db, "select fallos from panel_intentos where clave = 'ip-2'"))!.fallos), 0);
});

test("S17-R3: el bloqueo cuenta desde el 5º fallo aunque el 1º haya sido 14 minutos antes", async () => {
  const db = await base();
  await db.exec(SQL);
  for (let i = 0; i < 4; i++) await db.query("select * from panel_reservar_intento('ip-t')");
  await db.exec("update panel_intentos set ventana_desde = now() - interval '14 minutes'");
  await db.query("select * from panel_reservar_intento('ip-t')");
  const r = await uno<{ permitido: boolean; espera_seg: number }>(db, "select * from panel_reservar_intento('ip-t')");
  assert.equal(r!.permitido, false);
  assert.ok(r!.espera_seg > 880, `espera ${r!.espera_seg}`);
});

test("S14-07/10/11: guardados con versión: el viejo no pisa; la misma operación no se aplica dos veces", async () => {
  const db = await base();
  await db.exec(SQL);
  const guardar = async (version: number, cambios: object, op?: string, huella?: string) =>
    (await uno<{ r: { estado: string; version?: number } }>(db, "select panel_guardar($1, $2, $3, $4, $5) r", [A, version, JSON.stringify(cambios), op ?? null, huella ?? null]))!.r;
  assert.equal((await guardar(0, { ciudad: "CDMX" }, "op1", "h1")).estado, "ok");
  // Otro guardado hecho con la versión vieja (0): conflicto, no pisa
  assert.equal((await guardar(0, { habitos: { lista: [1] } })).estado, "version");
  // Se reintenta con la versión nueva: se conservan los dos cambios
  assert.equal((await guardar(1, { habitos: { lista: [1] } })).estado, "ok");
  assert.deepEqual((await uno<{ datos: unknown }>(db, "select datos from panel_config"))!.datos, { ciudad: "CDMX", habitos: { lista: [1] } });
  // Misma operación reenviada (se perdió la respuesta): no se repite
  assert.equal((await guardar(2, { ciudad: "CDMX" }, "op1", "h1")).estado, "repetida");
  // Mismo op_id con otro contenido: conflicto, sin escribir
  assert.equal((await guardar(2, { ciudad: "GDL" }, "op1", "h2")).estado, "conflicto_op");
  assert.equal(Number((await uno<{ version: number }>(db, "select version from panel_config"))!.version), 2);
});

test("S14-05/06/15: un solo turno por ranura de 15 min; quien no tiene la ficha no lo cierra", async () => {
  const db = await base();
  await db.exec(SQL);
  const reclamar = async (slot: number, jti: string, lease = 120) => (await uno<{ r: { estado: string; token?: string } }>(db, "select panel_tick_reclamar($1, $2, $3, $4) r", [A, slot, jti, lease]))!.r;
  const [a, b] = await Promise.all([reclamar(1000, "j1"), reclamar(1000, "j2")]);
  assert.deepEqual([a.estado, b.estado].sort(), ["en_curso", "reclamado"]);
  const dueno = a.estado === "reclamado" ? a : b;
  assert.equal((await uno<{ ok: boolean }>(db, "select panel_tick_terminar($1, 1000, $2, 'completado') ok", [A, "00000000-0000-0000-0000-000000000000"]))!.ok, false);
  assert.equal((await uno<{ ok: boolean }>(db, "select panel_tick_terminar($1, 1000, $2, 'completado') ok", [A, dueno.token]))!.ok, true);
  assert.equal((await reclamar(1000, "j3")).estado, "completado");
  // Una revisión que se cayó (ficha vencida) se puede retomar con ficha nueva
  const c = await reclamar(1001, "j4", 0);
  assert.equal(c.estado, "reclamado");
  const d = await reclamar(1001, "j5");
  assert.equal(d.estado, "reclamado");
  assert.notEqual(c.token, d.token);
});

test("S14-13/16: los avisos se apartan antes de mandar; el que falló se reintenta y el aceptado no se repite", async () => {
  const db = await base();
  await db.exec(SQL);
  const items = JSON.stringify([
    { medicina_id: "m1", revision: "r1", fecha: "2026-11-10", hora: "08:00", dispositivo: "cel-a" },
    { medicina_id: "m1", revision: "r1", fecha: "2026-11-10", hora: "08:00", dispositivo: "cel-b" },
  ]);
  const t1 = "aaaaaaaa-0000-0000-0000-000000000001", t2 = "aaaaaaaa-0000-0000-0000-000000000002";
  const reclamar = async (t: string) => (await db.query<{ dispositivo: string }>("select dispositivo from panel_avisos_reclamar($1, $2, $3)", [A, items, t])).rows.map((r) => r.dispositivo).sort();
  const [x, y] = await Promise.all([reclamar(t1), reclamar(t2)]);
  assert.equal(x.length + y.length, 2); // nadie aparta el mismo aviso dos veces
  const token = x.length ? t1 : t2;
  await db.query("select panel_avisos_acusar($1, $2, $3)", [A, token, JSON.stringify([
    { medicina_id: "m1", revision: "r1", fecha: "2026-11-10", hora: "08:00", dispositivo: "cel-a", estado: "aceptado" },
    { medicina_id: "m1", revision: "r1", fecha: "2026-11-10", hora: "08:00", dispositivo: "cel-b", estado: "pendiente" },
  ])]);
  assert.deepEqual(await reclamar(t1), []); // cel-b espera 15 min; cel-a ya salió
  await db.exec("update panel_medicina_avisos set proximo = now() where dispositivo = 'cel-b'");
  assert.deepEqual(await reclamar(t1), ["cel-b"]);
  // Un acuse con ficha vieja no cambia nada
  assert.equal(Number((await uno<{ n: number }>(db, "select panel_avisos_acusar($1, $2, $3) n", [A, t2, JSON.stringify([{ medicina_id: "m1", revision: "r1", fecha: "2026-11-10", hora: "08:00", dispositivo: "cel-b", estado: "aceptado" }])]))!.n), 0);
});
