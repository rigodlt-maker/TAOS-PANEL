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

import { enlacesDe, textoDelEnlace } from "../lib/lugares";

test("lugares: texto normal da ruta y mapa de Google", () => {
  const e = enlacesDe("Zócalo, Ciudad de México");
  assert.match(e.ruta, /maps\/dir\/.*destination=Z%C3%B3calo/);
  assert.match(e.mapa, /maps\/search\//);
});

test("lugares: enlace de Mapas de iPhone y de Google Maps", () => {
  assert.equal(textoDelEnlace("https://maps.apple.com/?address=Calle%201,%20Puebla&ll=19.0,-98.2&q=Casa"), "Calle 1, Puebla");
  assert.equal(textoDelEnlace("https://www.google.com/maps/place/Parque+M%C3%A9xico/@19.4,-99.1,17z"), "Parque México");
  const corto = enlacesDe("https://maps.app.goo.gl/abc123");
  assert.equal(corto.ruta, "https://maps.app.goo.gl/abc123");
  assert.equal(corto.mapa, "https://maps.app.goo.gl/abc123");
});
