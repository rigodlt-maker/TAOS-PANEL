// Ajustes del panel: valores limpios aunque lleguen incompletos (datos inventados)
import assert from "node:assert/strict";
import { test } from "node:test";
import { CIUDAD_BASE, limpiar } from "../lib/preferencias";

test("limpia nombre, ciudad y lugares", () => {
  const p = limpiar({ nombre: "  Ana  ", ciudad: { nombre: "Puebla, Puebla", lat: 19.04, lon: -98.2 }, lugares: [{ nombre: "Casa", icono: "", direccion: "Calle Falsa 123" }, { nombre: "", direccion: "x" }] });
  assert.equal(p.nombre, "Ana");
  assert.equal(p.ciudad.nombre, "Puebla, Puebla");
  assert.deepEqual(p.lugares, [{ nombre: "Casa", icono: "📍", direccion: "Calle Falsa 123" }]);
  assert.deepEqual(limpiar(null).ciudad, CIUDAD_BASE);
  assert.deepEqual(limpiar({ ciudad: { nombre: "x", lat: "no" } }).ciudad, CIUDAD_BASE);
});

test("la pantalla Configurar muestra el mismo SQL del archivo", async () => {
  const { readFileSync } = await import("node:fs");
  const { SQL_INSTALAR } = await import("../lib/sql");
  assert.equal(SQL_INSTALAR, readFileSync("supabase/instalar.sql", "utf8"));
});
