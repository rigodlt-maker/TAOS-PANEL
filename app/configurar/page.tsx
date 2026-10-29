import { SQL_INSTALAR } from "@/lib/sql";
import { Tarjeta } from "../componentes";
import { Copiar } from "./copiar";

// Crea en tu Supabase las tablas del panel (ajustes y notificaciones) con un solo pegado
export default function Configurar() {
  return (
    <main className="panel">
      <div className="pila">
        <div className="titulo">
          <h1>Tu base de datos</h1>
          <p>Un solo pegado en Supabase para guardar tus ajustes y tus notificaciones.</p>
        </div>
        <Tarjeta titulo="Pasos">
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, fontSize: 15 }}>
            <li>Toca «Copiar código».</li>
            <li>En supabase.com abre tu proyecto y entra a SQL Editor.</li>
            <li>Pega y toca Run. Si sale «destructive operations», toca Run query.</li>
            <li>Cuando diga «Success», regresa a Ajustes.</li>
          </ol>
        </Tarjeta>
        <Copiar texto={SQL_INSTALAR} />
        <a className="boton secundario" href="/ajustes">
          Ir a Ajustes
        </a>
      </div>
    </main>
  );
}
