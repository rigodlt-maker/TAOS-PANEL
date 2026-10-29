import { obtenerClima } from "./clima";
import { preferencias } from "./preferencias";
import { fechaLocal, sumarDias } from "./fechas";
import { correosNoLeidos, eventosEntre, tareasPendientes, tokenDeAcceso } from "./google";
import { obtenerNoticias } from "./noticias";

export type Seccion<T> = { ok: true; datos: T } | { ok: false; error: string };

// Si una sección falla, las demás siguen funcionando
async function seguro<T>(promesa: Promise<T>): Promise<Seccion<T>> {
  try {
    return { ok: true, datos: await promesa };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
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
    seguro(token.then((t) => eventosEntre(t, hoy, sumarDias(hoy, DIAS_AGENDA - 1)))),
    seguro(token.then((t) => correosNoLeidos(t))),
    seguro(token.then((t) => tareasPendientes(t))),
    seguro(obtenerClima(prefs.ciudad)),
    seguro(obtenerNoticias()),
  ]);
  return { hoy, semana, correo, tareas, clima, noticias, prefs };
}

// Cargas sueltas para las pantallas que solo necesitan una parte
export async function cargarAgenda() {
  const hoy = fechaLocal();
  const token = tokenDeAcceso();
  token.catch(() => {});
  const [semana, tareas] = await Promise.all([
    seguro(token.then((t) => eventosEntre(t, hoy, sumarDias(hoy, DIAS_AGENDA - 1)))),
    seguro(token.then((t) => tareasPendientes(t))),
  ]);
  return { hoy, semana, tareas };
}

export const cargarCorreo = async () => seguro(tokenDeAcceso().then((t) => correosNoLeidos(t)));
export const cargarTareas = async () => seguro(tokenDeAcceso().then((t) => tareasPendientes(t)));
export const cargarClima = async () => seguro(preferencias().then((p) => obtenerClima(p.ciudad)));
export const cargarNoticias = async () => seguro(obtenerNoticias());

export type DatosPanel = Awaited<ReturnType<typeof cargarPanel>>;
