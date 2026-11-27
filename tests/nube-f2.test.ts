// Nube F2 · Optimizador para muchas personas
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { exportarMisDatos, TABLAS_MIAS } from "../lib/mis-datos";
import { conUsuario, usuarioActual } from "../lib/usuario";
import { paraCadaUsuario, TOPE_POR_RONDA, usuariosDeLaRonda } from "../lib/usuarios-nube";

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";

test("el usuario en curso: cada trabajo ve SOLO a su persona, aunque corran al mismo tiempo", async () => {
  const vistos = await Promise.all([A, B, A, B].map((id, i) => conUsuario(id, async () => (await new Promise((r) => setTimeout(r, 5 * (4 - i))), usuarioActual()))));
  assert.deepEqual(vistos, [A, B, A, B]);
});

test("en Nube, sin trabajo en curso ni sesión, se detiene (nunca usa los datos de otra persona)", async () => {
  const antes = process.env.TAOS_MODO;
  process.env.TAOS_MODO = "nube";
  try {
    await assert.rejects(usuarioActual(), /Vuelve a entrar/);
  } finally {
    if (antes === undefined) delete process.env.TAOS_MODO;
    else process.env.TAOS_MODO = antes;
  }
});

const usuarios = [
  { id: A, email: "a@demo.mx", email_confirmed_at: "2026-11-01" },
  { id: B, email: "b@demo.mx", email_confirmed_at: "2026-11-02" },
  { id: "cccccccc-0000-4000-8000-00000000000c", email: "c@demo.mx", email_confirmed_at: null },
];

test("la ronda: propia = solo el dueño; nube = cuentas confirmadas, con tope; si una falla, las demás siguen", async () => {
  assert.deepEqual(await usuariosDeLaRonda({ nube: false, dueno: async () => "dueno" }), ["dueno"]);
  assert.deepEqual(await usuariosDeLaRonda({ nube: true, listar: async () => usuarios }), [A, B]);
  const muchos = Array.from({ length: TOPE_POR_RONDA + 5 }, (_, i) => ({ id: `u${i}`, email: `u${i}@demo.mx`, email_confirmed_at: "x" }));
  assert.equal((await usuariosDeLaRonda({ nube: true, listar: async () => muchos })).length, TOPE_POR_RONDA);
  const r = await paraCadaUsuario(
    async (id) => {
      if (id === A) throw new Error("falla de prueba");
      return usuarioActual();
    },
    { nube: true, listar: async () => usuarios },
  );
  assert.deepEqual(r, { usuarios: 2, fallas: 1, resultados: [B] });
});

test("descargar mis datos: todas las tablas con el user_id, avisos solo del Optimizador y sin las llaves de Google", async () => {
  const pedidas: { tabla: string; filtros: unknown[][] }[] = [];
  const db = {
    from: (tabla: string) => ({
      select: () => {
        const filtros: unknown[][] = [];
        const q = {
          eq: (...f: unknown[]) => (filtros.push(f), q),
          then: (ok: (v: unknown) => unknown) => {
            pedidas.push({ tabla, filtros });
            const fila = tabla === "panel_google" ? { user_id: B, refresh_token: "secreto-1", refresh_anterior: null } : { user_id: B };
            return Promise.resolve({ data: [fila], error: null }).then(ok);
          },
        };
        return q;
      },
    }),
  } as unknown as SupabaseClient;
  const r = await exportarMisDatos(db, B);
  assert.deepEqual(pedidas.map((p) => p.tabla), [...TABLAS_MIAS]);
  assert.ok(pedidas.every((p) => p.filtros.some((f) => f[0] === "user_id" && f[1] === B)));
  assert.ok(pedidas.find((p) => p.tabla === "push_subscriptions")!.filtros.some((f) => f[0] === "app" && f[1] === "panel"));
  assert.ok(!JSON.stringify(r).includes("secreto-1"), "la llave de Google no sale en la descarga");
});

// Regla de F1/F2 en el código: toda consulta a una tabla con datos de personas lleva su user_id
// (las únicas sin user_id están anotadas aquí, con el porqué)
const SIN_USUARIO: Record<string, string> = {
  panel_intentos: "intentos de entrada por dirección IP: no tiene user_id",
};
test("cada consulta del Optimizador a tablas con datos de personas lleva user_id (o p_usuario en las funciones)", () => {
  const faltan: string[] = [];
  for (const f of readdirSync("lib").filter((x) => x.endsWith(".ts"))) {
    const s = readFileSync(`lib/${f}`, "utf8");
    for (const m of s.matchAll(/\.from\("(\w+)"\)/g)) {
      const tabla = m[1];
      if (SIN_USUARIO[tabla] || !/^(panel_|push_subscriptions)/.test(tabla)) continue;
      // La consulta termina en el primer «;» o en el cierre de la llamada a revisar(...)
      const fin = s.indexOf(";", m.index!);
      const consulta = s.slice(m.index!, fin === -1 ? undefined : fin);
      if (!/user_id|p_usuario|usuario,/.test(consulta)) faltan.push(`${f}: ${consulta.slice(0, 90).replace(/\s+/g, " ")}`);
    }
  }
  assert.deepEqual(faltan, []);
});
