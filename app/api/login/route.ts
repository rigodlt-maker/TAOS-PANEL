import { claveCorrecta, COOKIE_SESION, crearSesion, DURACION_SESION } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const clave = String(form.get("clave") ?? "").slice(0, 200);

  if (!(await claveCorrecta(clave))) {
    // Cada intento fallido tarda 2 segundos: probar contraseñas al azar se vuelve muy lento
    await new Promise((r) => setTimeout(r, 2000));
    return Response.redirect(new URL("/login?error=1", req.url), 303);
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/", req.url).toString(),
      "Set-Cookie": `${COOKIE_SESION}=${await crearSesion()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DURACION_SESION}`,
    },
  });
}
