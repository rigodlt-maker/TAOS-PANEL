// 1.3.0: A1 (botón «Evento» solo ícono), B4 (errores de Clima y Noticias en palabras sencillas) y letrero del SQL en Hoy
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { mensajeDeError, seguro } from "../lib/panel";

test("A1 (1.3.0): el botón «Evento» es siempre solo el ícono", () => {
  const s = readFileSync("app/navegacion.tsx", "utf8");
  assert.doesNotMatch(s, /\{arriba && "Evento"\}/);
  assert.match(s, /className="fab fab-solo"/);
  assert.match(s, /aria-label="Agregar un evento" title="Agregar un evento"/);
});

test("B4 (1.3.0): «fetch failed» y otras fallas de red se dicen en palabras sencillas, con el detalle aparte", async () => {
  const r = await seguro(Promise.reject(new TypeError("fetch failed")), "el clima");
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.error, "No pude traer el clima. Revisa tu internet e intenta de nuevo en unos minutos.");
  assert.equal(r.detalle, "fetch failed");
  assert.doesNotMatch(r.error, /fetch failed/);
  for (const m of ["El servicio del clima respondió 503", "Google Noticias respondió 500", "connect ETIMEDOUT 1.2.3.4:443", "getaddrinfo ENOTFOUND api.open-meteo.com"]) {
    const x = mensajeDeError(new Error(m), "las noticias");
    assert.match(x.error, /^No pude traer las noticias\./);
    assert.equal(x.detalle, m);
  }
});

test("B4 (1.3.0): los avisos que ya están escritos para la persona se muestran tal cual", () => {
  const m = "Falta conectar tu cuenta de Google: entra a Más y toca «Conectar con Google».";
  assert.deepEqual(mensajeDeError(new Error(m), "tu agenda"), { error: m });
});

test("B4 (1.3.0): Clima, Noticias, Agenda, Correo y Tareas muestran el error con «Detalle para soporte» escondido", () => {
  const c = readFileSync("app/error-seccion.tsx", "utf8");
  assert.match(c, /<summary>Detalle para soporte<\/summary>/);
  const mas = readFileSync("app/(panel)/mas/page.tsx", "utf8");
  assert.match(mas, /<ErrorSeccion error=\{clima\.error\} detalle=\{clima\.detalle\} \/>/);
  assert.match(mas, /<ErrorSeccion error=\{noticias\.error\} detalle=\{noticias\.detalle\} \/>/);
  for (const f of ["app/(panel)/page.tsx", "app/(panel)/tareas/page.tsx", "app/(panel)/correo/page.tsx", "app/componentes.tsx", "app/(panel)/mas/page.tsx"])
    assert.doesNotMatch(readFileSync(f, "utf8"), /<p className="error">⚠️ \{(clima|noticias|semana|tareas|correo)\.error\}<\/p>/, f);
});

test("Letrero 1.3.0: si falta el SQL nuevo, Hoy lo avisa (no solo Ajustes)", () => {
  const s = readFileSync("app/(panel)/page.tsx", "utf8");
  assert.match(s, /esDemo\(\) \? null : estadoDespertador\(\)/);
  assert.match(s, /despertador\?\.faltaSql &&/);
  assert.match(s, /Tu app se actualizó: falta 1 paso\. Pega el SQL nuevo\./);
  assert.match(s, /href="\/configurar"/);
});
