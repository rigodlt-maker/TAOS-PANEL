// Sesión del panel: firmada, con vencimiento y sin la contraseña adentro (claves inventadas)
import assert from "node:assert/strict";
import { test } from "node:test";
import { claveCorrecta, crearSesion, mismaClave, sesionValida } from "../lib/auth";

function conClaves(panel: string | undefined, secreta = "sb_secret_inventada_123") {
  if (panel === undefined) delete process.env.PANEL_PASSWORD;
  else process.env.PANEL_PASSWORD = panel;
  process.env.SUPABASE_SECRET_KEY = secreta;
}

test("la sesión recién creada es válida y no contiene la contraseña", async () => {
  conClaves("mi-clave-larga");
  const s = await crearSesion();
  assert.ok(await sesionValida(s));
  assert.ok(!s.includes("mi-clave-larga"));
});

test("rechaza cookies vacías, inventadas o alteradas", async () => {
  conClaves("mi-clave-larga");
  const s = await crearSesion();
  const [vence, firma] = s.split(".");
  assert.equal(await sesionValida(undefined), false);
  assert.equal(await sesionValida("cualquier-cosa"), false);
  assert.equal(await sesionValida(`${Number(vence) + 999999}.${firma}`), false);
  assert.equal(await sesionValida(`${vence}.${firma.slice(0, -2)}xx`), false);
});

test("una sesión vencida ya no sirve", async () => {
  conClaves("mi-clave-larga");
  const [, firma] = (await crearSesion()).split(".");
  assert.equal(await sesionValida(`1000.${firma}`), false);
});

test("cambiar la contraseña o la llave secreta cierra las sesiones", async () => {
  conClaves("mi-clave-larga");
  const s = await crearSesion();
  conClaves("otra-clave-larga");
  assert.equal(await sesionValida(s), false);
  conClaves("mi-clave-larga", "sb_secret_otra_456");
  assert.equal(await sesionValida(s), false);
});

test("revisa la contraseña y compara claves", async () => {
  conClaves("mi-clave-larga");
  assert.ok(await claveCorrecta("mi-clave-larga"));
  assert.equal(await claveCorrecta("mi-clave-larg"), false);
  assert.equal(await claveCorrecta(""), false);
  assert.ok(await mismaClave("Bearer abc", "Bearer abc"));
  assert.equal(await mismaClave(null, "Bearer abc"), false);
});

test("sin PANEL_PASSWORD queda en modo demostración y no se puede iniciar sesión", async () => {
  conClaves(undefined);
  assert.ok(await sesionValida(undefined));
  assert.equal(await claveCorrecta(""), false);
  await assert.rejects(crearSesion());
});
