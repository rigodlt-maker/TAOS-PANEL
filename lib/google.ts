import { correosDemo, esDemo, eventosDemo, tareasDemo, TOKEN_DEMO } from "./demo";
import { ZONA } from "./config";
import { rangoDelDia } from "./fechas";
import { decodificarEntidades } from "./texto";

function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} en Vercel`);
  return valor;
}

// Cambia el Refresh token por un token de acceso temporal (dura ~1 hora)
export async function tokenDeAcceso(): Promise<string> {
  if (esDemo()) return TOKEN_DEMO;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: variable("GOOGLE_CLIENT_ID"),
      client_secret: variable("GOOGLE_CLIENT_SECRET"),
      refresh_token: variable("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // Google explica el motivo en "error" (por ejemplo invalid_client o invalid_grant); no incluye secretos
    const detalle = (await res.json().catch(() => ({}))) as { error?: string; error_description?: string };
    const motivo = [detalle.error, detalle.error_description].filter(Boolean).join(": ");
    throw new Error(`Google rechazó la conexión (${res.status}${motivo ? `, ${motivo}` : ""}). Revisa las llaves o genera un Refresh token nuevo.`);
  }
  const datos = (await res.json()) as { access_token: string };
  return datos.access_token;
}

async function googleGet<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Error ${res.status} al consultar Google: ${await res.text()}`);
  return (await res.json()) as T;
}

// ---------- Calendario ----------

export type Evento = {
  titulo: string;
  inicio: string;
  fin: string;
  todoElDia: boolean;
  lugar?: string;
  descripcion?: string;
  enlace?: string;
  videollamada?: string;
  asistentes: number;
};

type EventoGoogle = {
  summary?: string;
  location?: string;
  description?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  attendees?: { email?: string }[];
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
};

// Eventos desde el inicio de "desde" hasta el final de "hasta" (fechas AAAA-MM-DD)
export async function eventosEntre(token: string, desde: string, hasta: string): Promise<Evento[]> {
  if (token === TOKEN_DEMO) return eventosDemo(desde);
  const params = new URLSearchParams({
    timeMin: rangoDelDia(desde).inicio,
    timeMax: rangoDelDia(hasta).fin,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
    timeZone: ZONA,
  });
  const datos = await googleGet<{ items?: EventoGoogle[] }>(
    token,
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
  );
  return (datos.items ?? []).map((e) => ({
    titulo: e.summary || "(Sin título)",
    inicio: e.start.dateTime ?? e.start.date ?? "",
    fin: e.end.dateTime ?? e.end.date ?? "",
    todoElDia: !e.start.dateTime,
    lugar: e.location,
    descripcion: e.description,
    enlace: e.htmlLink,
    videollamada: e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri,
    asistentes: e.attendees?.length ?? 0,
  }));
}

// ---------- Gmail ----------

export type Correo = { id: string; de: string; direccion: string; asunto: string; fragmento: string; enlace: string };
export type Categoria = { nombre: string; sinLeer: number; enlace: string };

type MensajeGoogle = {
  id: string;
  snippet?: string;
  payload?: { headers?: { name: string; value: string }[] };
};

// Las otras pestañas de Gmail solo se muestran como conteo, para no llenar el panel de ruido
const CATEGORIAS = [
  { id: "CATEGORY_PROMOTIONS", nombre: "Promociones", pestana: "promotions" },
  { id: "CATEGORY_SOCIAL", nombre: "Social", pestana: "social" },
  { id: "CATEGORY_UPDATES", nombre: "Notificaciones", pestana: "updates" },
  { id: "CATEGORY_FORUMS", nombre: "Foros", pestana: "forums" },
];

async function categoriasSinLeer(token: string): Promise<Categoria[]> {
  const categorias = await Promise.all(
    CATEGORIAS.map(async (c) => {
      const etiqueta = await googleGet<{ threadsUnread?: number }>(
        token,
        `https://gmail.googleapis.com/gmail/v1/users/me/labels/${c.id}`,
      ).catch(() => ({ threadsUnread: 0 }));
      return {
        nombre: c.nombre,
        sinLeer: etiqueta.threadsUnread ?? 0,
        enlace: `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`category:${c.pestana} is:unread`)}`,
      };
    }),
  );
  return categorias.filter((c) => c.sinLeer > 0);
}

// Solo los no leídos que no son de otras categorías. Se excluyen en vez de usar "category:primary"
// porque si una pestaña está desactivada en Gmail, sus correos aparecen dentro de Principal.
export async function correosNoLeidos(
  token: string,
  maximo = 10,
): Promise<{ total: number; correos: Correo[]; categorias: Categoria[] }> {
  if (token === TOKEN_DEMO) return correosDemo();
  const params = new URLSearchParams({ q: "is:unread in:inbox -category:promotions -category:social -category:updates -category:forums", maxResults: String(maximo) });
  const [lista, categorias] = await Promise.all([
    googleGet<{ messages?: { id: string }[]; resultSizeEstimate?: number }>(
      token,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    ),
    categoriasSinLeer(token),
  ]);
  const correos = await Promise.all(
    (lista.messages ?? []).map(async ({ id }) => {
      const m = await googleGet<MensajeGoogle>(
        token,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
      );
      const cabecera = (nombre: string) => m.payload?.headers?.find((h) => h.name === nombre)?.value ?? "";
      const remitente = cabecera("From");
      const de = remitente.replace(/\s*<.*>$/, "").replace(/"/g, "");
      const direccion = (remitente.match(/<([^>]+)>/)?.[1] ?? remitente).trim().toLowerCase();
      return {
        id,
        de: de || "(Desconocido)",
        direccion,
        asunto: cabecera("Subject") || "(Sin asunto)",
        fragmento: decodificarEntidades(m.snippet ?? ""),
        enlace: `https://mail.google.com/mail/u/0/#inbox/${id}`,
      };
    }),
  );
  return { total: lista.resultSizeEstimate ?? correos.length, correos, categorias };
}

function base64(texto: string): string {
  return Buffer.from(texto, "utf-8").toString("base64");
}

export async function enviarCorreo(token: string, para: string, asunto: string, html: string): Promise<void> {
  if (token === TOKEN_DEMO) return;
  const mensaje = [
    `To: ${para}`,
    `Subject: =?UTF-8?B?${base64(asunto)}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64(html),
  ].join("\r\n");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(mensaje).toString("base64url") }),
  });
  if (!res.ok) throw new Error(`No se pudo enviar el correo (${res.status}): ${await res.text()}`);
}

// ---------- Google Tasks ----------

export type Tarea = { titulo: string; vence?: string; notas?: string };

export async function tareasPendientes(token: string): Promise<Tarea[]> {
  if (token === TOKEN_DEMO) return tareasDemo(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date()));
  const datos = await googleGet<{ items?: { title?: string; due?: string; notes?: string }[] }>(
    token,
    "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false&maxResults=100",
  );
  const tareas = (datos.items ?? [])
    .filter((t) => t.title?.trim())
    .map((t) => ({ titulo: t.title!, vence: t.due?.slice(0, 10), notas: t.notes }));
  // Primero las que tienen fecha (la más próxima arriba), luego las demás
  return tareas.sort((a, b) => (a.vence ?? "9999").localeCompare(b.vence ?? "9999"));
}
