import { fraseDelDia } from "@/lib/calma";
import { fechaLocal } from "@/lib/fechas";
import { SesionCalma } from "./sesion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sesión de calma" };

export default function Calma() {
  return <SesionCalma frase={fraseDelDia(fechaLocal())} />;
}
