import { Sugerencias } from "../../sugerencias";

// Ideas, fallas y mejoras: llegan directo al equipo de TAOS (Google Form de soluciones.taos@gmail.com)
export default function PaginaSugerencias() {
  return (
    <>
      <div className="titulo">
        <h1>Sugerencias</h1>
      </div>
      <p className="tenue" style={{ fontSize: 14, marginTop: 0 }}>
        ¿Una idea, algo que falla o algo que mejorarías? Lo leemos todo y lo más pedido entra en las próximas versiones.
      </p>
      <Sugerencias app="Optimizador de Vida" />
    </>
  );
}
