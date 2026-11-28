"use server";
import { redirect } from "next/navigation";
import { mensajeDeEnlace, tipoDeEnlace, tokenValido } from "@/lib/enlace-correo";
import { esNube } from "@/lib/modo";
import { clienteSesion } from "@/lib/sesion-nube";

// Nube F5 · Se canjea el enlace del correo solo cuando la persona toca el botón (no al abrirlo)
export async function confirmarEnlace(formulario: FormData) {
  if (!esNube()) redirect("/login");
  const token = String(formulario.get("token_hash") ?? "");
  const tipo = tipoDeEnlace(String(formulario.get("type") ?? ""));
  if (!tokenValido(token) || !tipo) redirect(`/login?aviso=${encodeURIComponent(mensajeDeEnlace(null))}`);
  const db = await clienteSesion();
  const { error } = await db.auth.verifyOtp({ token_hash: token, type: tipo });
  if (error) {
    const { data } = await db.auth.getClaims();
    if (!data?.claims) redirect(`/login?aviso=${encodeURIComponent(mensajeDeEnlace(error))}`);
  }
  redirect("/");
}
