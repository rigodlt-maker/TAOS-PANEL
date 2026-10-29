import assert from "node:assert/strict";
import test from "node:test";
import { fechaLocal, sumarDias } from "../lib/fechas";
import { CIUDAD_BASE } from "../lib/preferencias";
import { fechaPedida, normalizar, responderTao, type DatosTao } from "../lib/tao";

const hoy = fechaLocal();
const manana = sumarDias(hoy, 1);
const evento = (fecha: string, h: string, titulo: string, asistentes = 1) => ({
  titulo,
  inicio: `${fecha}T${h}:00-06:00`,
  fin: `${fecha}T${String(Number(h.slice(0, 2)) + 1).padStart(2, "0")}${h.slice(2)}:00-06:00`,
  todoElDia: false,
  asistentes,
});

const datos: DatosTao = {
  hoy,
  semana: { ok: true, datos: [evento(hoy, "23:00", "Llamada con Ana", 2), evento(manana, "10:00", "Dentista"), evento(manana, "16:00", "Junta de equipo", 4)] },
  correo: { ok: true, datos: { total: 2, correos: [{ id: "1", de: "Ana Torres", direccion: "ana@ejemplo.com", asunto: "¿Nos vemos el jueves?", fragmento: "", enlace: "" }], categorias: [] } },
  tareas: { ok: true, datos: [{ titulo: "Pagar la luz", vence: hoy }, { titulo: "Renovar licencia", vence: sumarDias(hoy, -2) }, { titulo: "Leer 20 páginas" }] },
  clima: { ok: true, datos: { temperatura: 21, descripcion: "Nublado", icono: "☁️", dias: [{ fecha: hoy, max: 24, min: 12, lluvia: 70, descripcion: "Lluvia ligera", icono: "🌧️" }, { fecha: manana, max: 26, min: 13, lluvia: 10, descripcion: "Soleado", icono: "☀️" }] } },
  noticias: { ok: true, datos: [{ titulo: "Noticia de prueba", fuente: "Diario", enlace: "" }] },
  prefs: { nombre: "Alex", ciudad: CIUDAD_BASE, lugares: [], configurado: true },
  lugares: [{ nombre: "Casa", icono: "🏡", ruta: "https://www.google.com/maps/dir/?api=1&destination=casa" }],
};

test("Tao del Optimizador responde agenda, tareas, correo, clima y lugares", () => {
  const r = (q: string) => responderTao(q, datos);
  assert.match(r("¿Qué tengo hoy?"), /Llamada con Ana/);
  assert.match(r("que tengo mañana"), /Dentista[\s\S]*Junta de equipo/);
  assert.match(r("¿Qué tareas tengo?"), /Vencidas \(1\)[\s\S]*Renovar licencia/);
  assert.match(r("tengo correos?"), /Ana Torres/);
  assert.match(r("¿va a llover?"), /paraguas/);
  assert.match(r("clima de mañana"), /Soleado/i);
  assert.match(r("como llego a casa"), /google\.com\/maps/);
  assert.match(r("¿qué hago primero?"), /Renovar licencia|Pagar la luz/);
  assert.match(r("noticias"), /Noticia de prueba/);
  assert.match(r("tengo tiempo libre mañana"), /libres/);
  assert.match(r("xyz qwerty"), /No estoy seguro/);
});

test("entiende qué día preguntas", () => {
  assert.equal(fechaPedida(normalizar("¿qué tengo mañana?"), hoy).fecha, manana);
  assert.equal(fechaPedida(normalizar("que tengo en la mañana"), hoy).fecha, hoy);
  assert.equal(fechaPedida(normalizar("pasado mañana"), hoy).fecha, sumarDias(hoy, 2));
});
