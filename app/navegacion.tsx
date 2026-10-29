"use client";

// Barra inferior y botón flotante, con el mismo estilo TAOS que Finanzas y Segundo Cerebro
import { CalendarDays, CalendarPlus, Ellipsis, ListChecks, Mail, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { ruta: "/", nombre: "Hoy", icono: Sun },
  { ruta: "/agenda", nombre: "Agenda", icono: CalendarDays },
  { ruta: "/correo", nombre: "Correo", icono: Mail },
  { ruta: "/tareas", nombre: "Tareas", icono: ListChecks },
  { ruta: "/mas", nombre: "Más", icono: Ellipsis },
];

export function Navegacion() {
  const actual = usePathname();
  const activa = (ruta: string) => (ruta === "/" ? actual === "/" : actual.startsWith(ruta));
  return (
    <>
      <div className="fab-zona">
        <div>
          <a className="fab" href="https://calendar.google.com/calendar/r/eventedit" target="_blank">
            <CalendarPlus size={24} strokeWidth={2.4} />
            Evento
          </a>
        </div>
      </div>
      <nav className="barra" aria-label="Secciones">
        <ul>
          {SECCIONES.map((s) => (
            <li key={s.ruta}>
              <Link href={s.ruta} aria-current={activa(s.ruta) ? "page" : undefined}>
                <s.icono size={24} strokeWidth={activa(s.ruta) ? 2.2 : 1.8} />
                {s.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
