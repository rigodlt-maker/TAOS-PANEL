import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOQUEO_MS, claveDe, ipDe, liberarEnMemoria, reservarEnMemoria, VENTANA_MS } from "../lib/intentos";

test("S17 (respaldo en memoria): 5 intentos y al 5º se bloquea 15 minutos contados desde ese 5º", () => {
  const t = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(reservarEnMemoria("a", t).permitido, true);
  const r = reservarEnMemoria("a", t + 1000);
  assert.equal(r.permitido, false);
  assert.equal(r.esperaSeg, BLOQUEO_MS / 1000 - 1);
  assert.equal(reservarEnMemoria("b", t).permitido, true); // otra dirección no se bloquea
  assert.equal(reservarEnMemoria("a", t + BLOQUEO_MS + 1).permitido, true); // pasado el bloqueo, puede intentar
});

test("S17-R3: primer fallo en el minuto 0 y quinto en el 14: espera 15 minutos desde el 5º (no 1)", () => {
  const t = 5_000_000;
  for (let i = 0; i < 4; i++) reservarEnMemoria("c", t);
  reservarEnMemoria("c", t + 14 * 60_000);
  const r = reservarEnMemoria("c", t + 14 * 60_000 + 1000);
  assert.equal(r.permitido, false);
  assert.ok(r.esperaSeg > 14 * 60);
  assert.ok(VENTANA_MS > 0);
});

test("S17: la contraseña correcta devuelve solo su intento (no borra los demás)", () => {
  const t = 9_000_000;
  for (let i = 0; i < 4; i++) reservarEnMemoria("d", t);
  liberarEnMemoria("d");
  assert.equal(reservarEnMemoria("d", t).permitido, true); // 4º
  assert.equal(reservarEnMemoria("d", t).permitido, true); // 5º: bloquea
  assert.equal(reservarEnMemoria("d", t).permitido, false);
});

test("S17: la dirección se guarda como huella, y se usa la que pone Vercel", () => {
  assert.notEqual(claveDe("1.2.3.4"), "1.2.3.4");
  assert.equal(claveDe("1.2.3.4"), claveDe("1.2.3.4"));
  assert.equal(ipDe(new Request("https://x", { headers: { "x-real-ip": "5.6.7.8", "x-forwarded-for": "1.1.1.1, 5.6.7.8" } })), "5.6.7.8");
});
