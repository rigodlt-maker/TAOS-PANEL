import { Suspense } from "react";
import { EJEMPLOS_TAO } from "@/lib/tao";
import { Navegacion } from "../navegacion";
import { Recorrido, type Paso } from "../recorrido";
import { BotonTao } from "../tao";

// Recorrido de bienvenida (sale una sola vez)
const RECORRIDO: Paso[] = [
  { icono: "☀️", titulo: "Bienvenido a Optimizador de Vida", texto: "En Hoy ves tu día en una línea: reuniones, pendientes, correos importantes y el clima." },
  { icono: "📅", titulo: "Agenda, Correo y Tareas", texto: "Todo sale de tu cuenta de Google. Lo que agregas en Google Calendar o Tasks aparece aquí solo." },
  { icono: "🗣️", titulo: "Agenda con tu voz", texto: "Di “Ok Google, agenda dentista el viernes a las 5” o “Oye Siri…” (con Google como calendario) y aparece en tu panel sin escribir nada." },
  { icono: "🌙", titulo: "De noche, calma", texto: "Después de las 9 pm verás lo de mañana y, si no puedes dormir, una sesión de calma con sonidos y respiración." },
  { icono: "🎙️", titulo: "Pregúntale a Tao", texto: "Toca el botón dorado y escribe o habla: “¿qué tengo hoy?”, “¿va a llover?”, “¿cómo llego a casa?”." },
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
