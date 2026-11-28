// Nube · Crear tu contraseña nueva (después de «¿Olvidaste tu contraseña?» o desde Menú). Sirve para las 4 apps.
import { redirect } from "next/navigation";
import { CampoContrasena } from "../campo-contrasena";
import { guardarContrasena } from "../olvide/acciones";
import { esNube } from "@/lib/modo";

export const dynamic = "force-dynamic";

export default async function NuevaContrasena({ searchParams }: { searchParams: Promise<{ error?: string; listo?: string }> }) {
  if (!esNube()) redirect("/");
  const { error, listo } = await searchParams;
  return (
    <main className="login">
      <form className="tarjeta" action={guardarContrasena}>
        <img className="logo-login" src="/icono-192.png" alt="" width={88} height={88} />
        <h1>🔑 Crea tu contraseña nueva</h1>
        {listo ? (
          <p className="aviso">Contraseña guardada ✓ Úsala con tu correo para entrar a las 4 apps TAOS.</p>
        ) : (
          <>
            <p className="tenue" style={{ margin: 0 }}>Es una sola para tus 4 apps TAOS. Mínimo 8 caracteres; toca el ojito para ver lo que escribes.</p>
            <label htmlFor="contrasena">Contraseña nueva</label>
            <CampoContrasena id="contrasena" name="contrasena" minLength={8} maxLength={72} autoComplete="new-password" required />
            <label htmlFor="confirmar">Escríbela otra vez</label>
            <CampoContrasena id="confirmar" name="confirmar" minLength={8} maxLength={72} autoComplete="new-password" required />
            {error && <p className="error">{error.slice(0, 200)}</p>}
            <button type="submit">Guardar contraseña</button>
          </>
        )}
        <a href="/" style={{ textAlign: "center", fontSize: 14 }}>
          Ir a la app
        </a>
      </form>
    </main>
  );
}
