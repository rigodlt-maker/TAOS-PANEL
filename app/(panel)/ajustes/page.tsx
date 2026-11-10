import { estadoDespertador } from "@/lib/despertador";
import { esDemo } from "@/lib/demo";
import { borradorDeUrl } from "@/lib/parche";
import { baseDePreferencias, preferencias, type Preferencias } from "@/lib/preferencias";
import { Tarjeta } from "../../componentes";
import { guardarAjustes } from "./acciones";
import { Lugares } from "./lugares";

export const dynamic = "force-dynamic";

export default async function Ajustes({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; borrador?: string }> }) {
  const { ok, error, borrador } = await searchParams;
  const guardadas = await preferencias();
  // Conflicto: se muestra lo que escribiste; la base escondida es lo guardado AHORA
  const escrito = borradorDeUrl(borrador) as { nombre?: string; ciudad?: string; lugares?: Preferencias["lugares"]; auto?: Preferencias["auto"] } | null;
  const p: Preferencias = escrito
    ? { ...guardadas, nombre: escrito.nombre ?? guardadas.nombre, ciudad: { ...guardadas.ciudad, nombre: escrito.ciudad ?? guardadas.ciudad.nombre }, lugares: escrito.lugares ?? guardadas.lugares, auto: escrito.auto ?? null, configurado: true }
    : guardadas;
  const despertador = esDemo() ? null : await estadoDespertador();
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
      {despertador?.faltaSql && (
        <p className="aviso">
          🔒 Tu app se actualizó: falta 1 minuto. Copia el SQL de seguridad y pégalo en Supabase para que los avisos de medicinas y el límite de
          contraseña funcionen. <a href="/configurar">Configurar base de datos →</a>
        </p>
      )}
      {despertador?.ultima && (
        <p className="tenue" style={{ fontSize: 13 }}>
          💊 Avisos de medicinas: última revisión {new Date(despertador.ultima.cuando).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "short", timeStyle: "short" })}
          {despertador.ultima.detalle ? ` · ${despertador.ultima.detalle}` : ""}. «Aceptado» quiere decir que el servicio de notificaciones lo recibió.
        </p>
      )}
      {escrito && (
        <div className="aviso">
          <p style={{ margin: 0 }}>Abajo está lo que escribiste:</p>
          <pre style={{ whiteSpace: "pre-wrap", userSelect: "all", margin: "8px 0 0", font: "inherit" }}>
            {[
              escrito.nombre !== undefined && `Nombre: ${escrito.nombre}`,
              escrito.ciudad !== undefined && `Ciudad: ${escrito.ciudad}`,
              ...(escrito.lugares ?? []).map((l) => `${l.icono} ${l.nombre}: ${l.direccion}`),
            ]
              .filter(Boolean)
              .join("\n")}
          </pre>
        </div>
      )}
      <form action={guardarAjustes} className="pila">
        <input type="hidden" name="base" value={JSON.stringify(baseDePreferencias(guardadas))} />
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
        <Tarjeta titulo="🚗 Mi auto (Hoy No Circula)">
          <p className="tenue" style={{ fontSize: 14, marginTop: 0 }}>
            Solo en Ciudad de México y Estado de México. Con esto, en Hoy te digo si tu auto circula. Déjalo vacío si no tienes auto.
          </p>
          <div className="campos">
            <label>
              Último número de la placa
              <select name="auto_terminacion" defaultValue={p.auto ? String(p.auto.terminacion) : ""}>
                <option value="">Sin auto</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Holograma de verificación
              <select name="auto_holograma" defaultValue={p.auto?.holograma ?? "1"}>
                <option value="00">00 (auto nuevo o eléctrico)</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
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
