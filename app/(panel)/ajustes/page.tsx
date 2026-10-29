import { preferencias } from "@/lib/preferencias";
import { Tarjeta } from "../../componentes";
import { guardarAjustes } from "./acciones";

export const dynamic = "force-dynamic";

const ICONOS = ["🏡", "💼", "🏋️", "👨‍👩‍👧", "🏫", "🏥", "🛒", "☕", "✈️", "📍"];

export default async function Ajustes({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const p = await preferencias();
  // Siempre hay 3 renglones vacíos para agregar lugares nuevos
  const filas = [...p.lugares, ...Array.from({ length: 3 }, () => ({ nombre: "", icono: "", direccion: "" }))];
  return (
    <div className="pila">
      <div className="titulo">
        <h1>Ajustes</h1>
        <p>Tu nombre, tu ciudad para el clima y tus lugares frecuentes.</p>
      </div>
      {ok && <p className="aviso">✅ Guardado.</p>}
      {error && (
        <p className="error">
          ⚠️ {error} {/Supabase/.test(error) && <a href="/configurar">Configurar base de datos →</a>}
        </p>
      )}
      <form action={guardarAjustes} className="pila">
        <Tarjeta titulo="👋 Tú">
          <div className="campos">
            <label>
              Cómo quieres que te salude
              <input name="nombre" defaultValue={p.nombre} placeholder="Tu nombre" autoComplete="given-name" />
            </label>
            <label>
              Tu ciudad (para el clima)
              <input name="ciudad" defaultValue={p.configurado ? p.ciudad.nombre : ""} placeholder="Ej. Puebla" />
            </label>
          </div>
        </Tarjeta>
        <Tarjeta titulo="📍 Lugares frecuentes">
          <p className="tenue" style={{ fontSize: 14, marginTop: 0 }}>
            Aparecen en Más con botón para ver el tráfico y llegar. Deja vacío un renglón para borrarlo.
          </p>
          <div className="campos">
            {filas.map((l, i) => (
              <div key={i} className="fila-lugar">
                <input name="lugar_icono" defaultValue={l.icono || ICONOS.at(i % ICONOS.length)} aria-label={`Ícono del lugar ${i + 1}`} />
                <input name="lugar_nombre" defaultValue={l.nombre} placeholder="Nombre (Casa, Trabajo…)" aria-label={`Nombre del lugar ${i + 1}`} />
                <input name="lugar_direccion" defaultValue={l.direccion} placeholder="Dirección o nombre del lugar" aria-label={`Dirección del lugar ${i + 1}`} />
              </div>
            ))}
          </div>
        </Tarjeta>
        <button type="submit" className="boton">
          Guardar
        </button>
      </form>
      <a className="tenue" href="/configurar" style={{ textAlign: "center", fontSize: 14 }}>
        Configurar base de datos (primera vez)
      </a>
    </div>
  );
}
