import { cookies } from "next/headers";
import { ALCANCES, googleConfigurado, urlRegreso } from "@/lib/google-cuenta";

export const dynamic = "force-dynamic";

// Manda a Google a pedir permiso (agenda, correo y tareas). Protegido por la contraseña del panel (proxy.ts).
export async function GET(req: Request) {
  const origen = new URL(req.url).origin;
  if (!googleConfigurado()) return Response.redirect(`${origen}/mas?google=${encodeURIComponent("Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel.")}`, 303);
  const estado = crypto.randomUUID();
  (await cookies()).set("google_estado", estado, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: urlRegreso(origen),
    response_type: "code",
    scope: ALCANCES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: estado,
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`, 303);
}
