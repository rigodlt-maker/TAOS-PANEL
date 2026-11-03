import { Suspense } from "react";
import { alertasCruzadas, eventosDelDia } from "@/lib/agenda";
import { fechaLarga, horaActual, horaLocal, sumarDias } from "@/lib/fechas";
import { leerHabitos, rachaCompleta } from "@/lib/habitos";
import { cargarAire, cargarPanel } from "@/lib/panel";
import { AireYSalud } from "../aire-salud";
import { Cielo } from "../cielo";
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
  const [datos, habitos, aire] = await Promise.all([cargarPanel(), leerHabitos(), cargarAire()]);
  const { hoy, semana, tareas, clima } = datos;
  const alertas = semana.ok && tareas.ok ? alertasCruzadas(semana.datos, tareas.datos, hoy) : [];
  const ahora = Date.now();
  const siguientes = semana.ok
    ? eventosDelDia(semana.datos, hoy)
        .filter((e) => !e.todoElDia && new Date(e.fin).getTime() > ahora)
        .slice(0, 3)
    : [];
  // De noche (9 pm a 5 am): lo de mañana y, si no puedes dormir, la sesión de calma
  const hora = horaActual();
  const esNoche = hora >= 21 || hora < 5;
  const manana = esNoche && semana.ok ? eventosDelDia(semana.datos, hora < 5 ? hoy : sumarDias(hoy, 1)) : [];

  return (
    <div className="pila">
      {clima.ok && <Cielo escena={clima.datos.escena} />}
      <div className="titulo">
        <h1>
          {saludo()}
          {datos.prefs.nombre ? `, ${datos.prefs.nombre}` : ""}
        </h1>
        <p>
          {fechaLarga(hoy)}
          {clima.ok && ` · ${clima.datos.descripcion}`}
        </p>
      </div>

      <AireYSalud clima={clima.ok ? clima.datos : null} aire={aire.ok ? aire.datos : null} ciudad={datos.prefs.ciudad.nombre} auto={datos.prefs.auto} hoy={hoy} />

      <a className="tarjeta habitos-hoy" href="/habitos" data-recorrido="habitos">
        {habitos.lista.length ? (
          <>
            <span>
              🌱 <strong>Tus hábitos de hoy:</strong> {(habitos.hechos[hoy] ?? []).length} de {habitos.lista.length}
              {rachaCompleta(habitos, hoy) > 1 && <span className="tenue"> · 🔥 {rachaCompleta(habitos, hoy)} días</span>}
            </span>
            <span className="tenue">Marcar →</span>
          </>
        ) : (
          <>
            <span>
              🌱 <strong>Crea tus hábitos</strong>: dormir bien, tomar agua, menos celular…
            </span>
            <span className="tenue">Empezar →</span>
          </>
        )}
      </a>
      {!datos.prefs.configurado && (
        <a className="aviso" href="/ajustes">
          ⚙️ Configura tu panel: tu nombre, tu ciudad para el clima y tus lugares frecuentes →
        </a>
      )}
      {enviado && <p className="aviso">✅ Resumen enviado. Revisa tu correo.</p>}

      {esNoche && (
        <Tarjeta titulo="🌙 Ya es de noche">
          <p style={{ marginTop: 0 }}>
            {manana.length === 0 ? "Mañana tienes la agenda libre. 😌" : `Mañana tienes ${manana.length === 1 ? "1 evento" : `${manana.length} eventos`} (el primero a las ${horaLocal(manana.find((e) => !e.todoElDia)?.inicio ?? manana[0].inicio)}).`}{" "}
            Deja el celular a un lado cuando puedas.
          </p>
          <a className="boton secundario" href="/calma">
            ¿No puedes dormir? Sesión de calma
          </a>
        </Tarjeta>
      )}

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
