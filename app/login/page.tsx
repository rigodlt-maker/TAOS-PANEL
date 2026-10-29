export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <form className="tarjeta" method="post" action="/api/login">
        <img className="logo-login" src="/icono-192.png" alt="" width={88} height={88} />
        <h1>Panel de Vida</h1>
        <label htmlFor="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autoFocus required />
        {error && <p className="error">Contraseña incorrecta, intenta de nuevo.</p>}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
