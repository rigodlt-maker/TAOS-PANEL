import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { COOKIE_SESION, sesionValida } from "@/lib/auth";
import { esDemo } from "@/lib/demo";
import { esNube } from "@/lib/modo";
import { LLAVE_PUBLICA, URL_SUPABASE } from "@/lib/sesion-nube";

// Protege todo el panel con contraseña
export async function proxy(req: NextRequest) {
  if (esNube()) return proxyNube(req);
  if (await sesionValida(req.cookies.get(COOKIE_SESION)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Login, privacidad, logo, íconos, archivos de la app, el resumen y los avisos de medicinas (con su propia protección) quedan fuera
  matcher: ["/((?!login|privacidad|logo|icon|apple-icon|manifest.webmanifest|sw.js|api/login|api/resumen|api/medicinas/tick|api/medicinas/foto|api/medicinas/tomada|_next|favicon.ico).*)"],
};

// Nube F2 · Con tu cuenta TAOS (Supabase Auth): renueva la sesión en cada visita; sin sesión, a la entrada
async function proxyNube(req: NextRequest) {
  // Demostración (sin Supabase): no hay sesiones que revisar
  if (esDemo()) return NextResponse.next();
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
  return data?.claims ? respuesta : NextResponse.redirect(new URL("/login", req.url));
}
