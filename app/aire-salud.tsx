// Tarjeta "Aire y salud" de Hoy: clima, calidad del aire, índice UV y Hoy No Circula (como la app de la CDMX)
import type { Aire } from "@/lib/aire";
import type { Clima } from "@/lib/clima";
import { aplicaNoCircula, circulaMiAuto, noCirculaHoy, type MiAuto } from "@/lib/no-circula";

// Medidor de arco (3/4 de círculo) con el color del nivel
function Arco({ color, valor, children }: { color: string; valor: number; children: React.ReactNode }) {
  const r = 26;
  const largo = 2 * Math.PI * r * 0.75;
  return (
    <span className="arco">
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--borde)" strokeWidth="6" strokeDasharray={`${largo} 999`} strokeLinecap="round" transform="rotate(135 32 32)" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${largo * Math.min(1, Math.max(0.04, valor))} 999`} strokeLinecap="round" transform="rotate(135 32 32)" />
      </svg>
      <span className="arco-centro">{children}</span>
    </span>
  );
}

export function AireYSalud({ clima, aire, ciudad, auto, hoy }: { clima: Clima | null; aire: Aire | null; ciudad: string; auto: MiAuto | null; hoy: string }) {
  if (!clima && !aire) return null;
  const valle = aplicaNoCircula(ciudad) || auto !== null;
  const general = noCirculaHoy(hoy);
  const circula = auto ? circulaMiAuto(auto, hoy) : null;
  const consejos = [
    aire && aire.aqi > 100 ? `💨 Aire ${aire.calidad.texto.toLowerCase()}: ${aire.calidad.consejo}` : null,
    aire && aire.uv >= 6 ? `☀️ UV ${aire.rayos.texto.toLowerCase()}: ${aire.rayos.consejo}` : null,
    circula === false ? "🚫 Hoy tu auto no circula." : null,
  ].filter(Boolean);
  return (
    <section className="tarjeta aire" data-recorrido="aire">
      <p className="aire-titulo">AIRE Y SALUD</p>
      <div className="aire-fila">
        {clima && (
          <div className="aire-dato">
            <span className="aire-icono">{clima.icono}</span>
            <strong>{clima.temperatura}°</strong>
          </div>
        )}
        {aire && (
          <div className="aire-dato">
            <Arco color={aire.calidad.color} valor={aire.aqi / 200}>
              💨
            </Arco>
            <strong>{aire.calidad.texto}</strong>
          </div>
        )}
        {aire && (
          <div className="aire-dato">
            <Arco color={aire.rayos.color} valor={aire.uv / 11}>
              <b>{Math.round(aire.uv)}</b>
              <small>UV</small>
            </Arco>
            <strong>{aire.rayos.texto}</strong>
          </div>
        )}
        {valle && (
          <a className="aire-dato" href="/ajustes" aria-label="Hoy No Circula">
            <Arco color={circula === false ? "#e5484d" : circula ? "#3ecf6e" : "var(--acento)"} valor={1}>
              🚗
            </Arco>
            <strong className="aire-corto">{auto ? (circula ? "Sí circulas" : "No circulas") : general.corto}</strong>
          </a>
        )}
      </div>
      {consejos.length > 0 && <p className="aire-consejo">{consejos.join(" · ")}</p>}
      {valle && !auto && <p className="aire-consejo tenue">{general.texto} <a href="/ajustes">Agrega tu placa →</a></p>}
    </section>
  );
}
