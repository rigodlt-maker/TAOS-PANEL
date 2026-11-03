import { preferencias } from "@/lib/preferencias";
import { Tarjeta } from "../../componentes";
import { guardarAjustes } from "./acciones";
import { Lugares } from "./lugares";

export const dynamic = "force-dynamic";

export default async function Ajustes({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const p = await preferencias();
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
            Aparecen en Menú con botón para ver el tráfico y llegar. Escribe la dirección o pega el enlace que copias en Google Maps o en Mapas
            (Compartir › Copiar). Al terminar toca Guardar.
          </p>
          <Lugares iniciales={p.lugares} />
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
