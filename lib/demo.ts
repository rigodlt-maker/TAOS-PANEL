// Modo demostración: sin PANEL_PASSWORD el panel abre sin contraseña y muestra agenda, correos y tareas ficticios
// (para ver la app o grabar videos). Clima y noticias sí son reales. Al poner PANEL_PASSWORD queda protegido.
import { DESFASE } from "./config";
import { sumarDias } from "./fechas";
import type { Categoria, Correo, Evento, Tarea } from "./google";

export const esDemo = () => !process.env.PANEL_PASSWORD;
export const TOKEN_DEMO = "demo";

const a = (fecha: string, hora: string) => `${fecha}T${hora}:00${DESFASE}`;

export function eventosDemo(hoy: string): Evento[] {
  const d = (n: number) => sumarDias(hoy, n);
  return [
    { titulo: "Gimnasio: pierna", inicio: a(d(0), "07:00"), fin: a(d(0), "08:00"), todoElDia: false, lugar: "Gimnasio", asistentes: 1 },
    { titulo: "Junta de equipo", inicio: a(d(0), "10:00"), fin: a(d(0), "11:00"), todoElDia: false, videollamada: "https://meet.google.com/", asistentes: 6 },
    { titulo: "Comida con Laura", inicio: a(d(0), "14:30"), fin: a(d(0), "15:30"), todoElDia: false, lugar: "Restaurante Centro", asistentes: 2 },
    { titulo: "Revisar presupuesto", inicio: a(d(0), "18:00"), fin: a(d(0), "18:30"), todoElDia: false, asistentes: 1 },
    { titulo: "Cumpleaños de mamá", inicio: d(1), fin: d(2), todoElDia: true, asistentes: 1 },
    { titulo: "Dentista", inicio: a(d(1), "09:00"), fin: a(d(1), "09:45"), todoElDia: false, lugar: "Consultorio", asistentes: 1 },
    { titulo: "Gimnasio: torso", inicio: a(d(1), "19:00"), fin: a(d(1), "20:00"), todoElDia: false, asistentes: 1 },
    { titulo: "Entrega del proyecto", inicio: a(d(2), "12:00"), fin: a(d(2), "13:00"), todoElDia: false, asistentes: 4 },
    { titulo: "Cine", inicio: a(d(3), "20:00"), fin: a(d(3), "22:30"), todoElDia: false, asistentes: 2 },
  ];
}

export function correosDemo(): { total: number; correos: Correo[]; categorias: Categoria[] } {
  const correo = (id: string, de: string, asunto: string, fragmento: string): Correo => ({ id, de, direccion: `${id}@ejemplo.com`, asunto, fragmento, enlace: "https://mail.google.com/" });
  return {
    total: 4,
    correos: [
      correo("ana", "Ana Torres", "¿Nos vemos el jueves?", "Hola, ¿te queda bien el jueves a las 5 para revisar lo del viaje?"),
      correo("banco", "Tu banco", "Tu estado de cuenta está listo", "Fecha límite de pago: 15 de este mes. Pago para no generar intereses…"),
      correo("pedro", "Pedro Ruiz", "Propuesta final", "Te mando la versión final de la propuesta; dime si cambiamos algo antes del viernes."),
      correo("escuela", "Escuela Primavera", "Junta de padres", "Les recordamos la junta del próximo lunes a las 8:00."),
    ],
    categorias: [
      { nombre: "Promociones", sinLeer: 23, enlace: "https://mail.google.com/" },
      { nombre: "Social", sinLeer: 5, enlace: "https://mail.google.com/" },
    ],
  };
}

export function tareasDemo(hoy: string): Tarea[] {
  return [
    { titulo: "Pagar la luz", vence: hoy },
    { titulo: "Comprar regalo de mamá", vence: sumarDias(hoy, 1) },
    { titulo: "Llamar al seguro del auto", vence: sumarDias(hoy, 3) },
    { titulo: "Leer 20 páginas" },
  ];
}
