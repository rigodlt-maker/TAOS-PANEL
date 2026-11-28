import { esNube } from "@/lib/modo";
import { revisarLicencia } from "@/lib/licencia";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; espera?: string; confirmado?: string; aviso?: string }> }) {
  const { error, espera, confirmado, aviso } = await searchParams;
  // Con contraseña configurada (no es modo demostración), primero se revisa el código de compra
  // En TAOS Nube no hay código de compra (la licencia es la suscripción) y se entra con tu cuenta TAOS
  const nube = esNube();
  const licencia = !nube && process.env.PANEL_PASSWORD ? await revisarLicencia() : ({ ok: true } as const);
  if (!licencia.ok)
    return (
      <main className="login">
        <div className="tarjeta">
          <img className="logo-login" src="/icono-192.png" alt="" width={88} height={88} />
          <h1>Optimizador de Vida</h1>
          <p style={{ fontWeight: 700 }}>Revisa tus datos en Vercel</p>
          <p className="error">{licencia.problema}</p>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, fontSize: 15 }}>
            <li>En vercel.com abre este proyecto › Settings › Environment Variables.</li>
            <li>Agrega o corrige CODIGO_COMPRA (sin espacios) y toca Save.</li>
            <li>Ve a Deployments, toca los 3 puntitos del primero › Redeploy.</li>
            <li>Espera 1 minuto y vuelve a abrir esta página.</li>
          </ol>
        </div>
      </main>
    );
  return (
    <main className="login">
      <form className="tarjeta" method="post" action="/api/login">
        <img className="logo-login" src="/icono-192.png" alt="" width={88} height={88} />
        <h1>Optimizador de Vida</h1>
        {nube && (
          <>
            <label htmlFor="correo">Correo de tu cuenta TAOS</label>
            <input id="correo" name="correo" type="email" autoComplete="email" autoFocus required />
          </>
        )}
        <label htmlFor="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autoComplete="current-password" autoFocus={!nube} required />
        {error && <p className="error">{nube ? "Correo o contraseña incorrectos, intenta de nuevo." : "Contraseña incorrecta, intenta de nuevo."}</p>}
        {espera && <p className="error">Demasiados intentos. Por seguridad, espera {Number(espera) || 15} minutos y vuelve a intentar.</p>}
        <button type="submit">Entrar</button>
        {aviso && nube && <p className="error">{aviso.slice(0, 200)}</p>}
        {confirmado && nube && <p className="aviso">✅ Tu cuenta quedó confirmada. Entra con tu correo y contraseña.</p>}
        {nube && (
          <p className="tenue" style={{ fontSize: 14, textAlign: "center", margin: 0 }}>
            ¿Primera vez? <a href="/crear-cuenta">Crea tu cuenta</a>
          </p>
        )}
      </form>
    </main>
  );
}
