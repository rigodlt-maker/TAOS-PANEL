import { test } from "node:test";
import assert from "node:assert/strict";
import { calidadDelAire, indiceUV } from "../lib/aire";
import { aplicaNoCircula, circulaMiAuto, limpiarAuto, noCirculaHoy } from "../lib/no-circula";

test("calidad del aire y UV con palabras sencillas", () => {
  assert.equal(calidadDelAire(35).texto, "Buena");
  assert.equal(calidadDelAire(120).texto, "Mala");
  assert.equal(indiceUV(0).texto, "Bajo");
  assert.equal(indiceUV(9).texto, "Muy alto");
});

test("Hoy No Circula entre semana: lunes 5 y 6", () => {
  // 2 nov 2026 es lunes
  assert.equal(noCirculaHoy("2026-11-02").corto, "P: 5 y 6");
  assert.equal(circulaMiAuto({ terminacion: 5, holograma: "1" }, "2026-11-02"), false);
  assert.equal(circulaMiAuto({ terminacion: 5, holograma: "0" }, "2026-11-02"), true);
  assert.equal(circulaMiAuto({ terminacion: 3, holograma: "2" }, "2026-11-02"), true);
  // viernes 9 y 0
  assert.equal(circulaMiAuto({ terminacion: 0, holograma: "2" }, "2026-11-06"), false);
});

test("Hoy No Circula en sábado y domingo", () => {
  // 7 nov 2026: 1.er sábado → H1 non no circula; H2 nunca circula en sábado
  assert.equal(circulaMiAuto({ terminacion: 7, holograma: "1" }, "2026-11-07"), false);
  assert.equal(circulaMiAuto({ terminacion: 4, holograma: "1" }, "2026-11-07"), true);
  assert.equal(circulaMiAuto({ terminacion: 4, holograma: "2" }, "2026-11-07"), false);
  // 14 nov: 2.º sábado → H1 par no circula
  assert.equal(circulaMiAuto({ terminacion: 4, holograma: "1" }, "2026-11-14"), false);
  // 29 ago 2026: 5.º sábado → el holograma 1 circula
  assert.equal(circulaMiAuto({ terminacion: 3, holograma: "1" }, "2026-08-29"), true);
  assert.equal(circulaMiAuto({ terminacion: 3, holograma: "2" }, "2026-11-08"), true);
  assert.equal(noCirculaHoy("2026-11-08").corto, "Circulan todos");
});

test("solo aplica en el Valle de México y valida el auto", () => {
  assert.ok(aplicaNoCircula("Ciudad de México"));
  assert.ok(aplicaNoCircula("Naucalpan de Juárez, México"));
  assert.ok(!aplicaNoCircula("Puebla, Puebla"));
  assert.deepEqual(limpiarAuto({ terminacion: 4, holograma: "1" }), { terminacion: 4, holograma: "1" });
  assert.equal(limpiarAuto({ terminacion: 12, holograma: "1" }), null);
});
