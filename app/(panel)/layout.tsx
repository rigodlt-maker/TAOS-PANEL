import { Suspense } from "react";
import { EJEMPLOS_TAO } from "@/lib/tao";
import { Navegacion } from "../navegacion";
import { esNube } from "@/lib/modo";
import { esRutaGoogle } from "@/lib/secciones-google";
import { Recorrido, type Paso } from "../recorrido";
import { Campana } from "../campana";
import { Actualizacion } from "../actualizacion";
import { Buscador } from "../buscador";
import { BotonTao } from "../tao";

// Recorrido de bienvenida (sale una sola vez)
const RECORRIDO: Paso[] = [
  { icono: "☀️", titulo: "Bienvenido a Optimizador de Vida", texto: "Tu día en una sola pantalla: agenda, pendientes, correo, clima y hábitos. Te enseño lo básico en 1 minuto." },
  { icono: "💨", titulo: "Aire y salud", texto: "Clima, calidad del aire, rayos UV y si tu auto circula hoy (agrega tu placa en Ajustes).", donde: "aire" },
  { icono: "🌱", titulo: "Tus hábitos", texto: "Palomea cada día dormir bien, tomar agua o lo que tú elijas, y cuida tu racha.", donde: "habitos" },
  { icono: "📅", titulo: "Agenda", texto: "Lo de tu Google Calendar. Di “Ok Google, agenda dentista el viernes a las 5” y aparece aquí.", donde: "/agenda" },
  { icono: "✅", titulo: "Tareas y correo", texto: "Tus pendientes de Google Tasks y los correos importantes, sin abrir otras apps.", donde: "/tareas" },
  { icono: "➕", titulo: "Nuevo evento", texto: "Agrega una cita a tu calendario en un toque.", donde: "flotante" },
  { icono: "⚙️", titulo: "Menú", texto: "Lugares frecuentes con tráfico, sesión de calma, Ajustes y avisos.", donde: "/mas" },
  { icono: "🔍", titulo: "¿No encuentras algo?", texto: "Toca la lupa y escribe lo que buscas: “medicinas”, “placa”, “calma”… Te llevo directo a esa pantalla.", donde: "buscar" },
  { icono: "🔔", titulo: "Tus avisos", texto: "Aquí quedan los avisos que te manda la app, por si se te pasó alguno.", donde: "campana" },
  { icono: "🎙️", titulo: "Pregúntale a Tao", texto: "“¿Qué tengo hoy?”, “¿va a llover?”, “¿cómo llego a casa?”.", donde: "tao" },
];

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  // Nube F2: sin Google, se esconden Agenda, Correo y Tareas (y el botón de evento) en todas partes
  const sinGoogle = esNube();
  const pasos = sinGoogle ? RECORRIDO.filter((p) => !(p.donde && (esRutaGoogle(p.donde) || p.donde === "flotante"))) : RECORRIDO;
  return (
    <div className="app">
      <header className="encabezado">
        <a href="/" className="marca">
          <img src="/icono-192.png" alt="" width={32} height={32} />
          <span>Optimizador de Vida</span>
        </a>
        <div className="encabezado-derecha">
          <Buscador sinGoogle={sinGoogle} />
          <Campana ajustes="/mas" />
          <BotonTao ejemplos={EJEMPLOS_TAO} />
        </div>
      </header>
      <Actualizacion repo="taos-panel" />
      <main>{children}</main>
      <Suspense>
        <Recorrido pasos={pasos} />
      </Suspense>
      <Navegacion sinGoogle={sinGoogle} />
    </div>
  );
}
