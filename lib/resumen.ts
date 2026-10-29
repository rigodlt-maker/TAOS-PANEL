import { alertasCruzadas, eventosDelDia } from "./agenda";
import { fechaLarga, horaLocal, sumarDias } from "./fechas";
import type { Momento, ResumenIA } from "./ia";
import type { DatosPanel, Seccion } from "./panel";
import { escaparHtml as e } from "./texto";

const estilo = {
  cuerpo: "margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b",
  tarjeta: "max-width:560px;margin:0 auto 16px;background:#ffffff;border-radius:12px;padding:20px",
  titulo: "margin:0 0 12px;font-size:16px;color:#4338ca",
  fila: "margin:0 0 8px;font-size:14px;line-height:1.4",
  tenue: "color:#71717a",
  enlace: "color:#4338ca;text-decoration:none",
};

function tarjeta(titulo: string, contenido: string): string {
  return `<div style="${estilo.tarjeta}"><h2 style="${estilo.titulo}">${titulo}</h2>${contenido}</div>`;
}

function filas<T>(seccion: Seccion<T[]>, vacio: string, fila: (x: T) => string): string {
  if (!seccion.ok) return `<p style="${estilo.fila};${estilo.tenue}">⚠️ ${e(seccion.error)}</p>`;
  if (seccion.datos.length === 0) return `<p style="${estilo.fila};${estilo.tenue}">${vacio}</p>`;
  return seccion.datos.map((x) => `<p style="${estilo.fila}">${fila(x)}</p>`).join("");
}

// Bloque de la IA: la frase del día, prioridades, correos por responder, alertas y sugerencia
function bloqueIA(ia: ResumenIA, datos: DatosPanel, alertas: string[]): string {
  const correos = datos.correo.ok ? datos.correo.datos.correos : [];
  const responder = ia.correos
    .filter((c) => c.categoria === "responder_hoy")
    .slice(0, 5)
    .map((c) => {
      const correo = correos.find((x) => x.id === c.id);
      return correo
        ? `<p style="${estilo.fila}">• <a style="${estilo.enlace}" href="${correo.enlace}"><strong>${e(correo.de)}</strong></a>: ${e(c.resumen)}</p>`
        : "";
    })
    .join("");
  const todasLasAlertas = [...alertas, ...ia.alertas];
  return (
    `<p style="font-size:16px;line-height:1.4;margin:0 0 14px"><strong>${e(ia.hoy_en_una_linea)}</strong></p>` +
    ia.prioridades
      .slice(0, 3)
      .map((p, i) => `<p style="${estilo.fila}"><strong>${i + 1}. ${e(p.titulo)}</strong><br><span style="${estilo.tenue}">${e(p.motivo)}</span></p>`)
      .join("") +
    (responder ? `<p style="${estilo.fila};margin-top:14px"><strong>📌 Responder hoy</strong></p>${responder}` : "") +
    (todasLasAlertas.length
      ? `<p style="${estilo.fila};margin-top:14px"><strong>⚠️ Alertas</strong></p>` +
        todasLasAlertas.map((a) => `<p style="${estilo.fila}">• ${e(a)}</p>`).join("")
      : "") +
    (ia.sugerencia ? `<p style="${estilo.fila};margin-top:14px">💡 ${e(ia.sugerencia)}</p>` : "")
  );
}

export function construirResumen(momento: Momento, datos: DatosPanel, ia: Seccion<ResumenIA> | null) {
  const esManana = momento === "manana";
  const fechaAgenda = esManana ? datos.hoy : sumarDias(datos.hoy, 1);
  const agendaDelDia: Seccion<ReturnType<typeof eventosDelDia>> = datos.semana.ok
    ? { ok: true, datos: eventosDelDia(datos.semana.datos, fechaAgenda) }
    : datos.semana;
  const alertas =
    esManana && datos.semana.ok && datos.tareas.ok ? alertasCruzadas(datos.semana.datos, datos.tareas.datos, datos.hoy) : [];
  const urlPanel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  const logo = urlPanel
    ? `<img src="${urlPanel}/logo-128.png" width="48" height="48" alt="" style="display:block;margin:0 0 10px">`
    : "";
  const nombre = datos.prefs.nombre ? `, ${datos.prefs.nombre}` : "";
  const saludo = esManana ? `☀️ Buenos días${nombre}` : `🌙 Buenas noches${nombre}`;
  const asunto = esManana
    ? `☀️ Tu día: ${fechaLarga(fechaAgenda)}`
    : `🌙 Mañana ${fechaLarga(fechaAgenda)}: lo que viene`;

  let clima = "";
  if (datos.clima.ok) {
    const dia = datos.clima.datos.dias[esManana ? 0 : 1] ?? datos.clima.datos.dias[0];
    clima = `<p style="${estilo.fila}">${dia.icono} ${dia.descripcion} en ${datos.prefs.ciudad.nombre}: ${dia.min}° a ${dia.max}°, ${dia.lluvia}% de probabilidad de lluvia</p>`;
  }

  const agenda = tarjeta(
    esManana ? "📅 Tu agenda de hoy" : "📅 Tu agenda de mañana",
    filas(agendaDelDia, "Sin eventos. ¡Día libre!", (ev) =>
      `<strong>${ev.todoElDia ? "Todo el día" : horaLocal(ev.inicio)}</strong> · ${e(ev.titulo)}` +
      (ev.lugar ? ` <span style="${estilo.tenue}">(${e(ev.lugar)})</span>` : ""),
    ),
  );

  const tareas = tarjeta(
    "✅ Tareas pendientes",
    filas(datos.tareas.ok ? { ok: true, datos: datos.tareas.datos.slice(0, 8) } : datos.tareas, "No tienes tareas pendientes.", (t) =>
      `• ${e(t.titulo)}` + (t.vence ? ` <span style="${estilo.tenue}">(vence ${fechaLarga(t.vence)})</span>` : ""),
    ),
  );

  const totalCorreos = datos.correo.ok ? datos.correo.datos.total : 0;
  const categorias = datos.correo.ok ? datos.correo.datos.categorias : [];
  const otrasCategorias = categorias.length
    ? `<p style="${estilo.fila};${estilo.tenue};font-size:12px">También sin leer: ${categorias.map((c) => `${c.nombre} ${c.sinLeer}`).join(" · ")}</p>`
    : "";
  const correo = tarjeta(
    `📬 Principal sin leer${totalCorreos ? ` (${totalCorreos})` : ""}`,
    filas(datos.correo.ok ? { ok: true, datos: datos.correo.datos.correos.slice(0, 5) } : datos.correo, "Principal al día 🎉", (c) =>
      `<a style="${estilo.enlace}" href="${c.enlace}"><strong>${e(c.de)}</strong>: ${e(c.asunto)}</a>`,
    ) + otrasCategorias,
  );

  const noticias = tarjeta(
    "📰 Noticias",
    filas(datos.noticias.ok ? { ok: true, datos: datos.noticias.datos.slice(0, 5) } : datos.noticias, "Sin noticias por ahora.", (n) =>
      `<a style="${estilo.enlace}" href="${e(n.enlace)}">${e(n.titulo)}</a> <span style="${estilo.tenue}">· ${e(n.fuente)}</span>`,
    ),
  );

  const pie = urlPanel
    ? `<p style="text-align:center;font-size:13px"><a style="${estilo.enlace}" href="${urlPanel}">Abrir mi Optimizador de Vida →</a></p>`
    : "";

  const html = `<!doctype html><html><body style="${estilo.cuerpo}">
<div style="${estilo.tarjeta}">${logo}<h1 style="margin:0 0 8px;font-size:22px">${saludo}</h1>${clima}</div>
${ia?.ok ? tarjeta("🧠 Tu día en una línea", bloqueIA(ia.datos, datos, alertas)) : ""}
${!ia?.ok && alertas.length ? tarjeta("⚠️ Alertas", alertas.map((a) => `<p style="${estilo.fila}">• ${e(a)}</p>`).join("")) : ""}
${agenda}${tareas}${correo}${esManana ? noticias : ""}${pie}
</body></html>`;

  return { asunto, html };
}
