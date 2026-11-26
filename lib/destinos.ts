// Todas las pantallas del Optimizador de Vida, por grupo y con las palabras con que la gente las busca (buscador 🔍 del encabezado).
// La búsqueda es la misma de las otras apps TAOS (components/taos/buscador.tsx allá); aquí con emojis y CSS propio.

export type Destino = { ruta: string; nombre: string; detalle: string; grupo: string; icono: string; palabras: string };

export const GRUPOS = ["Mi día", "Salud", "Configurar"] as const;

export const DESTINOS: Destino[] = [
  { ruta: "/", nombre: "Hoy", detalle: "Clima, aire, tu agenda y tareas de hoy", grupo: "Mi día", icono: "☀️", palabras: "hoy inicio clima lluvia temperatura aire uv no circula noticias" },
  { ruta: "/agenda", nombre: "Agenda", detalle: "Tus eventos de Google Calendar", grupo: "Mi día", icono: "📅", palabras: "agenda calendario eventos citas reuniones semana manana" },
  { ruta: "/correo", nombre: "Correo", detalle: "Lo importante de tu Gmail", grupo: "Mi día", icono: "✉️", palabras: "correo gmail mail mensajes bandeja" },
  { ruta: "/tareas", nombre: "Tareas", detalle: "Tus pendientes", grupo: "Mi día", icono: "✅", palabras: "tareas pendientes lista hacer to do recordatorios" },
  { ruta: "/habitos", nombre: "Mis hábitos y rachas", detalle: "Lo que quieres hacer cada día", grupo: "Salud", icono: "🌱", palabras: "habitos rachas agua leer meditar diario rutina" },
  { ruta: "/medicinas", nombre: "Mis medicinas y suplementos", detalle: "Te aviso cuándo tomarlas", grupo: "Salud", icono: "💊", palabras: "medicinas medicamentos pastillas suplementos vitaminas pomada tomar dosis alarma" },
  { ruta: "/calma", nombre: "Sesión de calma", detalle: "Respira unos minutos", grupo: "Salud", icono: "🧘", palabras: "calma respirar relajar meditar ansiedad dormir estres" },
  { ruta: "/ajustes", nombre: "Ajustes", detalle: "Nombre, ciudad, lugares y placa", grupo: "Configurar", icono: "⚙️", palabras: "ajustes nombre ciudad lugares casa trabajo placa holograma auto coche hoy no circula" },
  { ruta: "/mas#google", nombre: "Conectar Google", detalle: "Agenda, correo y tareas", grupo: "Configurar", icono: "🔗", palabras: "google conectar cuenta gmail calendar" },
  { ruta: "/mas#avisos", nombre: "Notificaciones", detalle: "Tu día en la mañana y lo de mañana en la noche", grupo: "Configurar", icono: "🔔", palabras: "notificaciones avisos alertas push recordatorios" },
  { ruta: "/mas#pantalla", nombre: "Letra grande", detalle: "Tamaño de la letra", grupo: "Configurar", icono: "🔠", palabras: "letra grande tamano pantalla tutorial" },
  { ruta: "/sugerencias", nombre: "Sugerencias", detalle: "Ideas, fallas o mejoras para TAOS", grupo: "Configurar", icono: "💡", palabras: "sugerencias sugerencia idea ideas falla error mejora comentario opinion soporte" },
  { ruta: "/mas", nombre: "Menú", detalle: "Todo lo demás", grupo: "Configurar", icono: "🗂️", palabras: "menu mas opciones noticias lugares transito" },
];

const normal = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const VACIAS = new Set("a al de del la las el los lo un una unos unas mi mis tu tus en con por para que como donde quiero ver hacer poner cambiar".split(" "));

function parecida(a: string, b: string): boolean {
  if (a.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previa = actual;
  }
  return previa[b.length] <= 1;
}

// Puntos de cada pantalla para lo que escribiste: nombre > palabras clave > detalle; tolera una letra mal escrita
export function buscarDestinos(consulta: string, destinos: Destino[] = DESTINOS): Destino[] {
  const q = normal(consulta);
  if (!q) return [];
  const palabras = q.split(" ").filter((w) => w.length >= 2 && !VACIAS.has(w));
  if (!palabras.length) return [];
  return destinos
    .map((d) => {
      const nombre = normal(d.nombre);
      const claves = normal(`${d.palabras} ${d.detalle}`).split(" ");
      let puntos = nombre.startsWith(q) ? 20 : nombre.includes(q) ? 12 : 0;
      for (const w of palabras) {
        if (nombre.split(" ").some((n) => n.startsWith(w))) puntos += 6;
        else if (claves.some((c) => c.startsWith(w) || (w.length >= 4 && c.startsWith(w.slice(0, -1))))) puntos += 4;
        else if (nombre.split(" ").some((n) => parecida(w, n))) puntos += 5;
        else if (claves.some((c) => parecida(w, c))) puntos += 2;
      }
      return { d, puntos };
    })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 8)
    .map((x) => x.d);
}
