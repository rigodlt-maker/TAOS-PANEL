import { cargarCorreo } from "@/lib/panel";
import { ListaCorreos } from "../../lista-correos";

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
        ) : (
          <ListaCorreos correos={correo.datos.correos} />
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
