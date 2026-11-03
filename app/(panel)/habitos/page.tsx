import { fechaLocal, sumarDias } from "@/lib/fechas";
import { ICONOS_HABITO, leerHabitos, racha, rachaCompleta, SUGERIDOS } from "@/lib/habitos";
import { Tarjeta } from "../../componentes";
import { agregarHabito, marcarHoy, quitarHabito } from "./acciones";

export const dynamic = "force-dynamic";

const LETRAS = ["D", "L", "M", "M", "J", "V", "S"];

// Mis hábitos: tocar = palomita de hoy. Las rachas 🔥 cuentan los días seguidos.
export default async function Habitos({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const h = await leerHabitos();
  const hoy = fechaLocal();
  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i - 6));
  const hechosHoy = h.hechos[hoy] ?? [];
  const completa = rachaCompleta(h, hoy);
  const sugerencias = SUGERIDOS.filter((s) => !h.lista.some((x) => x.id === s.id || x.nombre === s.nombre));

  return (
    <div className="pila">
      <div className="titulo">
        <h1>Mis hábitos</h1>
        <p>Toca un hábito para marcarlo como cumplido hoy. Pequeño y diario gana.</p>
      </div>
      {error && <p className="error">⚠️ {error}</p>}

      {h.lista.length > 0 && (
        <Tarjeta titulo={`Hoy · ${hechosHoy.length} de ${h.lista.length}`} extra={completa > 0 ? <span>🔥 {completa} {completa === 1 ? "día" : "días"} completos</span> : undefined}>
          <div className="habitos">
            {h.lista.map((x) => {
              const hecho = hechosHoy.includes(x.id);
              const r = racha(h, x.id, hoy);
              return (
                <form key={x.id} action={marcarHoy}>
                  <input type="hidden" name="id" value={x.id} />
                  <input type="hidden" name="fecha" value={hoy} />
                  <button type="submit" className={hecho ? "habito hecho" : "habito"} aria-pressed={hecho}>
                    <span className="habito-icono">{hecho ? "✅" : x.icono}</span>
                    <span className="habito-nombre">{x.nombre}</span>
                    <span className="habito-racha">{r > 0 ? `🔥 ${r}` : ""}</span>
                  </button>
                </form>
              );
            })}
          </div>
          {hechosHoy.length === h.lista.length && <p className="aviso" style={{ marginBottom: 0 }}>🎉 ¡Cumpliste todos tus hábitos de hoy!</p>}
        </Tarjeta>
      )}

      {h.lista.length > 0 && (
        <Tarjeta titulo="Tu semana">
          <div className="semana-habitos">
            <span />
            {semana.map((d) => (
              <span key={d} className={d === hoy ? "dia-letra hoy" : "dia-letra"}>
                {LETRAS[new Date(`${d}T12:00:00Z`).getUTCDay()]}
              </span>
            ))}
            {h.lista.map((x) => [
              <span key={x.id} title={x.nombre}>
                {x.icono}
              </span>,
              ...semana.map((d) => <span key={x.id + d} className={h.hechos[d]?.includes(x.id) ? "punto lleno" : "punto"} />),
            ])}
          </div>
        </Tarjeta>
      )}

      <Tarjeta titulo={h.lista.length ? "➕ Agregar un hábito" : "🌱 Elige tus primeros hábitos"}>
        <p className="tenue" style={{ fontSize: 14, marginTop: 0 }}>
          {h.lista.length ? "Mejor pocos y constantes: con 3 o 4 basta." : "Empieza con 2 o 3. Toca uno para agregarlo."}
        </p>
        {sugerencias.length > 0 && (
          <div className="chips">
            {sugerencias.map((s) => (
              <form key={s.id} action={agregarHabito}>
                <input type="hidden" name="nombre" value={s.nombre} />
                <input type="hidden" name="icono" value={s.icono} />
                <button type="submit" className="chip">
                  {s.icono} {s.nombre}
                </button>
              </form>
            ))}
          </div>
        )}
        <form action={agregarHabito} className="fila-nuevo-habito">
          <select name="icono" aria-label="Ícono" defaultValue="✅">
            {ICONOS_HABITO.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <input name="nombre" placeholder="Otro hábito (ej. Estirar 5 minutos)" maxLength={50} required />
          <button type="submit" className="boton chico">
            Agregar
          </button>
        </form>
      </Tarjeta>

      {h.lista.length > 0 && (
        <details className="tarjeta">
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>✏️ Quitar hábitos</summary>
          <ul style={{ marginTop: 12 }}>
            {h.lista.map((x) => (
              <li key={x.id} className="lugar">
                <span>
                  {x.icono} {x.nombre}
                </span>
                <form action={quitarHabito}>
                  <input type="hidden" name="id" value={x.id} />
                  <button type="submit" className="boton secundario chico" aria-label={`Quitar ${x.nombre}`}>
                    🗑 Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
