// Nube F2 · Agenda, Correo y Tareas salen de tu Google (Calendar, Gmail y Tasks). En TAOS Nube no hay conexión con
// Google (D3), así que esas secciones se esconden por completo. En tu versión propia se quedan como siempre.
export const RUTAS_GOOGLE = ["/agenda", "/correo", "/tareas"] as const;
export const esRutaGoogle = (ruta: string) => ruta === "/mas#google" || RUTAS_GOOGLE.some((r) => ruta === r || ruta.startsWith(`${r}/`) || ruta.startsWith(`${r}?`));
