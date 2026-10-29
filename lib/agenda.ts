import { DESFASE } from "./config";
import { duracion, fechaCorta, fechaDeIso, fechaLocal, horaLocal } from "./fechas";
import type { Evento, Tarea } from "./google";

// Horario en el que se buscan bloques libres
const INICIO_DIA = "08:00";
const FIN_DIA = "21:00";
const MINIMO_LIBRE = 45;
const MARGEN_MINIMO = 15;

export type EventoMarcado = Evento & { minutos: number; conflicto: boolean; pocoMargen: boolean };
export type BloqueLibre = { inicio: string; fin: string; minutos: number };
export type DiaAgenda = {
  fecha: string;
  todoElDia: Evento[];
  eventos: EventoMarcado[];
  libres: BloqueLibre[];
  minutosLibres: number;
  minutosReunion: number;
};

const ms = (iso: string) => new Date(iso).getTime();
const minutosEntre = (a: number, b: number) => Math.round((b - a) / 60_000);

// Una reunión es un evento con otras personas o con videollamada
export const esReunion = (e: Evento) => e.asistentes > 1 || !!e.videollamada;

export function eventosDelDia(eventos: Evento[], fecha: string): Evento[] {
  return eventos.filter((e) => (e.todoElDia ? e.inicio <= fecha && fecha < e.fin : fechaDeIso(e.inicio) === fecha));
}

export function analizarDia(fecha: string, eventos: Evento[]): DiaAgenda {
  const delDia = eventosDelDia(eventos, fecha);
  const conHora = delDia
    .filter((e) => !e.todoElDia)
    .sort((a, b) => ms(a.inicio) - ms(b.inicio))
    .map((e) => ({ ...e, minutos: minutosEntre(ms(e.inicio), ms(e.fin)), conflicto: false, pocoMargen: false }));

  for (let i = 0; i < conHora.length; i++) {
    for (let j = i + 1; j < conHora.length; j++) {
      const a = conHora[i];
      const b = conHora[j];
      if (ms(b.inicio) < ms(a.fin)) {
        a.conflicto = b.conflicto = true;
      } else if (j === i + 1 && minutosEntre(ms(a.fin), ms(b.inicio)) < MARGEN_MINIMO) {
        a.pocoMargen = b.pocoMargen = true;
      }
    }
  }

  // Bloques libres de 45 min o más dentro del horario del día (en el día de hoy, desde ahora)
  const inicioVentana = ms(`${fecha}T${INICIO_DIA}:00${DESFASE}`);
  const finVentana = ms(`${fecha}T${FIN_DIA}:00${DESFASE}`);
  let cursor = fecha === fechaLocal() ? Math.max(inicioVentana, Date.now()) : inicioVentana;
  const libres: BloqueLibre[] = [];
  const agregarLibre = (desde: number, hasta: number) => {
    const minutos = minutosEntre(desde, Math.min(hasta, finVentana));
    if (minutos >= MINIMO_LIBRE) {
      libres.push({ inicio: new Date(desde).toISOString(), fin: new Date(Math.min(hasta, finVentana)).toISOString(), minutos });
    }
  };
  for (const e of conHora) {
    if (ms(e.inicio) > cursor) agregarLibre(cursor, ms(e.inicio));
    cursor = Math.max(cursor, ms(e.fin));
  }
  if (cursor < finVentana) agregarLibre(cursor, finVentana);

  return {
    fecha,
    todoElDia: delDia.filter((e) => e.todoElDia),
    eventos: conHora,
    libres,
    minutosLibres: libres.reduce((t, b) => t + b.minutos, 0),
    minutosReunion: conHora.filter(esReunion).reduce((t, e) => t + e.minutos, 0),
  };
}

// Alertas que salen de cruzar agenda y tareas, sin IA
export function alertasCruzadas(semana: Evento[], tareas: Tarea[], hoy: string): string[] {
  const alertas: string[] = [];
  const diaHoy = analizarDia(hoy, semana);

  const choques = diaHoy.eventos.filter((e) => e.conflicto).length;
  if (choques) alertas.push(`Hoy tienes ${choques} eventos que se empalman.`);

  for (const e of diaHoy.eventos) {
    if (esReunion(e) && !e.videollamada && !e.lugar && !e.descripcion?.trim()) {
      alertas.push(`"${e.titulo}" (${horaLocal(e.inicio)}) no tiene enlace, lugar ni descripción.`);
    }
  }

  const vencenHoy = tareas.filter((t) => t.vence === hoy).length;
  if (vencenHoy && diaHoy.minutosLibres < vencenHoy * 30) {
    alertas.push(
      `Te vencen ${vencenHoy} tarea${vencenHoy > 1 ? "s" : ""} hoy y solo te quedan ${duracion(diaHoy.minutosLibres)} libres.`,
    );
  }

  const vencidas = tareas.filter((t) => t.vence && t.vence < hoy).length;
  if (vencidas) alertas.push(`Tienes ${vencidas} tarea${vencidas > 1 ? "s" : ""} vencida${vencidas > 1 ? "s" : ""}.`);

  const fechas = new Set(semana.filter((e) => !e.todoElDia).map((e) => fechaDeIso(e.inicio)));
  for (const fecha of [...fechas].sort()) {
    const dia = analizarDia(fecha, semana);
    if (dia.minutosReunion > 6 * 60) {
      alertas.push(`El ${fechaCorta(fecha)} tienes ${duracion(dia.minutosReunion)} de reuniones.`);
    }
  }
  return alertas;
}
