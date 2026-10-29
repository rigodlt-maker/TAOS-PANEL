import { preferencias } from "@/lib/preferencias";
import { lugaresConEnlaces } from "@/lib/lugares";
import { cargarClima, cargarNoticias } from "@/lib/panel";
import { AvisosPush } from "../../avisos-push";
import { Tarjeta } from "../../componentes";

export const dynamic = "force-dynamic";

export default async function Mas() {
  const [clima, noticias, lugares, { ciudad: CIUDAD }] = await Promise.all([cargarClima(), cargarNoticias(), lugaresConEnlaces(), preferencias()]);
  const urlTransito = `https://www.google.com/maps/@${CIUDAD.lat},${CIUDAD.lon},11z/data=!5m1!1e1`;
  return (
    <div className="pila">
      <div className="titulo">
        <h1>Más</h1>
      </div>

      <a className="boton secundario" href="/ajustes">
        ⚙️ Ajustes: nombre, ciudad y lugares
      </a>

      <Tarjeta titulo="🔔 Notificaciones en el celular">
        <p className="tenue" style={{ fontSize: 14, marginTop: 0 }}>
          En la mañana, tus eventos y tareas del día; en la noche, lo que tienes mañana. Actívalas en cada celular donde las quieras.
        </p>
        <AvisosPush />
      </Tarjeta>

      <Tarjeta titulo="📍 Mis lugares" extra={<a href={urlTransito} target="_blank">Tráfico</a>}>
        <ul>
          {lugares.map((l) => (
            <li key={l.nombre} className="lugar">
              <span className="recorte" style={{ fontSize: 15 }}>
                {l.icono} {l.nombre}
              </span>
              <span className="acciones">
                <a href={l.mapa} target="_blank">Mapa</a>
                <a className="boton chico" href={l.ruta} target="_blank">Ir</a>
              </span>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta titulo={`🌤️ Clima en ${CIUDAD.nombre}`}>
        {clima.ok ? (
          <ul>
            {clima.datos.dias.map((d, i) => (
              <li key={d.fecha}>
                <strong>{i === 0 ? "Hoy" : "Mañana"}</strong> {d.icono} {d.min}° – {d.max}°
                <span className="tenue"> · lluvia {d.lluvia}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="error">⚠️ {clima.error}</p>
        )}
      </Tarjeta>

      <Tarjeta titulo="📰 Noticias">
        {!noticias.ok ? (
          <p className="error">⚠️ {noticias.error}</p>
        ) : (
          <ul>
            {noticias.datos.slice(0, 5).map((n, i) => (
              <li key={i}>
                <a href={n.enlace} target="_blank" style={{ color: "var(--texto)" }}>{n.titulo}</a>
                <div className="tenue" style={{ fontSize: 13 }}>{n.fuente}</div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="✉️ Resumen por correo">
        <p className="tenue" style={{ marginTop: 0 }}>Te llega solo a las 8:00 a.m. y 8:00 p.m. Si lo quieres ahora:</p>
        <div className="botones">
          <a className="boton" href="/api/resumen?momento=manana">Enviar el de la mañana</a>
          <a className="boton secundario" href="/api/resumen?momento=noche">Enviar el de la noche</a>
        </div>
      </Tarjeta>
    </div>
  );
}
