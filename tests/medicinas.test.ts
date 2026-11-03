import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarioIcs, enlaceGoogle, firmaValida, firmar, guardarMedicina, horarios, limpiarMedicinas, marcarToma, porAvisar, quitarMedicina, textoDosis, tomasDelDia, type Medicinas } from "../lib/medicinas";

const vacio: Medicinas = { lista: [], tomas: {}, enviados: [] };
const conIbuprofeno = guardarMedicina(vacio, { id: "ibu", nombre: "Ibuprofeno", cantidad: 1, unidad: "tableta", cadaHoras: 8, primera: "08:00", nota: "", foto: null });

test("horas de cada día y texto de la dosis", () => {
  assert.deepEqual(horarios({ primera: "08:00", cadaHoras: 8 }), ["00:00", "08:00", "16:00"]);
  assert.deepEqual(horarios({ primera: "21:30", cadaHoras: 12 }), ["09:30", "21:30"]);
  assert.deepEqual(horarios({ primera: "07:00", cadaHoras: 24 }), ["07:00"]);
  assert.equal(textoDosis({ cantidad: 1, unidad: "pastilla" }), "1 pastilla");
  assert.equal(textoDosis({ cantidad: 2, unidad: "cucharada" }), "2 cucharadas");
  assert.equal(textoDosis({ cantidad: 0.5, unidad: "tableta" }), "½ tableta");
  assert.equal(textoDosis({ cantidad: 1.5, unidad: "tableta" }), "1½ tabletas");
  assert.equal(textoDosis({ cantidad: 2, unidad: "inyección" }), "2 inyecciones");
  assert.equal(textoDosis({ cantidad: 20, unidad: "gotas" }), "20 gotas");
});

test("limpia datos raros y respeta límites", () => {
  const d = limpiarMedicinas({ lista: [{ id: "x", nombre: "  Magnesio ", cantidad: "abc", unidad: "kilo", cadaHoras: 5, primera: "25:00", foto: "http://malo" }] });
  assert.deepEqual(d.lista[0], { id: "x", nombre: "Magnesio", cantidad: 1, unidad: "pastilla", cadaHoras: 24, primera: "08:00", nota: "", foto: null });
});

test("marcar una toma y la lista del día", () => {
  const d = marcarToma(conIbuprofeno, "2026-11-03", "ibu", "08:00");
  const dia = tomasDelDia(d, "2026-11-03");
  assert.deepEqual(dia.map((t) => [t.hora, t.hecha]), [["00:00", false], ["08:00", true], ["16:00", false]]);
  assert.equal(tomasDelDia(marcarToma(d, "2026-11-03", "ibu", "08:00"), "2026-11-03")[1].hecha, false);
  assert.equal(quitarMedicina(d, "ibu").lista.length, 0);
});

test("qué avisar: lo que ya tocó en las últimas 2 horas, sin tomar ni avisar", () => {
  const t = Date.parse("2026-11-03T16:05:00-06:00");
  const avisos = porAvisar(conIbuprofeno, t);
  assert.deepEqual(avisos.map((a) => a.clave), ["2026-11-03 ibu@16:00"]);
  assert.equal(porAvisar({ ...conIbuprofeno, enviados: ["2026-11-03 ibu@16:00"] }, t).length, 0);
  assert.equal(porAvisar(marcarToma(conIbuprofeno, "2026-11-03", "ibu", "16:00"), t).length, 0);
  // a las 00:10 toca la de medianoche del día nuevo
  assert.deepEqual(porAvisar(conIbuprofeno, Date.parse("2026-11-04T00:10:00-06:00")).map((a) => a.clave), ["2026-11-04 ibu@00:00"]);
  // 3 horas tarde ya no se avisa
  assert.equal(porAvisar(conIbuprofeno, Date.parse("2026-11-03T19:30:00-06:00")).length, 0);
});

test("firmas, calendario y Google Calendar", () => {
  assert.ok(firmaValida("ibu", firmar("ibu")));
  assert.ok(!firmaValida("ibu", firmar("otra")));
  assert.ok(!firmaValida("ibu", null));
  const ics = calendarioIcs(conIbuprofeno, "2026-11-03");
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 3);
  assert.match(ics, /DTSTART;TZID=America\/Mexico_City:20261103T160000/);
  assert.match(ics, /RRULE:FREQ=DAILY/);
  assert.match(ics, /TRIGGER:PT0M/);
  const url = new URL(enlaceGoogle(conIbuprofeno.lista[0], "16:00", "2026-11-03"));
  assert.equal(url.searchParams.get("dates"), "20261103T160000/20261103T161000");
  assert.equal(url.searchParams.get("recur"), "RRULE:FREQ=DAILY");
});
