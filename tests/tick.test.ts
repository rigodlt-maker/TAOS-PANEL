// S14-A · Firma del despertador: solo el servidor de TAOS (llave privada) puede activarlo, solo para ESTA instalación
import assert from "node:assert/strict";
import { randomUUID, webcrypto } from "node:crypto";
import { test } from "node:test";
import { cadenaTick, RUTA_TICK, verificarTick } from "../lib/tick-firma";

const ORIGEN = "https://mi-panel.vercel.app";
const listo = (async () => {
  const par = (await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  return { par, LLAVES: { "tick-prueba": await webcrypto.subtle.exportKey("jwk", par.publicKey) } };
})();
const ahora = Date.parse("2026-11-10T18:00:00Z");
const iat = Math.floor(ahora / 1000);

async function pedido(o: { kid?: string; origen?: string; iat?: number; slot?: number; jti?: string; metodo?: string; ruta?: string; cuerpo?: string; firmaDe?: string } = {}) {
  const kid = o.kid ?? "tick-prueba", t = o.iat ?? iat, slot = o.slot ?? Math.floor(t / 900), jti = o.jti ?? randomUUID();
  const texto = o.firmaDe ?? cadenaTick(kid, o.origen ?? ORIGEN, t, slot, jti);
  const { par } = await listo;
  const firma = Buffer.from(await webcrypto.subtle.sign({ name: "Ed25519" }, par.privateKey, new TextEncoder().encode(texto))).toString("base64url");
  return new Request(`${ORIGEN}${o.ruta ?? RUTA_TICK}`, {
    method: o.metodo ?? "POST",
    body: o.cuerpo,
    headers: { "x-taos-kid": kid, "x-taos-iat": String(t), "x-taos-slot": String(slot), "x-taos-jti": jti, "x-taos-firma": firma },
  });
}
const revisar = async (r: Request, origen: string | null = ORIGEN) => verificarTick(r, ahora, (await listo).LLAVES, origen);

test("S14: una llamada firmada por el servidor para esta instalación sí pasa", async () => {
  const r = await revisar(await pedido());
  assert.equal(r.ok, true);
});

test("S14-01: GET, sin firma o con una llave desconocida: rechazo", async () => {
  assert.equal((await revisar(await pedido({ metodo: "GET" }))).ok, false);
  assert.equal((await revisar(new Request(`${ORIGEN}${RUTA_TICK}`, { method: "POST" }))).ok, false);
  assert.equal((await revisar(await pedido({ kid: "otra" }))).ok, false);
});

test("S14-02: la firma de la instalación A no sirve en la B", async () => {
  assert.equal((await revisar(await pedido({ origen: "https://otra.vercel.app" }))).ok, false);
  assert.equal((await revisar(await pedido(), "https://otra.vercel.app")).ok, false);
});

test("S14-03: cambiar turno, jti, ruta o cuerpo invalida la firma", async () => {
  const jti = randomUUID();
  const firmadoOtroTurno = await pedido({ jti, firmaDe: cadenaTick("tick-prueba", ORIGEN, iat, Math.floor(iat / 900) - 1, jti) });
  assert.equal((await revisar(firmadoOtroTurno)).ok, false);
  assert.equal((await revisar(await pedido({ firmaDe: cadenaTick("tick-prueba", ORIGEN, iat, Math.floor(iat / 900), randomUUID()) }))).ok, false);
  assert.equal((await revisar(await pedido({ ruta: "/api/otra" }))).ok, false);
  assert.equal((await revisar(await pedido({ cuerpo: "x" }))).ok, false);
});

test("S14-04: hora vieja (más de 5 min) o del futuro (más de 1 min): rechazo; turno del futuro tampoco", async () => {
  assert.equal((await revisar(await pedido({ iat: iat - 301 }))).ok, false);
  assert.equal((await revisar(await pedido({ iat: iat + 61 }))).ok, false);
  assert.equal((await revisar(await pedido({ slot: Math.floor(iat / 900) + 1 }))).ok, false);
  assert.equal((await revisar(await pedido({ slot: Math.floor(iat / 900) - 1 }))).ok, true); // reintento del turno anterior
});

test("S14: sin origen configurado no se atiende (no se confía en el encabezado Host)", async () => {
  const r = await revisar(await pedido(), null);
  assert.equal(r.ok, false);
});

test("S14: solo la llave pública vigente (tick-2026-11c) está en LLAVES_TICK; las retiradas (tick-2026-11, tick-2026-11b) ya no; es Ed25519 válida y sin parte privada", async () => {
  const { LLAVES_TICK } = await import("../lib/tick-firma");
  assert.deepEqual(Object.keys(LLAVES_TICK), ["tick-2026-11c"]);
  for (const vieja of ["tick-2026-11", "tick-2026-11b"]) assert.equal(vieja in LLAVES_TICK, false);
  for (const x of ["84caT7E5RDer3-46F-gqciGEOQtQUk7QVZIOFA2G450", "kA_8nzoSUpkE_aqPt3OXqzwzsySrO0AFKsCmc1Y4ihE"]) assert.equal(JSON.stringify(LLAVES_TICK).includes(x), false);
  const l = LLAVES_TICK["tick-2026-11c"];
  assert.deepEqual(l, { kty: "OKP", crv: "Ed25519", x: "lZWCDm19sm1eJZ7NpoMDwL0J242NHKS0UeMtG3zN-9o" });
  assert.equal("d" in l, false);
  assert.equal(Buffer.from(l.x!, "base64url").length, 32);
  await crypto.subtle.importKey("jwk", l, { name: "Ed25519" }, false, ["verify"]);
});
