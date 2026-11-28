// Nube · «¿Olvidaste tu contraseña?» del Optimizador
import { redirect } from "next/navigation";
import { esNube } from "@/lib/modo";
import { recuperarContrasena } from "./acciones";

export const dynamic = "force-dynamic";

export default async function Olvide({ searchParams }: { searchParams: Promise<{ error?: string; listo?: string }> }) {
  if (!esNube()) redirect("/login");
  const { error, listo } = await searchParams;
  return (
    <main className="login">
      <form className="tarjeta" action={recuperarContrasena}>
        <img className="logo-login" src="/icono-192.png" alt="" width={88} height={88} />
        <h1>¿Olvidaste tu contraseña?</h1>
        {listo ? (
          <>
            <p className="aviso">Si ese correo tiene cuenta TAOS, te llegó un correo con el botón «Crear mi contraseña nueva». Ábrelo y crea la nueva: servirá para las 4 apps.</p>
            <p className="tenue" style={{ fontSize: 14, margin: 0 }}>¿No llega? Revisa «Spam» o «Promociones».</p>
          </>
        ) : (
          <>
            <p className="tenue" style={{ margin: 0 }}>Escribe tu correo y te mandamos un botón para crear una contraseña nueva. Servirá para las 4 apps.</p>
            <label htmlFor="correo">Tu correo</label>
            <input id="correo" name="correo" type="email" autoComplete="email" required />
            {error && <p className="error">{error.slice(0, 200)}</p>}
            <button type="submit">Mandarme el correo</button>
          </>
        )}
        <a href="/login" style={{ textAlign: "center", fontSize: 14 }}>
          Volver a la entrada
        </a>
      </form>
    </main>
  );
}
