import { claveCorrecta, COOKIE_SESION, crearSesion, DURACION_SESION } from "@/lib/auth";
import { ipDe, liberarIntento, reservarIntento } from "@/lib/intentos";
import { revisarLicencia } from "@/lib/licencia";

export async function POST(req: Request) {
  const form = await req.formData();
  const clave = String(form.get("clave") ?? "").slice(0, 200);
  // S17: el intento se aparta ANTES de revisar la contraseña (así 20 intentos al mismo tiempo no pasan los 20)
  const intento = await reservarIntento(ipDe(req));
  if (!intento.permitido) {
    const minutos = Math.ceil(intento.esperaSeg / 60);
    return new Response(null, { status: 303, headers: { Location: new URL(`/login?espera=${minutos}`, req.url).toString(), "Retry-After": String(intento.esperaSeg) } });
  }

  if (!(await claveCorrecta(clave))) {
    // Cada intento fallido tarda 2 segundos más
    await new Promise((r) => setTimeout(r, 2000));
    return Response.redirect(new URL("/login?error=1", req.url), 303);
  }
  await liberarIntento(intento.clave);
  // Sin un código de compra válido no se entra (la pantalla de entrada explica qué corregir)
  if (!(await revisarLicencia()).ok) return Response.redirect(new URL("/login", req.url), 303);

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/", req.url).toString(),
      "Set-Cookie": `${COOKIE_SESION}=${await crearSesion()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DURACION_SESION}`,
    },
  });
}
