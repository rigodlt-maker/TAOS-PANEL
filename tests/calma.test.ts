// Clima animado y sesión de calma
import assert from "node:assert/strict";
import { test } from "node:test";
import { FRASES, fraseDelDia } from "../lib/calma";
import { escenaDe } from "../lib/clima";
import { responderTao } from "../lib/tao";

test("la escena del cielo sigue el código del clima y si es de día", () => {
  assert.equal(escenaDe(0, true), "sol");
  assert.equal(escenaDe(1, false), "luna");
  assert.equal(escenaDe(3, true), "nubes");
  assert.equal(escenaDe(61, true), "lluvia");
  assert.equal(escenaDe(81, false), "lluvia");
  assert.equal(escenaDe(95, true), "tormenta");
  assert.equal(escenaDe(73, true), "nieve");
  assert.equal(escenaDe(45, true), "niebla");
});

test("una frase por día, que cambia de un día al siguiente", () => {
  assert.ok(FRASES.includes(fraseDelDia("2026-10-30")));
  assert.notEqual(fraseDelDia("2026-10-30"), fraseDelDia("2026-10-31"));
});

test("si no puedes dormir, Tao te lleva a la sesión de calma", () => {
  const r = responderTao("no puedo dormir", {} as Parameters<typeof responderTao>[1]);
  assert.match(r, /\(\/calma\)/);
});

test("acciones de correo: valida el id y en modo demostración no toca Gmail", async () => {
  const { modificarCorreo } = await import("../lib/google");
  const { TOKEN_DEMO } = await import("../lib/demo");
  await assert.rejects(modificarCorreo("token-real", "../../borrar", "papelera"), /no válido/);
  await modificarCorreo(TOKEN_DEMO, "1", "archivar");
});
