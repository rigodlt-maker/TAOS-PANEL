// S14-A · Solo el servidor de TAOS puede despertar los avisos de medicinas.
// El servidor de TAOS (Cloudflare) firma cada llamada con su llave PRIVADA Ed25519 (vive solo en un secreto de
// Cloudflare). Aquí va la llave PÚBLICA: sirve para comprobar la firma, no para fabricar una. Por eso puede ir en el
// código de todas las plantillas sin que nadie pueda usarla para despertar el Optimizador de otra persona.
//
// Lo que se firma (texto exacto, renglones separados por "\n", sin salto al final):
//   taos-medicinas-tick-v1 · kid · POST · origen · /api/medicinas/tick · iat · slot · jti · sha256(cuerpo vacío)
// Encabezados: x-taos-kid, x-taos-iat (segundos), x-taos-slot (iat ÷ 900), x-taos-jti (uuid), x-taos-firma (base64url).
import { createHash, webcrypto } from "node:crypto";

// kid → llave pública (JWK Ed25519). Para cambiar de llave: se agrega la nueva junto a la vieja, se pasa el servidor a la
// nueva y en una versión siguiente se quita la vieja. Se llena con la que genere Rigo (licencias/generar-llave-tick.html).
export const LLAVES_TICK: Record<string, JsonWebKey> = {
  // 13 nov 2026: llave vigente (tick-2026-11 y tick-2026-11b se retiraron y ya no se aceptan)
  "tick-2026-11c": { kty: "OKP", crv: "Ed25519", x: "lZWCDm19sm1eJZ7NpoMDwL0J242NHKS0UeMtG3zN-9o" },
};

export const VERSION_TICK = "taos-medicinas-tick-v1";
export const RUTA_TICK = "/api/medicinas/tick";
export const SHA256_VACIO = createHash("sha256").update("").digest("hex");
const MAX_ANTIGUEDAD = 5 * 60; // segundos
const MAX_FUTURO = 60;

export function cadenaTick(kid: string, origen: string, iat: number, slot: number, jti: string) {
  return [VERSION_TICK, kid, "POST", origen, RUTA_TICK, String(iat), String(slot), jti, SHA256_VACIO].join("\n");
}

// Origen de ESTA instalación, tomado de la configuración del servidor (no del encabezado Host, que manda quien llama)
export function origenCanonico(v: Record<string, string | undefined> = process.env): string | null {
  const crudo = v.PANEL_URL || (v.VERCEL_PROJECT_PRODUCTION_URL ? `https://${v.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  try {
    const u = new URL(crudo);
    return u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

const b64url = (s: string) => Buffer.from(s, "base64url");

export type Tick = { kid: string; iat: number; slot: number; jti: string };

export async function verificarTick(
  req: Request,
  ahora = Date.now(),
  llaves: Record<string, JsonWebKey> = LLAVES_TICK,
  origen: string | null = origenCanonico(),
): Promise<{ ok: true; tick: Tick } | { ok: false; status: number; motivo: string }> {
  const no = (status: number, motivo: string) => ({ ok: false as const, status, motivo });
  if (req.method !== "POST") return no(405, "método");
  if (new URL(req.url).pathname !== RUTA_TICK) return no(404, "ruta");
  if (!origen) return no(503, "sin origen configurado");
  const h = (n: string) => req.headers.get(n) ?? "";
  const kid = h("x-taos-kid"), iatTxt = h("x-taos-iat"), slotTxt = h("x-taos-slot"), jti = h("x-taos-jti"), firma = h("x-taos-firma");
  if (!/^[\w.-]{1,40}$/.test(kid) || !/^\d{9,11}$/.test(iatTxt) || !/^\d{1,9}$/.test(slotTxt) || !/^[0-9a-f-]{36}$/i.test(jti) || !/^[\w-]{86}$/.test(firma))
    return no(401, "encabezados");
  const llave = llaves[kid];
  if (!llave) return no(401, "kid");
  const iat = Number(iatTxt), slot = Number(slotTxt), seg = Math.floor(ahora / 1000);
  if (iat < seg - MAX_ANTIGUEDAD || iat > seg + MAX_FUTURO) return no(401, "hora");
  // El turno firmado debe ser el de iat (o el anterior, si es un reintento) y nunca uno del futuro
  const slotDeIat = Math.floor(iat / 900);
  if (slot !== slotDeIat && slot !== slotDeIat - 1) return no(401, "turno");
  const cuerpo = await req.arrayBuffer();
  if (cuerpo.byteLength !== 0) return no(400, "cuerpo");
  try {
    const publica = await webcrypto.subtle.importKey("jwk", llave, { name: "Ed25519" }, false, ["verify"]);
    const valida = await webcrypto.subtle.verify({ name: "Ed25519" }, publica, b64url(firma), new TextEncoder().encode(cadenaTick(kid, origen, iat, slot, jti)));
    if (!valida) return no(401, "firma");
  } catch {
    return no(401, "firma");
  }
  return { ok: true, tick: { kid, iat, slot, jti } };
}
