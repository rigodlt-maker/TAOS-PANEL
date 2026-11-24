import { obtenerAire } from "./aire";
import { obtenerClima } from "./clima";
import { preferencias } from "./preferencias";
import { fechaLocal, sumarDias } from "./fechas";
import { correosNoLeidos, eventosEntre, tareasPendientes, tokenDeAcceso } from "./google";
import { obtenerNoticias } from "./noticias";

// error = lo que lee la persona (en español, con qué hacer); detalle = el texto técnico, solo para soporte
export type Seccion<T> = { ok: true; datos: T } | { ok: false; error: string; detalle?: string };

// B4 (1.3.0) · Fallas de red o de un servicio de afuera («fetch failed», «respondió 503», tiempo agotado…): la persona
// no ve el texto técnico, sino qué pasó y qué hacer. Los avisos que la app ya escribe para la persona (por ejemplo
// «Falta conectar Google…») se muestran tal cual.
const TECNICO = /fetch failed|failed to fetch|network|respondi[oó] \d{3}|error \d{3}|econn|etimedout|enotfound|eai_again|socket|aborted|abort|timeout|timed out|und_err|certificate|json/i;

export function mensajeDeError(e: unknown, que: string): { error: string; detalle?: string } {
  const texto = e instanceof Error ? e.message : String(e);
  const tecnico = (e instanceof Error && (e.name === "TypeError" || e.name === "AbortError" || e.name === "TimeoutError")) || TECNICO.test(texto);
  if (!tecnico) return { error: texto };
  return { error: `No pude traer ${que}. Revisa tu internet e intenta de nuevo en unos minutos.`, detalle: texto.slice(0, 300) };
}

// Si una sección falla, las demás siguen funcionando
export async function seguro<T>(promesa: Promise<T>, que = "esta información"): Promise<Seccion<T>> {
  try {
    return { ok: true, datos: await promesa };
  } catch (e) {
    return { ok: false, ...mensajeDeError(e, que) };
  }
}

export const DIAS_AGENDA = 7;

// Trae la agenda de los próximos 7 días de una vez, para el selector y las alertas
export async function cargarPanel() {
  const prefs = await preferencias();
  const hoy = fechaLocal();
  const token = tokenDeAcceso();
  token.catch(() => {}); // el error se muestra en cada sección de Google
  const [semana, correo, tareas, clima, noticias] = await Promise.all([
    seguro(token.then((t) => eventosEntre(t, hoy, sumarDias(hoy, DIAS_AGENDA - 1))), "tu agenda"),
    seguro(token.then((t) => correosNoLeidos(t)), "tu correo"),
    seguro(token.then((t) => tareasPendientes(t)), "tus tareas"),
    seguro(obtenerClima(prefs.ciudad), "el clima"),
    seguro(obtenerNoticias(), "las noticias"),
  ]);
  return { hoy, semana, correo, tareas, clima, noticias, prefs };
}

// Cargas sueltas para las pantallas que solo necesitan una parte
export async function cargarAgenda() {
  const hoy = fechaLocal();
  const token = tokenDeAcceso();
  token.catch(() => {});
  const [semana, tareas] = await Promise.all([
    seguro(token.then((t) => eventosEntre(t, hoy, sumarDias(hoy, DIAS_AGENDA - 1))), "tu agenda"),
    seguro(token.then((t) => tareasPendientes(t)), "tus tareas"),
  ]);
  return { hoy, semana, tareas };
}

export const cargarCorreo = async () => seguro(tokenDeAcceso().then((t) => correosNoLeidos(t)), "tu correo");
export const cargarTareas = async () => seguro(tokenDeAcceso().then((t) => tareasPendientes(t)), "tus tareas");
export const cargarClima = async () => seguro(preferencias().then((p) => obtenerClima(p.ciudad)), "el clima");
export const cargarNoticias = async () => seguro(obtenerNoticias(), "las noticias");
export const cargarAire = async () => seguro(preferencias().then((p) => obtenerAire(p.ciudad)), "la calidad del aire");

export type DatosPanel = Awaited<ReturnType<typeof cargarPanel>>;
