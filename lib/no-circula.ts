// Hoy No Circula (Ciudad de México y Estado de México), sin contingencia ambiental.
// Entre semana no circulan los hologramas 1 y 2 según el último dígito de la placa.
// Sábados: holograma 2 no circula ninguno; holograma 1 alterna (1.º y 3.º sábado terminación non, 2.º y 4.º par; el 5.º circulan).
// Hologramas 0 y 00, y los domingos: circulan todos. En contingencia ambiental hay restricciones extra: revisa los avisos oficiales.
export type Holograma = "00" | "0" | "1" | "2";
export type MiAuto = { terminacion: number; holograma: Holograma };

const ENTRE_SEMANA: Record<number, { digitos: [number, number]; color: string }> = {
  1: { digitos: [5, 6], color: "amarillo" },
  2: { digitos: [7, 8], color: "rosa" },
  3: { digitos: [3, 4], color: "rojo" },
  4: { digitos: [1, 2], color: "verde" },
  5: { digitos: [9, 0], color: "azul" },
};

const diaSemana = (fecha: string) => new Date(`${fecha}T12:00:00Z`).getUTCDay();
const sabadoDelMes = (fecha: string) => Math.ceil(Number(fecha.slice(8, 10)) / 7);

// Lo que no circula hoy, en general (para el letrero)
export function noCirculaHoy(fecha: string): { texto: string; corto: string } {
  const d = diaSemana(fecha);
  if (d === 0) return { texto: "Domingo: circulan todos los autos.", corto: "Circulan todos" };
  if (d === 6) {
    const n = sabadoDelMes(fecha);
    const h1 = n === 1 || n === 3 ? "holograma 1 terminación non" : n === 2 || n === 4 ? "holograma 1 terminación par" : null;
    return { texto: `Sábado: no circula el holograma 2${h1 ? ` ni el ${h1}` : ""}.`, corto: h1 ? `H2 y ${n === 2 || n === 4 ? "H1 par" : "H1 non"}` : "H2" };
  }
  const r = ENTRE_SEMANA[d];
  return { texto: `Hoy no circulan las placas ${r.digitos[0]} y ${r.digitos[1]} (engomado ${r.color}) con holograma 1 y 2.`, corto: `P: ${r.digitos[0]} y ${r.digitos[1]}` };
}

// ¿Tu auto circula hoy?
export function circulaMiAuto(auto: MiAuto, fecha: string): boolean {
  if (auto.holograma === "0" || auto.holograma === "00") return true;
  const d = diaSemana(fecha);
  if (d === 0) return true;
  if (d === 6) {
    if (auto.holograma === "2") return false;
    const n = sabadoDelMes(fecha);
    if (n === 1 || n === 3) return auto.terminacion % 2 === 0;
    if (n === 2 || n === 4) return auto.terminacion % 2 === 1;
    return true;
  }
  return !ENTRE_SEMANA[d].digitos.includes(auto.terminacion);
}

// ¿Aplica en tu ciudad? (Valle de México)
export const aplicaNoCircula = (ciudad: string) => /ciudad de mexico|cdmx|distrito federal|estado de mexico|mexico, mexico|naucalpan|tlalnepantla|ecatepec|nezahualcoyotl|toluca|atizapan|huixquilucan|cuautitlan|coacalco|tultitlan|chimalhuacan|tecamac|la paz|valle de chalco|chalco|ixtapaluca|nicolas romero/.test(
  ciudad.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
);

export function limpiarAuto(v: unknown): MiAuto | null {
  const a = v as Partial<MiAuto> | null;
  if (!a || !Number.isInteger(a.terminacion) || a.terminacion! < 0 || a.terminacion! > 9 || !["00", "0", "1", "2"].includes(a.holograma as string)) return null;
  return { terminacion: a.terminacion!, holograma: a.holograma as Holograma };
}
