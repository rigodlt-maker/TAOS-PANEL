// Candado de las actualizaciones: lo que se publica a los compradores nunca debe borrar sus datos,
// y la app siempre debe poder ponerse al día sola.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { esMasNueva } from "../app/actualizacion";

const REPO = "taos-panel";
const DIR = "supabase/migrations";
const archivosSql = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort().map((f) => `${DIR}/${f}`) : ["supabase/instalar.sql"];

// Instrucciones que pueden borrar o cambiar datos de un comprador
const PELIGROSAS = [
  /\bdrop\s+(table|column|schema|view|materialized\s+view|type|index\s+(?!if\s+exists))/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\balter\s+column\s+\S+\s+(set\s+data\s+)?type\b/i,
  /\brename\s+(column\s+|to\s+)/i,
];

test("ninguna migración borra ni cambia datos (solo se agregan tablas y columnas)", () => {
  for (const archivo of archivosSql) {
    // sin comentarios, para no confundir una explicación con una instrucción
    const sql = readFileSync(archivo, "utf8").replace(/--.*$/gm, "");
    for (const regla of PELIGROSAS) assert.doesNotMatch(sql, regla, `${archivo} tiene una instrucción que podría borrar datos: ${regla}`);
  }
});

test("taos-version.json: versión y novedades", () => {
  const v = JSON.parse(readFileSync("taos-version.json", "utf8"));
  assert.match(v.version, /^\d+\.\d+\.\d+$/);
  assert.ok(Array.isArray(v.novedades) && v.novedades.length > 0 && v.novedades.every((n: unknown) => typeof n === "string" && n.length > 5));
});

test("el botón Actualizar TAOS trae esta app, cada noche, sin tocar el propio botón", () => {
  const wf = readFileSync(".github/workflows/actualizar.yml", "utf8");
  assert.match(wf, new RegExp(`github\\.com/rigodlt-maker/${REPO}\\.git`));
  assert.match(wf, /schedule:/);
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /--exclude \.github\/workflows/);
  assert.match(wf, /repository_owner != 'rigodlt-maker'/);
});

test("comparar versiones", () => {
  assert.ok(esMasNueva("1.1.0", "1.0.9"));
  assert.ok(esMasNueva("1.10.0", "1.9.2"));
  assert.ok(esMasNueva("2.0.0", "1.99.99"));
  assert.ok(!esMasNueva("1.1.0", "1.1.0"));
  assert.ok(!esMasNueva("1.0.0", "1.2.0"));
});
