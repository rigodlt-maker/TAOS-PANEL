import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/auth";

// Protege todo el panel con contraseña
export async function proxy(req: NextRequest) {
  if (await sesionValida(req.cookies.get(COOKIE_SESION)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Login, privacidad, logo, íconos, archivos de la app, el resumen y los avisos de medicinas (con su propia protección) quedan fuera
  matcher: ["/((?!login|privacidad|logo|icon|apple-icon|manifest.webmanifest|sw.js|api/login|api/resumen|api/medicinas/tick|api/medicinas/foto|api/medicinas/tomada|_next|favicon.ico).*)"],
};
