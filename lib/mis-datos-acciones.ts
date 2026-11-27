"use server";
// Nube F2 · «Borrar mi cuenta» (solo TAOS Nube). El id sale de TU sesión, nunca del formulario.
import { redirect } from "next/navigation";
import { borrarCuenta } from "./mis-datos";
import { esNube } from "./modo";
import { cliente } from "./push";
import { clienteSesion, usuarioDeSesion } from "./sesion-nube";

export async function borrarMiCuenta(f: FormData) {
  if (!esNube()) redirect("/");
  if (String(f.get("confirmacion") ?? "").trim() !== "BORRAR") redirect("/mas");
  const id = await usuarioDeSesion();
  if (!id) redirect("/login");
  await borrarCuenta(cliente(), id);
  await (await clienteSesion()).auth.signOut().catch(() => {});
  redirect("/login?cuenta=borrada");
}
