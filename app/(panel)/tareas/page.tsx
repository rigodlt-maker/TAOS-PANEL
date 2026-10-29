import { fechaLarga, fechaLocal } from "@/lib/fechas";
import { cargarTareas } from "@/lib/panel";

export const dynamic = "force-dynamic";

export default async function Tareas() {
  const tareas = await cargarTareas();
  const hoy = fechaLocal();
  return (
    <div className="pila">
      <div className="titulo">
        <h1>Tareas</h1>
        <p>{tareas.ok ? `${tareas.datos.length} pendientes` : "Google Tasks"}</p>
      </div>
      <section className="tarjeta">
        {!tareas.ok ? (
          <p className="error">⚠️ {tareas.error}</p>
        ) : tareas.datos.length === 0 ? (
          <p className="tenue">No tienes tareas pendientes. 🎉</p>
        ) : (
          <ul>
            {tareas.datos.map((t, i) => (
              <li key={i}>
                <div>{t.titulo}</div>
                {t.vence && <div className={t.vence < hoy ? "vencida" : "tenue"} style={{ fontSize: 13 }}>{fechaLarga(t.vence)}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <a className="boton secundario" href="https://tasks.google.com" target="_blank">
        Abrir Google Tasks
      </a>
    </div>
  );
}
