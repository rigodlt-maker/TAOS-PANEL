// Sesión de calma (de noche): frase del día y sonidos generados en el celular, sin archivos ni servicios externos.

// Una frase distinta cada día del año (se repiten en orden)
export const FRASES = [
  "Hoy hiciste suficiente. Lo que falta puede esperar a mañana.",
  "No tienes que resolver todo esta noche. Solo descansar.",
  "Respira lento: entra el aire en 4, sale en 6.",
  "Mañana es una página en blanco. Hoy ya la escribiste.",
  "Suelta el día como sueltas una mochila pesada.",
  "Tu cuerpo sabe descansar. Dale permiso.",
  "Lo importante ya está anotado. Tu mente puede dejarlo ir.",
  "Un paso pequeño cada día también llega lejos.",
  "Agradece una cosa buena de hoy, por pequeña que sea.",
  "La noche no es para pensar; es para recargar.",
  "Estás a salvo. Puedes cerrar los ojos.",
  "Mañana tendrás más energía para eso que te preocupa.",
  "No eres tus pendientes. Eres quien los resuelve, después de dormir.",
  "Afloja los hombros, la quijada y la frente.",
  "Escucha la lluvia, aunque sea de mentiritas. 🌧️",
  "Cada respiración lenta le dice a tu cuerpo: todo está bien.",
  "Lo que hoy salió mal también te enseñó algo.",
  "Descansar también es avanzar.",
  "Piensa en un lugar donde te sientas en paz. Quédate ahí un rato.",
  "Hoy fuiste valiente en algo, aunque no lo notaras.",
  "El sueño ordena lo que el día desordenó.",
  "Deja que tus pensamientos pasen como nubes, sin seguirlos.",
  "Mañana el café va a saber mejor. ☕",
  "Tu esfuerzo de hoy cuenta, aunque nadie lo haya visto.",
  "Respira hondo. Ahora suelta todo el aire, despacio.",
  "Estar en paz no es tener todo resuelto; es darte un respiro.",
  "Cierra el día con una sonrisa, aunque sea chiquita.",
  "La calma también se practica. Esta noche ya empezaste.",
  "Mañana te vas a agradecer haber dormido.",
  "Eres más fuerte que el día más difícil que has tenido.",
];

export function fraseDelDia(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const diaDelAnio = Math.floor((Date.UTC(a, m - 1, d) - Date.UTC(a, 0, 0)) / 86_400_000);
  return FRASES[diaDelAnio % FRASES.length];
}

export type Sonido = "lluvia" | "olas" | "suave" | "silencio";
export const SONIDOS: { id: Sonido; nombre: string; icono: string }[] = [
  { id: "lluvia", nombre: "Lluvia", icono: "🌧️" },
  { id: "olas", nombre: "Olas", icono: "🌊" },
  { id: "suave", nombre: "Ruido suave", icono: "🌫️" },
  { id: "silencio", nombre: "Silencio", icono: "🤫" },
];
export const MINUTOS = [15, 30, 60];
