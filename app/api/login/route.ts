import { claveCorrecta, COOKIE_SESION, crearSesion, DURACION_SESION } from "@/lib/auth";
import { ipDe, liberarIntento, reservarIntento } from "@/lib/intentos";
import { revisarLicencia } from "@/lib/licencia";

export async function POST(req: Request) {
  const form = await req.formData();
  const clave = String(form.get("clave") ?? "").slice(0, 200);
  // S17: el intento se aparta ANTES de revisar la contraseña (así 20 intentos al mismo tiempo no pasan los 20)
  const intento = await reservarIntento(ipDe(req));
  if (!intento.permitido) return pantallaEspera(intento.esperaSeg, !!intento.noDisponible);

  if (!(await claveCorrecta(clave))) {
    // Cada intento fallido tarda 2 segundos más
    await new Promise((r) => setTimeout(r, 2000));
    return Response.redirect(new URL("/login?error=1", req.url), 303);
  }
  await liberarIntento(intento);
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

// S17 · 429 (o 503 si la base de datos no responde) con una página en español, botón para volver y Retry-After
function pantallaEspera(segundos: number, noDisponible: boolean) {
  const minutos = Math.max(1, Math.ceil(segundos / 60));
  const titulo = noDisponible ? "No se pudo revisar tu contraseña" : "Demasiados intentos";
  const texto = noDisponible
    ? "Tu base de datos no respondió y, por seguridad, no se revisó la contraseña. Espera un minuto y vuelve a intentarlo."
    : `Por seguridad, espera ${minutos} ${minutos === 1 ? "minuto" : "minutos"} antes de volver a intentar.`;
  const html = `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#f2f2f2;font:17px/1.5 system-ui,sans-serif;padding:16px}
main{background:#151515;border:1px solid #2a2a2a;border-radius:20px;padding:28px;max-width:420px;display:grid;gap:14px}h1{margin:0;font-size:22px}p{margin:0;color:#bbb}
a{display:block;text-align:center;min-height:48px;line-height:48px;border-radius:12px;background:#d4af37;color:#111;font-weight:700;text-decoration:none}</style></head>
<body><main><h1>${titulo}</h1><p>${texto}</p><a href="/login">Volver a la entrada</a></main></body></html>`;
  return new Response(html, {
    status: noDisponible ? 503 : 429,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "Retry-After": String(segundos) },
  });
}
