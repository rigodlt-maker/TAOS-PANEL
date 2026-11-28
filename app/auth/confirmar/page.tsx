// Nube F5 · Pantalla del enlace del correo: un botón para entrar (el enlace se canjea al tocarlo, no al abrirlo)
import { redirect } from "next/navigation";
import { mensajeDeEnlace, tipoDeEnlace, tokenValido } from "@/lib/enlace-correo";
import { esNube } from "@/lib/modo";
import { confirmarEnlace } from "./acciones";

export const dynamic = "force-dynamic";

export default async function Confirmar({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  if (!esNube()) redirect("/login");
  const { token_hash, type } = await searchParams;
  const tipo = tipoDeEnlace(type);
  if (!tokenValido(token_hash) || !tipo) redirect(`/login?aviso=${encodeURIComponent(mensajeDeEnlace(null))}`);
  const titulo = tipo === "signup" ? "Confirma tu cuenta TAOS" : tipo === "email_change" ? "Confirma tu correo nuevo" : "Entra a tu cuenta TAOS";
  return (
    <main className="login">
      <form className="tarjeta" action={confirmarEnlace}>
        <img className="logo-login" src="/icono-192.png" alt="" width={88} height={88} />
        <h1>{titulo}</h1>
        <p className="tenue" style={{ margin: 0 }}>Toca el botón para continuar.</p>
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={tipo} />
        <button type="submit">{tipo === "signup" ? "Confirmar y entrar" : "Entrar"}</button>
      </form>
    </main>
  );
}
