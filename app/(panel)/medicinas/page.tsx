import { randomUUID } from "node:crypto";
import { fechaLocal } from "@/lib/fechas";
import { borradorDeUrl } from "@/lib/parche";
import { baseDeMedicina, CADA_HORAS, enlaceGoogle, horarios, leerMedicinas, textoDosis, tomasDelDia, UNIDADES, type Medicina, hora12 } from "@/lib/medicinas";
import { Tarjeta } from "../../componentes";
import { FotoMedicina } from "../../foto-medicina";
import { guardarMedicinaForm, marcarTomaHoy, quitarMedicinaForm } from "./acciones";

export const dynamic = "force-dynamic";

// Mis medicinas: qué tomas, cuánto y cada cuántas horas. Palomea cada toma; la app te avisa (con foto) y tu calendario también.
export default async function Medicinas({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string; editar?: string; borrador?: string }> }) {
  const { error, ok, editar, borrador } = await searchParams;
  const escrito = borradorDeUrl(borrador);
  const d = await leerMedicinas();
  const hoy = fechaLocal();
  const dia = tomasDelDia(d, hoy);
  const hechas = dia.filter((t) => t.hecha).length;
  const enEdicion = d.lista.find((m) => m.id === editar);

  return (
    <div className="pila">
      <div className="titulo">
        <h1>Mis medicinas</h1>
        <p>Medicinas y suplementos: cuánto tomas y cada cuántas horas. Te aviso para que no se te olvide.</p>
      </div>
      {error && <p className="error">⚠️ {error}</p>}
      {ok && <p className="aviso">✅ Guardado. Si cambiaste horarios, vuelve a agregar las alarmas a tu calendario.</p>}

      {dia.length > 0 && (
        <Tarjeta titulo={`Hoy · ${hechas} de ${dia.length} tomas`}>
          <div className="habitos">
            {dia.map(({ m, hora, hecha }) => (
              <form key={`${m.id}@${hora}`} action={marcarTomaHoy}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="hora" value={hora} />
                <input type="hidden" name="fecha" value={hoy} />
                {/* S14-B: lo que quieres (marcar o desmarcar), no "invertir"; y un id para no aplicarlo dos veces */}
                <input type="hidden" name="hecha" value={hecha ? "0" : "1"} />
                <input type="hidden" name="op" value={randomUUID()} />
                <button type="submit" className={hecha ? "habito hecho" : "habito"} aria-pressed={hecha}>
                  <span className="habito-icono">{hecha ? "✅" : m.foto ? <img src={m.foto} alt="" className="mini-foto" /> : "💊"}</span>
                  <span className="habito-nombre">
                    {m.nombre}
                    <span className="tenue" style={{ display: "block", fontSize: 13, fontWeight: 400 }}>
                      {textoDosis(m)}
                      {m.nota ? ` · ${m.nota}` : ""}
                    </span>
                  </span>
                  <span className="habito-racha">{hora12(hora)}</span>
                </button>
              </form>
            ))}
          </div>
          {hechas === dia.length && <p className="aviso" style={{ marginBottom: 0 }}>🎉 ¡Todas las tomas de hoy listas!</p>}
        </Tarjeta>
      )}

      {d.lista.length > 0 && (
        <Tarjeta titulo="🔔 Que nunca se te olvide">
          <a className="boton" href="/api/medicinas/calendario">
            📅 Agregar todas a mi calendario
          </a>
          <p className="tenue" style={{ fontSize: 14, marginTop: 12 }}>
            1) Activa las notificaciones en Menú: te llega el aviso con la foto y el botón “Ya me la tomé”, normalmente en los 15 minutos siguientes a la hora de la toma (si
            hay muchas apps TAOS instaladas puede tardar un poco más). 2) Además, agrega las alarmas a tu calendario: suenan a la hora exacta y aunque no
            tengas internet.
          </p>
          <details style={{ marginTop: 12 }}>
            <summary className="tenue" style={{ fontSize: 14 }}>
              ¿Usas Google Calendar en Android? Agrégalas una por una
            </summary>
            <ul className="lista-simple">
              {d.lista.flatMap((m) =>
                horarios(m).map((h) => (
                  <li key={`${m.id}${h}`}>
                    <a href={enlaceGoogle(m, h, hoy)} target="_blank" rel="noopener noreferrer">
                      ➕ {m.nombre} a las {hora12(h)}
                    </a>
                  </li>
                )),
              )}
            </ul>
          </details>
        </Tarjeta>
      )}

      {d.lista.length > 0 && (
        <Tarjeta titulo="Mi lista">
          <ul className="lista-simple">
            {d.lista.map((m) => (
              <li key={m.id} className="fila-medicina">
                {m.foto ? <img src={m.foto} alt="" className="mini-foto" /> : <span className="mini-foto">💊</span>}
                <span>
                  <strong>{m.nombre}</strong>
                  <span className="tenue" style={{ display: "block", fontSize: 13 }}>
                    {textoDosis(m)} cada {m.cadaHoras} h · {horarios(m).map(hora12).join(", ")}
                  </span>
                </span>
                <a href={`/medicinas?editar=${m.id}#editar`}>Editar</a>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <div id="editar">
        <Tarjeta titulo={enEdicion ? `✏️ Editar ${enEdicion.nombre}` : d.lista.length ? "➕ Agregar medicina o suplemento" : "💊 Agrega tu primera medicina"}>
          {escrito && <LoQueEscribiste escrito={escrito} />}
          <Formulario m={enEdicion} escrito={escrito} />
          {enEdicion && (
            <form action={quitarMedicinaForm} style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={enEdicion.id} />
              <input type="hidden" name="op" value={randomUUID()} />
              <button type="submit" className="boton secundario chico">
                Quitar de mi lista
              </button>
            </form>
          )}
        </Tarjeta>
      </div>
      <p className="tenue" style={{ fontSize: 13, textAlign: "center" }}>
        Esto es un recordatorio, no una indicación médica: sigue siempre lo que te dijo tu médico.
      </p>
    </div>
  );
}

// Conflicto: lo que escribiste, a la vista y seleccionable para copiarlo (el formulario de abajo ya lo trae puesto)
function LoQueEscribiste({ escrito }: { escrito: Record<string, unknown> }) {
  const e = escrito as Partial<Record<"nombre" | "cantidad" | "unidad" | "cadaHoras" | "primera" | "nota", string | number>>;
  const renglones = [
    e.nombre && `Nombre: ${e.nombre}`,
    e.cantidad && `Cuánto: ${e.cantidad} ${e.unidad ?? ""}`.trim(),
    e.cadaHoras && `Cada ${e.cadaHoras} h · primera toma ${e.primera ?? ""}`.trim(),
    e.nota && `Nota: ${e.nota}`,
  ].filter(Boolean);
  return (
    <div className="aviso" style={{ marginTop: 0 }}>
      <p style={{ margin: 0 }}>Abajo está lo que escribiste:</p>
      <pre style={{ whiteSpace: "pre-wrap", userSelect: "all", margin: "8px 0 0", font: "inherit" }}>{renglones.join("\n")}</pre>
    </div>
  );
}

function Formulario({ m: guardada, escrito }: { m?: Medicina; escrito?: Record<string, unknown> | null }) {
  // Lo que escribiste (si hubo conflicto) se muestra encima de lo guardado; la base siempre es lo guardado AHORA
  const m = guardada && { ...guardada, ...(escrito as Partial<Medicina> | null) };
  const v = m ?? (escrito as Partial<Medicina> | null) ?? undefined;
  return (
    <form action={guardarMedicinaForm} className="campos">
      {guardada && <input type="hidden" name="id" value={guardada.id} />}
      {guardada && <input type="hidden" name="base" value={JSON.stringify(baseDeMedicina(guardada))} />}
      <input type="hidden" name="op" value={randomUUID()} />
      <FotoMedicina actual={guardada?.foto ?? null} />
      <label>
        Nombre
        <input name="nombre" required defaultValue={v?.nombre} placeholder="Ej. Omeprazol 20 mg, Vitamina C, Colágeno" maxLength={60} />
      </label>
      <div className="dos-columnas">
        <label>
          Cuánto
          <input name="cantidad" inputMode="decimal" defaultValue={v?.cantidad ?? 1} />
        </label>
        <label>
          De qué
          <select name="unidad" defaultValue={v?.unidad ?? "pastilla"}>
            {UNIDADES.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="dos-columnas">
        <label>
          Cada cuántas horas
          <select name="cadaHoras" defaultValue={v?.cadaHoras ?? 24}>
            {CADA_HORAS.map((h) => (
              <option key={h} value={h}>
                {h === 24 ? "1 vez al día" : `cada ${h} h`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Primera toma
          <input type="time" name="primera" defaultValue={v?.primera ?? "08:00"} required />
        </label>
      </div>
      <label>
        Nota (opcional)
        <input name="nota" defaultValue={v?.nota} placeholder="Con alimentos, en ayunas, por 7 días…" maxLength={80} />
      </label>
      <button type="submit" className="boton">
        {guardada ? "Guardar cambios" : "Agregar"}
      </button>
    </form>
  );
}
