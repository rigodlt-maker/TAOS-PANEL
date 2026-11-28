// Nube F2 · Tarjeta «Tus datos» del Optimizador: descargarlos y, solo en TAOS Nube, borrar tu cuenta
import { Tarjeta } from "./componentes";
import { borrarMiCuenta } from "@/lib/mis-datos-acciones";
import { esNube } from "@/lib/modo";

export function MisDatos() {
  const nube = esNube();
  return (
    <Tarjeta titulo="🗂️ Tus datos" id="mis-datos">
      <p className="tenue" style={{ fontSize: 14, marginTop: 0 }}>
        Son tuyos: descárgalos cuando quieras en un archivo (.json). Las llaves de tu conexión con Google no se incluyen.
      </p>
      <a className="boton" href="/api/mis-datos" download>
        Descargar mis datos
      </a>
      {nube && (
        <a className="boton" href="/nueva-contrasena" style={{ marginTop: 12, background: "transparent", border: "1px solid var(--borde)", color: "var(--texto)" }}>
          🔑 Cambiar mi contraseña
        </a>
      )}
      {nube && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer", color: "#f87171" }}>Borrar mi cuenta</summary>
          <form action={borrarMiCuenta} style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <p className="tenue" style={{ fontSize: 14, margin: 0 }}>
              Se borran para siempre tu cuenta y todo lo que guardaste en las apps TAOS (medicinas, hábitos, movimientos, entrenos y documentos). No se puede deshacer. Antes, descarga
              tus datos.
            </p>
            <label htmlFor="confirmacion-borrar">Escribe BORRAR para confirmar</label>
            <input id="confirmacion-borrar" name="confirmacion" required pattern="BORRAR" title="Escribe BORRAR, en mayúsculas" autoComplete="off" />
            <button type="submit" style={{ background: "#b91c1c", color: "#fff" }}>
              Borrar mi cuenta para siempre
            </button>
          </form>
        </details>
      )}
    </Tarjeta>
  );
}
