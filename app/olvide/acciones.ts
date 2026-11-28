"use server";
// Nube · «¿Olvidaste tu contraseña?» en el Optimizador: correo con un botón para crear una nueva (/nueva-contrasena).
// Siempre se responde lo mismo, exista o no la cuenta.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { esNube } from "@/lib/modo";
import { clienteSesion } from "@/lib/sesion-nube";

export async function recuperarContrasena(f: FormData) {
  if (!esNube()) redirect("/login");
  const correo = String(f.get("correo") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) redirect(`/olvide?error=${encodeURIComponent("Escribe tu correo completo, por ejemplo tunombre@gmail.com.")}`);
  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const { error } = await (await clienteSesion()).auth.resetPasswordForEmail(correo, { redirectTo: `${origen}/auth/callback` });
  if (error && /rate limit|security purposes/i.test(error.message)) redirect(`/olvide?error=${encodeURIComponent("Ya se mandaron varios correos seguidos. Espera unos minutos y usa el último que te llegó.")}`);
  redirect("/olvide?listo=1");
}

// Guardar la contraseña nueva de la sesión abierta (sirve para las 4 apps)
export async function guardarContrasena(f: FormData) {
  if (!esNube()) redirect("/login");
  const contrasena = String(f.get("contrasena") ?? "");
  const confirmar = String(f.get("confirmar") ?? "");
  const volver = (q: string) => redirect(`/nueva-contrasena?${q}`);
  if (contrasena.length < 8) volver(`error=${encodeURIComponent("Usa al menos 8 caracteres.")}`);
  if (contrasena.length > 72) volver(`error=${encodeURIComponent("Tu contraseña es demasiado larga (máximo 72 caracteres).")}`);
  if (contrasena !== confirmar) volver(`error=${encodeURIComponent("Las dos contraseñas no coinciden.")}`);
  const { error } = await (await clienteSesion()).auth.updateUser({ password: contrasena });
  if (error) volver(`error=${encodeURIComponent(/same/i.test(error.message) ? "Es la misma contraseña que ya tenías." : /weak|pwned/i.test(error.message) ? "Esa contraseña es muy fácil de adivinar. Usa otra más larga." : "No se pudo guardar. Intenta otra vez.")}`);
  volver("listo=1");
}
