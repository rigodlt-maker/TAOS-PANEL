import { Suspense } from "react";
import { EJEMPLOS_TAO } from "@/lib/tao";
import { Navegacion } from "../navegacion";
import { Recorrido, type Paso } from "../recorrido";
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
  { icono: "🎙️", titulo: "Pregúntale a Tao", texto: "“¿Qué tengo hoy?”, “¿va a llover?”, “¿cómo llego a casa?”.", donde: "tao" },
];

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <header className="encabezado">
        <a href="/" className="marca">
          <img src="/icono-192.png" alt="" width={32} height={32} />
          Optimizador de Vida
        </a>
        <BotonTao ejemplos={EJEMPLOS_TAO} />
      </header>
      <main>{children}</main>
      <Suspense>
        <Recorrido pasos={RECORRIDO} />
      </Suspense>
      <Navegacion />
    </div>
  );
}
