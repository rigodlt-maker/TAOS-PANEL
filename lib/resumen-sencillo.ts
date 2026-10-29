import { analizarDia, esReunion } from "./agenda";
import { duracion, fechaLarga, horaLocal, sumarDias } from "./fechas";
import type { Momento, ResumenIA } from "./ia";
import type { DatosPanel } from "./panel";

// Remitentes automáticos: boletines, avisos y notificaciones
const AUTOMATICO =
  /no-?reply|noreply|do[-_]?not[-_]?reply|notif|mailer|newsletter|news@|info@|support|soporte|updates|team@|hello@|hola@|marketing|promo|billing|alert/i;

// Versión gratuita del resumen: reglas fijas en lugar de IA, con la misma forma de respuesta
export function resumenSencillo(momento: Momento, datos: DatosPanel): ResumenIA {
  const fecha = momento === "noche" ? sumarDias(datos.hoy, 1) : datos.hoy;
  const dia = analizarDia(fecha, datos.semana.ok ? datos.semana.datos : []);
  const tareas = datos.tareas.ok ? datos.tareas.datos : [];
  const correos = datos.correo.ok ? datos.correo.datos.correos : [];

  const reuniones = dia.eventos.filter(esReunion).length;
  const vencidas = tareas.filter((t) => t.vence && t.vence < datos.hoy);
  const paraElDia = tareas.filter((t) => t.vence === fecha);
  const proximoEvento = dia.eventos.find((e) => new Date(e.fin).getTime() > Date.now());

  const prioridades: ResumenIA["prioridades"] = [
    ...vencidas.map((t) => ({ titulo: t.titulo, motivo: `Venció el ${fechaLarga(t.vence!)}.` })),
    ...paraElDia.map((t) => ({ titulo: t.titulo, motivo: momento === "noche" ? "Vence mañana." : "Vence hoy." })),
    ...dia.eventos
      .filter((e) => new Date(e.fin).getTime() > Date.now())
      .map((e) => ({ titulo: e.titulo, motivo: `A las ${horaLocal(e.inicio)}${e.conflicto ? " (se empalma con otro evento)" : ""}` })),
    ...tareas.filter((t) => !t.vence).map((t) => ({ titulo: t.titulo, motivo: "Pendiente sin fecha." })),
  ].slice(0, 3);

  const partes = [
    reuniones ? `${reuniones} reunión${reuniones > 1 ? "es" : ""}` : dia.eventos.length ? `${dia.eventos.length} evento${dia.eventos.length > 1 ? "s" : ""}` : "agenda libre",
    `${duracion(dia.minutosLibres)} libres`,
  ];
  const clave = prioridades[0] ? `; lo más importante: ${prioridades[0].titulo}` : "";

  const sobrecargado = dia.eventos.some((e) => e.conflicto) || (paraElDia.length > 0 && dia.minutosLibres < paraElDia.length * 30);
  return {
    hoy_en_una_linea: `${momento === "noche" ? "Mañana" : "Hoy"}: ${partes.join(", ")}${clave}.`,
    prioridades,
    correos: correos.map((c) => ({
      id: c.id,
      categoria: AUTOMATICO.test(c.direccion) ? ("informativo" as const) : ("responder_hoy" as const),
      resumen: c.asunto,
    })),
    alertas: [],
    sugerencia: sobrecargado
      ? proximoEvento
        ? `Tu día está apretado: considera mover algo de lo que no sea urgente a otro día o acortar "${proximoEvento.titulo}".`
        : "Tu día está apretado: considera mover a mañana lo que no sea urgente."
      : null,
  };
}
