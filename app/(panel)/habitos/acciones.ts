"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechaLocal } from "@/lib/fechas";
import { agregar, guardarHabitos, leerHabitos, marcar, quitar, type Habitos } from "@/lib/habitos";

async function cambiar(f: (h: Habitos) => Habitos) {
  let destino = "/habitos";
  try {
    await guardarHabitos(f(await leerHabitos()));
    revalidatePath("/", "layout");
  } catch (e) {
    destino = `/habitos?error=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`;
  }
  redirect(destino);
}

export async function marcarHoy(form: FormData) {
  await cambiar((h) => marcar(h, String(form.get("id")), String(form.get("fecha") || fechaLocal())));
}

export async function agregarHabito(form: FormData) {
  await cambiar((h) => agregar(h, String(form.get("nombre") ?? ""), String(form.get("icono") ?? "")));
}

export async function quitarHabito(form: FormData) {
  await cambiar((h) => quitar(h, String(form.get("id"))));
}
