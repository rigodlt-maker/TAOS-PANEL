import { cookies } from "next/headers";
import { guardarRefresh, urlRegreso } from "@/lib/google-cuenta";

export const dynamic = "force-dynamic";

// Google regresa aquí con un código: se cambia por el permiso permanente y se guarda en tu Supabase
export async function GET(req: Request) {
  const url = new URL(req.url);
  const volver = (mensaje: string) => Response.redirect(`${url.origin}/mas?google=${encodeURIComponent(mensaje)}`, 303);
  const almacen = await cookies();
  const estado = almacen.get("google_estado")?.value;
  almacen.delete("google_estado");
  if (url.searchParams.get("error")) return volver(`Google no dio el permiso (${url.searchParams.get("error")}). Intenta de nuevo y acepta todas las casillas.`);
  if (!estado || url.searchParams.get("state") !== estado) return volver("La conexión expiró. Toca «Conectar con Google» otra vez.");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: url.searchParams.get("code") ?? "",
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: urlRegreso(url.origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const datos = (await res.json().catch(() => ({}))) as { refresh_token?: string; error?: string; error_description?: string };
  if (!res.ok || !datos.refresh_token) return volver(`Google rechazó la conexión: ${datos.error_description ?? datos.error ?? "sin permiso permanente"}. Revisa el anexo de Google.`);
  try {
    await guardarRefresh(datos.refresh_token);
  } catch (e) {
    return volver(e instanceof Error ? e.message : String(e));
  }
  return Response.redirect(`${url.origin}/mas?google=ok`, 303);
}
