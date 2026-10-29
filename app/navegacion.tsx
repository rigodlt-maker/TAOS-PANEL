"use client";

// Barra inferior y botón flotante, con el mismo estilo TAOS que Finanzas y Segundo Cerebro
import { CalendarDays, CalendarPlus, LayoutGrid, ListChecks, Mail, Sun, type LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { ruta: "/", nombre: "Hoy", icono: Sun },
  { ruta: "/agenda", nombre: "Agenda", icono: CalendarDays },
  { ruta: "/correo", nombre: "Correo", icono: Mail },
  { ruta: "/tareas", nombre: "Tareas", icono: ListChecks },
  { ruta: "/mas", nombre: "Menú", icono: LayoutGrid },
];

// Dentro del enlace: se ilumina en cuanto lo tocas, aunque la pantalla tarde en abrir
function Contenido({ icono: Icono, nombre, activa }: { icono: LucideIcon; nombre: string; activa: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span className={pending ? "abriendo contenido" : "contenido"}>
      <Icono size={24} strokeWidth={activa || pending ? 2.2 : 1.8} />
      {nombre}
    </span>
  );
}

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
                <Contenido icono={s.icono} nombre={s.nombre} activa={activa(s.ruta)} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
