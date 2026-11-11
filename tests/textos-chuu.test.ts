// Textos y decisiones acordados con Chuu y Rodrigo (10 nov 2026): pantalla de espera 429/503 y aviso de conflicto
import assert from "node:assert/strict";
import { test } from "node:test";
import { pantallaEspera } from "../app/api/login/route";
import { ConflictoDeCampos, parche } from "../lib/parche";

test("S17: bloqueo por intentos = 429, página en español, botón para volver y Retry-After (no 303)", async () => {
  const r = pantallaEspera(840, false);
  assert.equal(r.status, 429);
  assert.equal(r.headers.get("Retry-After"), "840");
  assert.match(r.headers.get("content-type")!, /text\/html/);
  const html = await r.text();
  assert.match(html, /Estamos atendiendo muchas solicitudes\. Espera un momento y vuelve a intentar \(unos 14 minutos\)\./);
  assert.match(html, /href="\/login">Volver a la entrada/);
});

test("S17-A: base de datos caída = 503 con el mismo texto", async () => {
  const r = pantallaEspera(60, true);
  assert.equal(r.status, 503);
  assert.match(await r.text(), /Estamos atendiendo muchas solicitudes\. Espera un momento y vuelve a intentar\./);
});

test("B1: el aviso de conflicto dice qué cambió y que no se guardó nada", () => {
  assert.throws(
    () => parche({ nota: "b" }, { nota: "a" }, { nota: "c" }, { nota: "la nota" }),
    (e) => e instanceof ConflictoDeCampos && e.message === "Mientras editabas, otra pantalla cambió la nota. No se guardó nada.",
  );
});
