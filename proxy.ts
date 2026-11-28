import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { COOKIE_SESION, sesionValida } from "@/lib/auth";
import { esDemo } from "@/lib/demo";
import { esNube } from "@/lib/modo";
import { esRutaGoogle } from "@/lib/secciones-google";
import { LLAVE_PUBLICA, URL_SUPABASE } from "@/lib/sesion-nube";

// Protege todo el panel con contraseña
export async function proxy(req: NextRequest) {
  if (esNube()) return proxyNube(req);
  if (await sesionValida(req.cookies.get(COOKIE_SESION)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Login, privacidad, logo, íconos, archivos de la app, el resumen y los avisos de medicinas (con su propia protección) quedan fuera
  matcher: ["/((?!login|crear-cuenta|olvide|auth/|privacidad|logo|icon|apple-icon|manifest.webmanifest|sw.js|api/login|api/resumen|api/medicinas/tick|api/medicinas/foto|api/medicinas/tomada|_next|favicon.ico).*)"],
};

// Nube F2 · Con tu cuenta TAOS (Supabase Auth): renueva la sesión en cada visita; sin sesión, a la entrada
async function proxyNube(req: NextRequest) {
  // Demostración (sin Supabase): no hay sesiones que revisar
  if (esDemo()) return esRutaGoogle(req.nextUrl.pathname) ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  let respuesta = NextResponse.next({ request: req });
  const db = createServerClient(URL_SUPABASE(), LLAVE_PUBLICA(), {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        respuesta = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await db.auth.getClaims();
  if (!data?.claims) return NextResponse.redirect(new URL("/login", req.url));
  // Sin Google en Nube: Agenda, Correo y Tareas (y sus rutas de datos) no existen; se va a Hoy
  if (esRutaGoogle(req.nextUrl.pathname) || req.nextUrl.pathname.startsWith("/api/correo")) return NextResponse.redirect(new URL("/", req.url));
  return respuesta;
}
