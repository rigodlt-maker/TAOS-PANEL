import { DESFASE, ZONA } from "./config";

// Fecha local en formato AAAA-MM-DD, con días de desplazamiento (1 = mañana)
export function fechaLocal(dias = 0): string {
  const d = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);
}

export function rangoDelDia(fecha: string) {
  return { inicio: `${fecha}T00:00:00${DESFASE}`, fin: `${fecha}T23:59:59${DESFASE}` };
}

export function horaLocal(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// "jueves 22 de octubre"
export function fechaLarga(fecha: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${fecha}T12:00:00${DESFASE}`));
}

export function horaActual(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: ZONA, hour: "numeric", hour12: false }).format(new Date()),
  ) % 24;
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00${DESFASE}`);
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(d.getTime() + dias * 86_400_000));
}

// "vie 24"
export function fechaCorta(fecha: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, weekday: "short", day: "numeric" })
    .format(new Date(`${fecha}T12:00:00${DESFASE}`))
    .replace(".", "");
}

// "1 h 30 min"
export function duracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h && m) return `${h} h ${m} min`;
  return h ? `${h} h` : `${m} min`;
}

export function fechaDeIso(iso: string): string {
  if (iso.length === 10) return iso;
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(iso));
}
