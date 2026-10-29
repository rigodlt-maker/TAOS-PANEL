import { COOKIE_SESION, huellaDeClave } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const clave = String(form.get("clave") ?? "");
  const correcta = process.env.PANEL_PASSWORD;

  if (!correcta || clave !== correcta) {
    return Response.redirect(new URL("/login?error=1", req.url), 303);
  }

  const noventaDias = 60 * 60 * 24 * 90;
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/", req.url).toString(),
      "Set-Cookie": `${COOKIE_SESION}=${await huellaDeClave(clave)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${noventaDias}`,
    },
  });
}
