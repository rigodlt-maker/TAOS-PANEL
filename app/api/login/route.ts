import { claveCorrecta, COOKIE_SESION, crearSesion, DURACION_SESION } from "@/lib/auth";
import { anotarFallo, ipDe, limpiarIntentos, minutosDeEspera } from "@/lib/intentos";
import { revisarLicencia } from "@/lib/licencia";

export async function POST(req: Request) {
  const form = await req.formData();
  const clave = String(form.get("clave") ?? "").slice(0, 200);
  const ip = ipDe(req);
  const espera = minutosDeEspera(ip);
  if (espera) return Response.redirect(new URL(`/login?espera=${espera}`, req.url), 303);

  if (!(await claveCorrecta(clave))) {
    // Cada intento fallido tarda 2 segundos: probar contraseñas al azar se vuelve muy lento
    anotarFallo(ip);
    await new Promise((r) => setTimeout(r, 2000));
    return Response.redirect(new URL("/login?error=1", req.url), 303);
  }
  // Sin un código de compra válido no se entra (la pantalla de entrada explica qué corregir)
  if (!(await revisarLicencia()).ok) return Response.redirect(new URL("/login", req.url), 303);

  limpiarIntentos(ip);
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/", req.url).toString(),
      "Set-Cookie": `${COOKIE_SESION}=${await crearSesion()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DURACION_SESION}`,
    },
  });
}
