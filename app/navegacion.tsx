"use client";

// Barra inferior y botón flotante, con el mismo estilo TAOS que Finanzas y Segundo Cerebro
import { CalendarDays, CalendarPlus, LayoutGrid, ListChecks, Mail, Sun, type LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  // Al desplazar, el botón se reduce a solo el ícono para no tapar nada; en Medicinas no sale (tiene sus propios botones)
  const [arriba, setArriba] = useState(true);
  useEffect(() => {
    const revisar = () => setArriba(window.scrollY < 24);
    revisar();
    window.addEventListener("scroll", revisar, { passive: true });
    return () => window.removeEventListener("scroll", revisar);
  }, []);
  return (
    <>
      {!actual.startsWith("/medicinas") && (
        <div className="fab-zona">
          <div>
            <a className={arriba ? "fab" : "fab fab-solo"} href="https://calendar.google.com/calendar/r/eventedit" target="_blank" data-recorrido="flotante" aria-label="Agregar un evento">
              <CalendarPlus size={24} strokeWidth={2.4} />
              {arriba && "Evento"}
            </a>
          </div>
        </div>
      )}
      <nav className="barra" aria-label="Secciones">
        <ul>
          {SECCIONES.map((s) => (
            <li key={s.ruta}>
              <Link href={s.ruta} aria-current={activa(s.ruta) ? "page" : undefined} data-recorrido={s.ruta}>
                <Contenido icono={s.icono} nombre={s.nombre} activa={activa(s.ruta)} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
