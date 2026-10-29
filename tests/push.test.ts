// Notificaciones push del panel: llaves VAPID y textos de la mañana y la noche (datos inventados)
import assert from "node:assert/strict";
import { test } from "node:test";
import webpush from "web-push";
import type { Evento } from "../lib/google";
import { avisoDelDia, enviarPush, llavesDesde, soloDominio } from "../lib/push";

const ev = (titulo: string, inicio: string, fin: string, todoElDia = false): Evento => ({ titulo, inicio, fin, todoElDia, asistentes: 1 });
const hoy = "2026-10-28";
const semana = [
  ev("Gimnasio", "2026-10-28T07:00:00-06:00", "2026-10-28T08:00:00-06:00"),
  ev("Dentista", "2026-10-28T17:30:00-06:00", "2026-10-28T18:00:00-06:00"),
  ev("Cumpleaños de Ana", "2026-10-28", "2026-10-29", true),
  ev("Junta", "2026-10-29T08:30:00-06:00", "2026-10-29T09:30:00-06:00"),
];

test("las llaves VAPID son las mismas que en Finanzas y Cerebro", () => {
  const a = llavesDesde("sb_secret_inventada_123");
  assert.equal(Buffer.from(a.publica, "base64url").length, 65);
  assert.doesNotThrow(() => webpush.setVapidDetails("mailto:prueba@example.com", a.publica, a.privada));
});

test("aviso de la mañana: eventos de hoy y tareas que vencen", () => {
  const a = avisoDelDia("manana", hoy, semana, [{ titulo: "Pagar luz", vence: "2026-10-28" }, { titulo: "Luego", vence: "2026-11-10" }]);
  assert.equal(a.titulo, "☀️ Hoy tienes 3 eventos");
  assert.match(a.cuerpo, /^Todo el día Cumpleaños de Ana · 7:00 .*Gimnasio · 5:30 .*Dentista/);
  assert.match(a.cuerpo, /1 tarea vence hoy: Pagar luz$/);
  assert.equal(avisoDelDia("manana", "2026-10-30", semana, []).titulo, "☀️ Hoy tienes el día libre");
});

test("aviso de la noche: lo de mañana y si empieza temprano", () => {
  const n = avisoDelDia("noche", hoy, semana, []);
  assert.match(n.titulo, /^🌙 Mañana empiezas temprano: 8:30/);
  assert.match(n.cuerpo, /Junta/);
  assert.equal(avisoDelDia("noche", "2026-10-30", semana, []).titulo, "🌙 Mañana no tienes eventos");
  assert.match(avisoDelDia("noche", hoy, null, null).cuerpo, /No se pudo leer tu agenda/);
});

test("sin Supabase configurado no intenta enviar", async () => {
  delete process.env.SUPABASE_SECRET_KEY;
  assert.deepEqual(await enviarPush({ titulo: "x", cuerpo: "y" }), { enviados: 0, fallidos: 0 });
});

test("la URL de Supabase se limpia aunque se haya copiado con ruta", () => {
  assert.equal(soloDominio(" https://abc.supabase.co/rest/v1/ "), "https://abc.supabase.co");
  assert.equal(soloDominio("https://abc.supabase.co"), "https://abc.supabase.co");
});
