import { test } from "node:test";
import assert from "node:assert/strict";
import { anotarFallo, limpiarIntentos, minutosDeEspera, VENTANA_MS } from "../lib/intentos";

test("S17: después de 5 contraseñas incorrectas esa dirección espera 15 minutos", () => {
  const t = 1_000_000;
  for (let i = 0; i < 4; i++) anotarFallo("1.1.1.1", t);
  assert.equal(minutosDeEspera("1.1.1.1", t), 0);
  anotarFallo("1.1.1.1", t);
  assert.equal(minutosDeEspera("1.1.1.1", t), 15);
  assert.equal(minutosDeEspera("2.2.2.2", t), 0); // otra dirección no se bloquea
  assert.equal(minutosDeEspera("1.1.1.1", t + VENTANA_MS + 1), 0); // pasado el tiempo, puede intentar
  for (let i = 0; i < 5; i++) anotarFallo("3.3.3.3", t);
  limpiarIntentos("3.3.3.3");
  assert.equal(minutosDeEspera("3.3.3.3", t), 0);
});
