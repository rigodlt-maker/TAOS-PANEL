"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { limpiarAuto } from "@/lib/no-circula";
import { borradorAUrl, ConflictoDeCampos, leerBase } from "@/lib/parche";
import { buscarCiudad, CIUDAD_BASE, guardarPreferencias, preferencias } from "@/lib/preferencias";

// Guarda nombre, ciudad y lugares; la ciudad se ubica sola para el clima
export async function guardarAjustes(f: FormData) {
  let destino = "/ajustes?ok=1";
  let borrador = "";
  try {
    const antes = await preferencias();
    const texto = (c: string) => String(f.get(c) ?? "").trim();
    const nombreCiudad = texto("ciudad");
    const ciudad = !nombreCiudad ? CIUDAD_BASE : nombreCiudad === antes.ciudad.nombre ? antes.ciudad : await buscarCiudad(nombreCiudad);
    if (!ciudad) throw new Error(`No encontré "${nombreCiudad}". Escribe solo el nombre de la ciudad, por ejemplo "Puebla".`);
    const nombres = f.getAll("lugar_nombre").map(String);
    const iconos = f.getAll("lugar_icono").map(String);
    const direcciones = f.getAll("lugar_direccion").map(String);
    const lugares = nombres
      .map((nombre, i) => ({ nombre: nombre.trim().slice(0, 40), icono: (iconos[i] || "📍").trim().slice(0, 8), direccion: (direcciones[i] ?? "").trim().slice(0, 300) }))
      .filter((l) => l.nombre && l.direccion);
    const auto = limpiarAuto({ terminacion: texto("auto_terminacion") === "" ? NaN : Number(texto("auto_terminacion")), holograma: texto("auto_holograma") });
    borrador = borradorAUrl({ nombre: texto("nombre"), ciudad: nombreCiudad, lugares, auto });
    await guardarPreferencias({ nombre: texto("nombre").slice(0, 40), ciudad, lugares, auto }, leerBase(f.get("base")), nombreCiudad);
    revalidatePath("/", "layout");
  } catch (e) {
    destino = `/ajustes?error=${encodeURIComponent(e instanceof Error ? e.message : String(e))}${e instanceof ConflictoDeCampos && borrador ? `&borrador=${borrador}` : ""}`;
  }
  redirect(destino);
}
