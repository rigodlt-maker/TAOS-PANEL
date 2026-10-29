import { analizarDia } from "@/lib/agenda";
import { duracion, fechaCorta, horaLocal, sumarDias } from "@/lib/fechas";
import type { Evento } from "@/lib/google";
import { iaDisponible, resumenIA } from "@/lib/ia";
import { DIAS_AGENDA, type DatosPanel, type Seccion } from "@/lib/panel";

export function Tarjeta({
  titulo,
  children,
  extra,
  ancha,
}: {
  titulo: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  ancha?: boolean;
}) {
  return (
    <section className="tarjeta">
      <header>
        <h2>{titulo}</h2>
        {extra}
      </header>
      {children}
    </section>
  );
}

// Línea de tiempo de un día, con choques, poco margen y tiempo disponible
export function Agenda({ semana, dia, hoy }: { semana: Seccion<Evento[]>; dia: string; hoy: string }) {
  const dias = Array.from({ length: DIAS_AGENDA }, (_, i) => sumarDias(hoy, i));
  const nombreDia = (d: string, i: number) => (i === 0 ? "Hoy" : i === 1 ? "Mañana" : fechaCorta(d));

  let contenido: React.ReactNode;
  if (!semana.ok) {
    contenido = <p className="error">⚠️ {semana.error}</p>;
  } else {
    const agenda = analizarDia(dia, semana.datos);
    const filas = [
      ...agenda.eventos.map((e) => ({ tipo: "evento" as const, inicio: e.inicio, evento: e })),
      ...agenda.libres.map((b) => ({ tipo: "libre" as const, inicio: b.inicio, bloque: b })),
    ].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

    contenido =
      agenda.todoElDia.length + filas.length === 0 ? (
        <p className="tenue">Sin eventos. ¡Día libre!</p>
      ) : (
        <ol className="linea-tiempo">
          {agenda.todoElDia.map((e, i) => (
            <li key={`t${i}`} className="evento">
              <span className="hora">Todo el día</span>
              <div>
                <a href={e.enlace} target="_blank">{e.titulo}</a>
              </div>
            </li>
          ))}
          {filas.map((f, i) =>
            f.tipo === "libre" ? (
              <li key={i} className="libre">
                <span className="hora">{horaLocal(f.bloque.inicio)}</span>
                <div>
                  Tiempo disponible · <strong>{duracion(f.bloque.minutos)}</strong>
                  <span className="tenue"> hasta las {horaLocal(f.bloque.fin)}</span>
                </div>
              </li>
            ) : (
              <li key={i} className={f.evento.conflicto ? "evento choque" : "evento"}>
                <span className="hora">{horaLocal(f.evento.inicio)}</span>
                <div>
                  <a href={f.evento.enlace} target="_blank">{f.evento.titulo}</a>
                  <div className="detalle">
                    <span className="tenue">
                      {duracion(f.evento.minutos)}
                      {f.evento.lugar && ` · ${f.evento.lugar}`}
                    </span>
                    {f.evento.videollamada && (
                      <a className="chip" href={f.evento.videollamada} target="_blank">🎥 Unirse</a>
                    )}
                    {f.evento.conflicto && <span className="chip alerta">Se empalma</span>}
                    {!f.evento.conflicto && f.evento.pocoMargen && <span className="chip">Poco margen</span>}
                  </div>
                </div>
              </li>
            ),
          )}
        </ol>
      );
  }

  return (
    <Tarjeta titulo="Línea del día" extra={<a href="https://calendar.google.com" target="_blank">Abrir Calendar</a>}>
      <nav className="dias">
        {dias.map((d, i) => (
          <a key={d} href={i === 0 ? "/agenda" : `/agenda?dia=${d}`} className={d === dia ? "chip activo" : "chip"}>
            {nombreDia(d, i)}
          </a>
        ))}
      </nav>
      {contenido}
    </Tarjeta>
  );
}

// Resumen de la IA; se muestra en cuanto está listo, sin frenar el resto de la página
export async function SeccionIA({ datos }: { datos: DatosPanel }) {
  let ia;
  try {
    ia = await resumenIA("manana", datos);
  } catch (e) {
    return (
      <Tarjeta titulo="Tu día en una línea">
        <p className="error">⚠️ {e instanceof Error ? e.message : String(e)}</p>
      </Tarjeta>
    );
  }
  const correos = datos.correo.ok ? datos.correo.datos.correos : [];
  const responder = ia.correos
    .filter((c) => c.categoria === "responder_hoy")
    .map((c) => ({ ...c, correo: correos.find((x) => x.id === c.id) }))
    .filter((c) => c.correo)
    .slice(0, 3);

  return (
    <Tarjeta titulo="Tu día en una línea">
      <p className="una-linea">{ia.hoy_en_una_linea}</p>
      <div>
        <div>
          {ia.prioridades.length > 0 && <h3>Prioridades</h3>}
          <ol className="prioridades">
            {ia.prioridades.slice(0, 3).map((p, i) => (
              <li key={i}>
                <strong>{p.titulo}</strong>
                <div className="tenue">{p.motivo}</div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3>📌 Responder hoy</h3>
          {responder.length === 0 ? (
            <p className="tenue">Nada urgente por responder.</p>
          ) : (
            <ul>
              {responder.map((c) => (
                <li key={c.id}>
                  <a href={c.correo!.enlace} target="_blank">
                    <strong>{c.correo!.de}</strong>
                  </a>
                  : {c.resumen}
                </li>
              ))}
            </ul>
          )}
          {ia.alertas.length > 0 && (
            <>
              <h3>⚠️ En tus correos</h3>
              <ul>
                {ia.alertas.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      {ia.sugerencia && <p className="sugerencia">💡 {ia.sugerencia}</p>}
      {!iaDisponible() && <p className="tenue nota">Versión gratuita sin IA. Se vuelve más lista si agregas ANTHROPIC_API_KEY en Vercel.</p>}
    </Tarjeta>
  );
}
