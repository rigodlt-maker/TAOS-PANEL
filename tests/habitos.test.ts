// Hábitos: palomitas, rachas y aviso de la noche (datos inventados)
import assert from "node:assert/strict";
import { test } from "node:test";
import { agregar, avisoHabitos, limpiarHabitos, marcar, pendientesDeHoy, quitar, racha, rachaCompleta, type Habitos } from "../lib/habitos";

const base = (): Habitos => agregar(agregar({ lista: [], hechos: {} }, "Tomar 2 litros de agua", ""), "Estirar 5 minutos", "🧘");

test("agregar usa el ícono sugerido y crea ids únicos", () => {
  const h = agregar(base(), "Estirar 5 minutos", "🧘");
  assert.equal(h.lista[0].icono, "💧");
  assert.deepEqual(h.lista.map((x) => x.id), ["agua", "estirar-5-minutos", "estirar-5-minutos-2"]);
});

test("marcar y desmarcar el mismo día", () => {
  let h = marcar(base(), "agua", "2026-11-03");
  assert.deepEqual(h.hechos["2026-11-03"], ["agua"]);
  h = marcar(h, "agua", "2026-11-03");
  assert.equal(h.hechos["2026-11-03"], undefined);
});

test("la racha no se pierde en la mañana y se corta si faltó un día", () => {
  let h = base();
  for (const d of ["2026-11-01", "2026-11-02"]) h = marcar(h, "agua", d);
  assert.equal(racha(h, "agua", "2026-11-03"), 2, "hoy aún no marca: cuenta hasta ayer");
  h = marcar(h, "agua", "2026-11-03");
  assert.equal(racha(h, "agua", "2026-11-03"), 3);
  assert.equal(racha(marcar(h, "agua", "2026-11-02"), "agua", "2026-11-03"), 1, "faltó el 2: la racha empieza otra vez");
});

test("racha completa solo cuenta días con todos los hábitos", () => {
  let h = base();
  h = marcar(marcar(h, "agua", "2026-11-02"), "estirar-5-minutos", "2026-11-02");
  h = marcar(h, "agua", "2026-11-03");
  assert.equal(rachaCompleta(h, "2026-11-03"), 1);
  assert.deepEqual(pendientesDeHoy(h, "2026-11-03").map((x) => x.id), ["estirar-5-minutos"]);
});

test("aviso de la noche solo si falta algo", () => {
  let h = base();
  assert.match(avisoHabitos(h, "2026-11-03")!.titulo, /no has marcado/);
  h = marcar(h, "agua", "2026-11-03");
  assert.match(avisoHabitos(h, "2026-11-03")!.titulo, /falta 1 hábito/);
  h = marcar(h, "estirar-5-minutos", "2026-11-03");
  assert.equal(avisoHabitos(h, "2026-11-03"), null);
});

test("quitar un hábito borra sus palomitas y limpiar tolera datos raros", () => {
  const h = quitar(marcar(base(), "agua", "2026-11-03"), "agua");
  assert.equal(h.hechos["2026-11-03"], undefined);
  assert.deepEqual(limpiarHabitos({ lista: [{ id: 1 }], hechos: "x" }), { lista: [], hechos: {} });
});

test("solo guarda los últimos 120 días", () => {
  let h = marcar(base(), "agua", "2026-01-01");
  h = marcar(h, "agua", "2026-11-03");
  assert.equal(h.hechos["2026-01-01"], undefined);
});
