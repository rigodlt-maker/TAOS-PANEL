import { NextResponse, type NextRequest } from "next/server";
import { destinoConfirmar, mensajeDeEnlace, tipoDeEnlace, tokenValido } from "@/lib/enlace-correo";
import { esNube } from "@/lib/modo";
import { clienteSesion } from "@/lib/sesion-nube";

const aLaEntrada = (url: URL, mensaje: string) => NextResponse.redirect(new URL(`/login?aviso=${encodeURIComponent(mensaje)}`, url));

// Nube F5 · Aquí llegan los enlaces de los correos de la cuenta TAOS (ver lib/enlace-correo.ts).
// token_hash → /auth/confirmar (un toque antes de canjearlo); code (enlaces viejos) → se canjea; con sesión → a Hoy.
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  if (!esNube()) return NextResponse.redirect(new URL("/login", url)); // en tu versión propia se entra con contraseña
  const tokenHash = url.searchParams.get("token_hash");
  if (tokenHash !== null) {
    const tipo = tipoDeEnlace(url.searchParams.get("type"));
    if (!tokenValido(tokenHash) || !tipo) return aLaEntrada(url, mensajeDeEnlace(null));
    return NextResponse.redirect(new URL(destinoConfirmar(tokenHash, tipo), url));
  }
  const db = await clienteSesion();
  const codigo = url.searchParams.get("code");
  const canje = codigo ? await db.auth.exchangeCodeForSession(codigo) : null;
  const { data } = await db.auth.getClaims();
  if (!data?.claims) return aLaEntrada(url, mensajeDeEnlace(canje?.error ?? { code: url.searchParams.get("error_code") ?? "" }));
  return NextResponse.redirect(new URL("/", url));
}
