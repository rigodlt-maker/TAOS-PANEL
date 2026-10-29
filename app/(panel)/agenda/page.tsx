import { alertasCruzadas } from "@/lib/agenda";
import { sumarDias } from "@/lib/fechas";
import { cargarAgenda, DIAS_AGENDA } from "@/lib/panel";
import { Agenda, Tarjeta } from "../../componentes";

export const dynamic = "force-dynamic";

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia: pedido } = await searchParams;
  const { hoy, semana, tareas } = await cargarAgenda();
  const dia = pedido && pedido >= hoy && pedido <= sumarDias(hoy, DIAS_AGENDA - 1) ? pedido : hoy;
  const alertas = semana.ok && tareas.ok ? alertasCruzadas(semana.datos, tareas.datos, hoy) : [];
  return (
    <div className="pila">
      <div className="titulo">
        <h1>Agenda</h1>
        <p>Tus próximos 7 días, con choques y tiempo libre</p>
      </div>
      <Agenda semana={semana} dia={dia} hoy={hoy} />
      {alertas.length > 0 && (
        <Tarjeta titulo="⚠️ Alertas">
          <ul>
            {alertas.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}
