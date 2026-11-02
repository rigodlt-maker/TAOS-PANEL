import { revisarLicencia } from "@/lib/licencia";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  // Con contraseña configurada (no es modo demostración), primero se revisa el código de compra
  const licencia = process.env.PANEL_PASSWORD ? await revisarLicencia() : ({ ok: true } as const);
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
        <label htmlFor="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autoFocus required />
        {error && <p className="error">Contraseña incorrecta, intenta de nuevo.</p>}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
