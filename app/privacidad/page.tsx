export const metadata = { title: "Privacidad · Panel de Vida" };

export const dynamic = "force-dynamic";

export default function Privacidad() {
  return (
    <main className="panel">
      <section className="tarjeta">
        <h1>Política de privacidad</h1>
        <p>
          Panel de Vida es una aplicación personal de uso privado. Solo su dueño puede entrar, y únicamente con
          contraseña.
        </p>
        <p>
          La aplicación lee el calendario, el correo y las tareas de Google de su dueño para mostrarlos en una sola página
          y enviarle un resumen diario a su propio correo. Esos datos no se guardan ni se comparten con nadie; en la base de
          datos privada del dueño solo quedan sus ajustes (nombre, ciudad y lugares) y los dispositivos donde activó avisos.
        </p>
        {process.env.ALLOWED_EMAIL && <p>Contacto: {process.env.ALLOWED_EMAIL}</p>}
      </section>
    </main>
  );
}
