// Nube F3 · «Crear cuenta» en TAOS Nube (en tu versión propia esta pantalla no existe)
import { redirect } from "next/navigation";
import Script from "next/script";
import { esNube } from "@/lib/modo";
import { crearCuenta } from "./acciones";

// Se arma en cada visita: depende de TAOS_MODO, que no debe quedar fijo desde el build
export const dynamic = "force-dynamic";

const PRIVACIDAD = process.env.NEXT_PUBLIC_URL_PRIVACIDAD?.trim();
const TERMINOS = process.env.NEXT_PUBLIC_URL_TERMINOS?.trim();
const SITIO_TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

export default async function Registro({ searchParams }: { searchParams: Promise<{ error?: string; listo?: string }> }) {
  if (!esNube()) redirect("/login");
  const { error, listo } = await searchParams;
  return (
    <main className="login">
      {listo ? (
        <div className="tarjeta">
          <h1>Revisa tu correo</h1>
          <p>{listo}</p>
          <p className="tenue" style={{ fontSize: 14 }}>¿No llega? Revisa «Spam» o «Promociones». El enlace funciona una sola vez.</p>
          <a className="boton" href="/login">Ir a la entrada</a>
        </div>
      ) : (
        <form className="tarjeta" action={crearCuenta}>
          <img className="logo-login" src="/icono-192.png" alt="" width={88} height={88} />
          <h1>Crea tu cuenta TAOS</h1>
          <p className="tenue" style={{ fontSize: 14, margin: 0 }}>Una sola cuenta para las 4 apps TAOS.</p>
          <label htmlFor="correo">Tu correo</label>
          <input id="correo" name="correo" type="email" autoComplete="email" required />
          <label htmlFor="contrasena">Contraseña (mínimo 8 caracteres)</label>
          <input id="contrasena" name="contrasena" type="password" minLength={8} maxLength={72} autoComplete="new-password" required />
          <label htmlFor="confirmar">Escríbela otra vez</label>
          <input id="confirmar" name="confirmar" type="password" minLength={8} maxLength={72} autoComplete="new-password" required />
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
            <input type="checkbox" name="acepta" required style={{ width: 20, height: 20, minHeight: 0, marginTop: 2 }} />
            <span>
              Acepto el {PRIVACIDAD ? <a href={PRIVACIDAD} target="_blank">aviso de privacidad</a> : "aviso de privacidad"} y los{" "}
              {TERMINOS ? <a href={TERMINOS} target="_blank">términos</a> : "términos"}. TAOS organiza tu vida; no da consejos médicos ni financieros.
            </span>
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
            <input type="checkbox" name="sensibles" required style={{ width: 20, height: 20, minHeight: 0, marginTop: 2 }} />
            <span>Autorizo de forma expresa que TAOS guarde mis datos sensibles (salud, medicinas, finanzas y documentos) solo para darme el servicio. Puedo borrarlos cuando quiera.</span>
          </label>
          {SITIO_TURNSTILE && (
            <>
              <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
              <div className="cf-turnstile" data-sitekey={SITIO_TURNSTILE} data-language="es" data-theme="dark" />
            </>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit">Crear mi cuenta</button>
          <p className="tenue" style={{ fontSize: 14, textAlign: "center", margin: 0 }}>
            ¿Ya tienes cuenta? <a href="/login">Entra aquí</a>
          </p>
        </form>
      )}
    </main>
  );
}
