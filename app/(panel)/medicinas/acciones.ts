"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechaLocal } from "@/lib/fechas";
import { huellaDe } from "@/lib/guardar";
import { agregarMedicina, cambiarMedicinas, editarMedicina, marcarToma, quitarMedicina, type Medicinas, type Unidad } from "@/lib/medicinas";
import { borradorAUrl, ConflictoDeCampos, leerBase } from "@/lib/parche";

// op: id del formulario (si llega dos veces, no se aplica dos veces)
const opDe = (form: FormData) => {
  const id = String(form.get("op") ?? "");
  return /^[\w-]{8,64}$/.test(id) ? { id, huella: huellaDe([...form.entries()].filter(([k]) => k !== "op")) } : undefined;
};

async function cambiar(f: (d: Medicinas) => Medicinas, destino = "/medicinas", form?: FormData, alChocar?: (e: ConflictoDeCampos) => string) {
  try {
    await cambiarMedicinas(f, form && opDe(form));
    revalidatePath("/", "layout");
  } catch (e) {
    const texto = encodeURIComponent(e instanceof Error ? e.message : String(e));
    destino = e instanceof ConflictoDeCampos && alChocar ? `${alChocar(e)}&error=${texto}#editar` : `/medicinas?error=${texto}`;
  }
  redirect(destino);
}

export async function marcarTomaHoy(form: FormData) {
  const hecha = form.get("hecha");
  await cambiar((d) => marcarToma(d, String(form.get("fecha") || fechaLocal()), String(form.get("id")), String(form.get("hora")), hecha === null ? undefined : hecha === "1"), "/medicinas", form);
}

export async function guardarMedicinaForm(form: FormData) {
  const t = (c: string) => String(form.get(c) ?? "").trim();
  const id = t("id");
  const campos = {
    nombre: t("nombre"),
    cantidad: Number(t("cantidad").replace(",", ".")) || 1,
    unidad: t("unidad") as Unidad,
    cadaHoras: Number(t("cadaHoras")) || 24,
    primera: t("primera") || "08:00",
    nota: t("nota"),
  };
  // Sin foto nueva, se conserva la que tiene; "quitar" la borra
  const foto = t("foto") === "quitar" ? null : t("foto") || undefined;
  const borrador = borradorAUrl({ ...campos, cantidad: t("cantidad") });
  await cambiar(
    (d) => (id ? editarMedicina(d, id, leerBase(form.get("base")), campos, foto) : agregarMedicina(d, { ...campos, foto: foto ?? null })),
    "/medicinas?ok=1",
    form,
    // Conflicto: vuelve a la pantalla con lo que escribiste (si la medicina ya no existe, como medicina nueva)
    (e) => (e.campos.includes("id") ? `/medicinas?borrador=${borrador}` : `/medicinas?editar=${encodeURIComponent(id)}&borrador=${borrador}`),
  );
}

export async function quitarMedicinaForm(form: FormData) {
  await cambiar((d) => quitarMedicina(d, String(form.get("id"))), "/medicinas", form);
}
