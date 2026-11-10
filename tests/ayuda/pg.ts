// Ayuda para las pruebas contra Postgres REAL (no PGlite): cada prueba crea su base desechable, corre el SQL como
// lo correría Supabase y abre conexiones independientes. Se activa con TAOS_PG_URL (si no está, esas pruebas se saltan).
import { readFileSync } from "node:fs";
import { Client, types } from "pg";

// Como PostgREST: las fechas (date) llegan como texto "AAAA-MM-DD"
types.setTypeParser(1082, (v) => v);

export const PG = process.env.TAOS_PG_URL;
export const SQL = readFileSync("supabase/instalar.sql", "utf8");
export const A = "11111111-1111-1111-1111-111111111111";
const BASE = `create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;
alter role service_role bypassrls; -- como en Supabase: el servidor (llave secreta) no pasa por RLS
-- Como Supabase: todo lo nuevo en public queda con permisos para anon, authenticated y service_role
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
insert into auth.users values ('${A}');`;

let n = 0;
export async function baseNueva(previo = "", instalar = true) {
  const admin = new Client({ connectionString: PG });
  await admin.connect();
  const nombre = `taos_prueba_${process.pid}_${n++}`;
  await admin.query(`drop database if exists ${nombre}`);
  await admin.query(`create database ${nombre}`);
  await admin.end();
  const url = PG!.replace(/\/[^/]*$/, `/${nombre}`);
  const dueno = new Client({ connectionString: url });
  await dueno.connect();
  await dueno.query(BASE);
  if (previo) await dueno.query(previo);
  if (instalar) await dueno.query(SQL);
  const conexiones: Client[] = [dueno];
  // Conexión independiente con el rol del servidor (service_role) o uno público
  const conectar = async (rol = "service_role") => {
    const c = new Client({ connectionString: url });
    await c.connect();
    await c.query(`set role ${rol}`);
    conexiones.push(c);
    return c;
  };
  const cerrar = async () => {
    for (const c of conexiones) await c.end().catch(() => {});
    const a = new Client({ connectionString: PG });
    await a.connect();
    await a.query(`drop database if exists ${nombre} with (force)`);
    await a.end();
  };
  return { dueno, conectar, cerrar };
}

const CONJUNTOS = new Set(["panel_avisos_reclamar", "panel_reservar_intento"]);
type Err = { code?: string; message: string };

// rpc como lo hace supabase-js (argumentos por nombre). "Función que no existe" se traduce a PGRST202, como PostgREST.
export function rpcDe(c: Client) {
  return async (fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: Err | null }> => {
    const nombres = Object.keys(args);
    const valores = nombres.map((k) => (args[k] !== null && typeof args[k] === "object" ? JSON.stringify(args[k]) : args[k]));
    const lista = nombres.map((k, i) => `${k} => $${i + 1}`).join(", ");
    try {
      if (CONJUNTOS.has(fn)) return { data: (await c.query(`select * from public.${fn}(${lista})`, valores)).rows, error: null };
      return { data: (await c.query(`select public.${fn}(${lista}) as r`, valores)).rows[0].r, error: null };
    } catch (e) {
      const x = e as { code?: string; message: string };
      return { data: null, error: { code: x.code === "42883" ? "PGRST202" : x.code, message: x.message } };
    }
  };
}

// Lo mínimo de supabase-js que usa guardarDatos: from(t).select(c).eq(k,v).maybeSingle(), upsert(fila) y rpc()
export function clienteDe(c: Client) {
  const rpc = rpcDe(c);
  const from = (tabla: string) => ({
    select: (columnas: string) => ({
      eq: (k: string, v: unknown) => ({
        maybeSingle: async () => {
          try {
            const r = await c.query(`select ${columnas} from public.${tabla} where ${k} = $1`, [v]);
            return { data: r.rows[0] ?? null, error: null };
          } catch (e) {
            return { data: null, error: e as Err };
          }
        },
      }),
    }),
    upsert: async (fila: Record<string, unknown>) => {
      const k = Object.keys(fila);
      try {
        await c.query(
          `insert into public.${tabla} (${k.join(", ")}) values (${k.map((_, i) => `$${i + 1}`).join(", ")}) on conflict (user_id) do update set ${k
            .filter((x) => x !== "user_id")
            .map((x) => `${x} = excluded.${x}`)
            .join(", ")}`,
          k.map((x) => (fila[x] !== null && typeof fila[x] === "object" ? JSON.stringify(fila[x]) : fila[x])),
        );
        return { error: null };
      } catch (e) {
        return { error: e as Err };
      }
    },
  });
  return { from, rpc } as never;
}
