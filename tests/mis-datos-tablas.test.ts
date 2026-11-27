// Nube F2 · La lista de tablas de «Descargar mis datos» del Optimizador es justo la de tablas con user_id, y todas se borran con la cuenta
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Client } from "pg";
import { TABLAS_MIAS } from "../lib/mis-datos";

const B = "bbbbbbbb-0000-4000-8000-00000000000b";

// Con Postgres real (TAOS_PG_URL): la lista de tablas de «Descargar mis datos» es justo la de las tablas con user_id
const PG = process.env.TAOS_PG_URL;
test("la lista de tablas para descargar no se queda atrás: son todas las tablas con user_id del SQL de instalación", { skip: PG ? false : "sin TAOS_PG_URL" }, async () => {
  const base = readFileSync("tests/aislamiento.test.ts", "utf8").match(/const BASE = `([\s\S]*?)`;/)![1].replace(/\$\{A\}/g, "aaaaaaaa-0000-4000-8000-00000000000a").replace(/\$\{B\}/g, B);
  const admin = new Client({ connectionString: PG });
  await admin.connect();
  const nombre = `taos_misdatos_${process.pid}_${Date.now()}`;
  await admin.query(`create database ${nombre}`);
  const c = new Client({ connectionString: PG!.replace(/\/[^/]*$/, `/${nombre}`) });
  try {
    await c.connect();
    await c.query(base);
    await c.query(readFileSync("supabase/instalar.sql", "utf8"));
    const conUsuario = (
      await c.query(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
        and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'user_id' and not a.attisdropped) order by 1`)
    ).rows.map((r) => r.relname);
    assert.deepEqual([...TABLAS_MIAS].sort(), conUsuario);
    // Y todas se borran en cascada al borrar la cuenta
    const sinCascada = (
      await c.query(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
        and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'user_id')
        and not exists (select 1 from pg_constraint k join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
                         where k.conrelid = c.oid and k.contype = 'f' and a.attname = 'user_id' and k.confrelid = 'auth.users'::regclass and k.confdeltype = 'c')`)
    ).rows.map((r) => r.relname);
    assert.deepEqual(sinCascada, []);
  } finally {
    await c.end().catch(() => {});
    await admin.query(`drop database if exists ${nombre} with (force)`);
    await admin.end();
  }
});
