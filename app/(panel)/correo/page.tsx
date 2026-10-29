import { cargarCorreo } from "@/lib/panel";

export const dynamic = "force-dynamic";

export default async function Correo() {
  const correo = await cargarCorreo();
  return (
    <div className="pila">
      <div className="titulo">
        <h1>Correo</h1>
        <p>{correo.ok ? `${correo.datos.total} sin leer en Principal` : "Principal sin leer"}</p>
      </div>
      <section className="tarjeta">
        {!correo.ok ? (
          <p className="error">⚠️ {correo.error}</p>
        ) : correo.datos.correos.length === 0 ? (
          <p className="tenue">Principal al día 🎉</p>
        ) : (
          <ul>
            {correo.datos.correos.map((c) => (
              <li key={c.id}>
                <a href={c.enlace} target="_blank" style={{ color: "var(--texto)", display: "block" }}>
                  <strong>{c.de}</strong>
                  <div className="recorte" style={{ fontSize: 15 }}>{c.asunto}</div>
                  <div className="tenue recorte">{c.fragmento}</div>
                </a>
              </li>
            ))}
          </ul>
        )}
        {correo.ok && correo.datos.categorias.length > 0 && (
          <p className="categorias">
            {correo.datos.categorias.map((c) => (
              <a key={c.nombre} className="chip" href={c.enlace} target="_blank">
                {c.nombre} <strong>{c.sinLeer}</strong>
              </a>
            ))}
          </p>
        )}
      </section>
      <a className="boton secundario" href="https://mail.google.com" target="_blank">
        Abrir Gmail
      </a>
    </div>
  );
}
