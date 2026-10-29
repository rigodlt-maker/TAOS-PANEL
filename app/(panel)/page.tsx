import { Suspense } from "react";
import { alertasCruzadas, eventosDelDia } from "@/lib/agenda";
import { fechaLarga, horaActual, horaLocal } from "@/lib/fechas";
import { cargarPanel } from "@/lib/panel";
import { SeccionIA, Tarjeta } from "../componentes";

export const dynamic = "force-dynamic";

function saludo(): string {
  const h = horaActual();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

// Hoy: solo lo importante del día. Lo demás vive en Agenda, Correo, Tareas y Más.
export default async function Hoy({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const { enviado } = await searchParams;
  const datos = await cargarPanel();
  const { hoy, semana, tareas, clima } = datos;
  const alertas = semana.ok && tareas.ok ? alertasCruzadas(semana.datos, tareas.datos, hoy) : [];
  const ahora = Date.now();
  const siguientes = semana.ok
    ? eventosDelDia(semana.datos, hoy)
        .filter((e) => !e.todoElDia && new Date(e.fin).getTime() > ahora)
        .slice(0, 3)
    : [];

  return (
    <div className="pila">
      <div className="titulo">
        <h1>
          {saludo()}
          {datos.prefs.nombre ? `, ${datos.prefs.nombre}` : ""}
        </h1>
        <p>
          {fechaLarga(hoy)}
          {clima.ok && ` · ${clima.datos.icono} ${clima.datos.temperatura}° ${clima.datos.descripcion.toLowerCase()}`}
        </p>
      </div>

      {!datos.prefs.configurado && (
        <a className="aviso" href="/ajustes">
          ⚙️ Configura tu panel: tu nombre, tu ciudad para el clima y tus lugares frecuentes →
        </a>
      )}
      {enviado && <p className="aviso">✅ Resumen enviado. Revisa tu correo.</p>}

      <Suspense
        fallback={
          <Tarjeta titulo="Tu día en una línea">
            <p className="tenue">Pensando en tu día…</p>
          </Tarjeta>
        }
      >
        <SeccionIA datos={datos} />
      </Suspense>

      {alertas.length > 0 && (
        <Tarjeta titulo="⚠️ Ojo hoy">
          <ul>
            {alertas.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta titulo="Lo que sigue hoy" extra={<a href="/agenda">Ver agenda</a>}>
        {!semana.ok ? (
          <p className="error">⚠️ {semana.error}</p>
        ) : siguientes.length === 0 ? (
          <p className="tenue">Ya no tienes más eventos hoy.</p>
        ) : (
          <ul>
            {siguientes.map((e, i) => (
              <li key={i}>
                <a className="fila" href={e.enlace} target="_blank">
                  <span>
                    <strong>{e.titulo}</strong>
                    {e.lugar && <span className="tenue recorte" style={{ display: "block" }}>{e.lugar}</span>}
                  </span>
                  <span className="tenue">{horaLocal(e.inicio)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
