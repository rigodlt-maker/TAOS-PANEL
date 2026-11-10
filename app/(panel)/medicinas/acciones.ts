"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechaLocal } from "@/lib/fechas";
import { huellaDe } from "@/lib/guardar";
import { cambiarMedicinas, guardarMedicina, marcarToma, quitarMedicina, type Medicinas, type Unidad } from "@/lib/medicinas";

// op: id del formulario (si llega dos veces, no se aplica dos veces)
const opDe = (form: FormData) => {
  const id = String(form.get("op") ?? "");
  return /^[\w-]{8,64}$/.test(id) ? { id, huella: huellaDe([...form.entries()].filter(([k]) => k !== "op")) } : undefined;
};

async function cambiar(f: (d: Medicinas) => Medicinas, destino = "/medicinas", form?: FormData) {
  try {
    await cambiarMedicinas(f, form && opDe(form));
    revalidatePath("/", "layout");
  } catch (e) {
    destino = `/medicinas?error=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`;
  }
  redirect(destino);
}

export async function marcarTomaHoy(form: FormData) {
  const hecha = form.get("hecha");
  await cambiar((d) => marcarToma(d, String(form.get("fecha") || fechaLocal()), String(form.get("id")), String(form.get("hora")), hecha === null ? undefined : hecha === "1"), "/medicinas", form);
}

export async function guardarMedicinaForm(form: FormData) {
  const t = (c: string) => String(form.get(c) ?? "").trim();
  const foto = t("foto");
  await cambiar(
    (d) =>
      guardarMedicina(d, {
        id: t("id") || undefined,
        nombre: t("nombre"),
        cantidad: Number(t("cantidad").replace(",", ".")) || 1,
        unidad: t("unidad") as Unidad,
        cadaHoras: Number(t("cadaHoras")) || 24,
        primera: t("primera") || "08:00",
        nota: t("nota"),
        // Sin foto nueva, se conserva la que tenía; "quitar" la borra
        foto: foto === "quitar" ? null : foto || d.lista.find((m) => m.id === t("id"))?.foto || null,
      }),
    "/medicinas?ok=1",
    form,
  );
}

export async function quitarMedicinaForm(form: FormData) {
  await cambiar((d) => quitarMedicina(d, String(form.get("id"))), "/medicinas", form);
}
