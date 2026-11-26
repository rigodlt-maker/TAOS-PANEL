// Buscador 🔍: lo que escribe la gente → la pantalla correcta
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { DESTINOS, buscarDestinos } from "../lib/destinos";

const primero = (q: string) => buscarDestinos(q)[0]?.ruta;

test("lleva a la pantalla correcta (también mal escrito)", () => {
  assert.equal(primero("medicinas"), "/medicinas");
  assert.equal(primero("pastillas"), "/medicinas");
  assert.equal(primero("placa"), "/ajustes");
  assert.equal(primero("respirar"), "/calma");
  assert.equal(primero("abitos"), "/habitos");
  assert.equal(primero("conectar google"), "/mas#google");
  assert.deepEqual(buscarDestinos("zzzz"), []);
});

test("cada pantalla existe y no se repite", () => {
  const rutas = DESTINOS.map((d) => d.ruta);
  assert.equal(new Set(rutas).size, rutas.length);
  for (const r of rutas) {
    const base = r.split("#")[0];
    assert.ok(existsSync(`app/(panel)${base === "/" ? "" : base}/page.tsx`) || existsSync(`app${base}/page.tsx`), r);
  }
});
