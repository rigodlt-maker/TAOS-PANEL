"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechaLocal } from "@/lib/fechas";
import { huellaDe } from "@/lib/guardar";
import { agregar, cambiarHabitos, marcar, quitar, type Habitos } from "@/lib/habitos";

// op: id del formulario (si llega dos veces, no se aplica dos veces)
const opDe = (form: FormData) => {
  const id = String(form.get("op") ?? "");
  return /^[\w-]{8,64}$/.test(id) ? { id, huella: huellaDe([...form.entries()].filter(([k]) => k !== "op")) } : undefined;
};

async function cambiar(f: (h: Habitos) => Habitos, form?: FormData) {
  let destino = "/habitos";
  try {
    await cambiarHabitos(f, form && opDe(form));
    revalidatePath("/", "layout");
  } catch (e) {
    destino = `/habitos?error=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`;
  }
  redirect(destino);
}

export async function marcarHoy(form: FormData) {
  const hecho = form.get("hecho");
  await cambiar((h) => marcar(h, String(form.get("id")), String(form.get("fecha") || fechaLocal()), hecho === null ? undefined : hecho === "1"), form);
}

export async function agregarHabito(form: FormData) {
  await cambiar((h) => agregar(h, String(form.get("nombre") ?? ""), String(form.get("icono") ?? "")), form);
}

export async function quitarHabito(form: FormData) {
  await cambiar((h) => quitar(h, String(form.get("id"))), form);
}
