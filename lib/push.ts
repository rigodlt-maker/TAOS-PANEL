import { createECDH, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { eventosDelDia } from "./agenda";
import { ZONA } from "./config";
import { horaLocal, sumarDias } from "./fechas";
import type { Evento, Tarea } from "./google";

// Lo que aparece en la notificación del celular. "etiqueta" hace que un aviso nuevo reemplace al anterior del mismo tema.
export type AvisoPush = { titulo: string; cuerpo: string; url?: string; etiqueta?: string };
export type SuscripcionPush = { endpoint: string; p256dh: string; auth: string; dispositivo: string | null };

// El panel no tiene base de datos propia: los celulares suscritos se guardan en el Supabase compartido de las apps TAOS
const APP_PUSH = "panel";

// Se leen una por una (no en lista) para que Next.js las encuentre al publicar
export function variablesFaltantes(): string[] {
  const faltan: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) faltan.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SECRET_KEY?.trim()) faltan.push("SUPABASE_SECRET_KEY");
  if (!process.env.ALLOWED_EMAIL?.trim()) faltan.push("ALLOWED_EMAIL");
  return faltan;
}

export const pushConfigurado = () => variablesFaltantes().length === 0;

// Llaves VAPID: se derivan de SUPABASE_SECRET_KEY igual que en Finanzas y Cerebro
export function llavesVapid(): { publica: string; privada: string } | null {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    return { publica: process.env.VAPID_PUBLIC_KEY, privada: process.env.VAPID_PRIVATE_KEY };
  const base = process.env.SUPABASE_SECRET_KEY;
  return base ? llavesDesde(base) : null;
}

export function llavesDesde(base: string): { publica: string; privada: string } {
  // Casi nunca pasa, pero si los 32 bytes no son una llave P-256 válida se prueba con el siguiente número
  for (let i = 0; ; i++) {
    const privada = createHmac("sha256", base).update(`taos:vapid:${i}`).digest();
    try {
      const ecdh = createECDH("prime256v1");
      ecdh.setPrivateKey(privada);
      return { publica: ecdh.getPublicKey().toString("base64url"), privada: privada.toString("base64url") };
    } catch {
      continue;
    }
  }
}

// ---------- Suscripciones (con la llave secreta; el panel ya se protege con su contraseña) ----------

// Solo el dominio del proyecto: si se copió con una ruta (p. ej. ".../rest/v1/"), Supabase responde "Invalid path"
export function soloDominio(url: string): string {
  try {
    return new URL(url.trim()).origin;
  } catch {
    return url.trim();
  }
}

export function cliente() {
  if (!pushConfigurado()) throw new Error(`Falta en Vercel: ${variablesFaltantes().join(", ")}.`);
  return createClient(soloDominio(process.env.NEXT_PUBLIC_SUPABASE_URL!), process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

const g = globalThis as unknown as { __idDueno?: string };

// Id del dueño (el mismo usuario de Finanzas y Cerebro), a partir de ALLOWED_EMAIL
export async function idDelDueno(): Promise<string> {
  if (g.__idDueno) return g.__idDueno;
  const correo = process.env.ALLOWED_EMAIL!.trim().toLowerCase();
  for (let pagina = 1; pagina <= 10; pagina++) {
    const { data, error } = await cliente().auth.admin.listUsers({ page: pagina, perPage: 100 });
    if (error) throw new Error(error.message);
    const usuario = data.users.find((u) => u.email?.toLowerCase() === correo);
    if (usuario) return (g.__idDueno = usuario.id);
    if (data.users.length < 100) break;
  }
  throw new Error("Ese correo todavía no ha entrado a Finanzas ni una vez");
}

function revisar<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export async function suscripciones(): Promise<SuscripcionPush[]> {
  return revisar(await cliente().from("push_subscriptions").select("endpoint, p256dh, auth, dispositivo").eq("user_id", await idDelDueno()).eq("app", APP_PUSH)) ?? [];
}

export async function guardarSuscripcion(s: SuscripcionPush) {
  // Si el mismo celular se vuelve a suscribir, se actualizan sus llaves
  revisar(await cliente().from("push_subscriptions").upsert({ ...s, user_id: await idDelDueno(), app: APP_PUSH }, { onConflict: "endpoint" }));
}

export async function borrarSuscripcion(endpoint: string) {
  revisar(await cliente().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("app", APP_PUSH));
}

// Manda el aviso a todos los celulares suscritos. Nunca lanza error: si falla, el correo sigue saliendo.
export async function enviarPush(avisos: AvisoPush | AvisoPush[]): Promise<{ enviados: number; fallidos: number }> {
  const lista = (Array.isArray(avisos) ? avisos : [avisos]).slice(0, 6);
  const llaves = llavesVapid();
  const resultado = { enviados: 0, fallidos: 0 };
  if (!llaves || !lista.length || !pushConfigurado()) return resultado;
  const subs = await suscripciones().catch((e) => {
    console.error("Push:", e);
    return [];
  });
  const vapidDetails = { subject: `mailto:${process.env.ALLOWED_EMAIL}`, publicKey: llaves.publica, privateKey: llaves.privada };
  for (const s of subs) {
    for (const aviso of lista) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { vapidDetails, TTL: 6 * 3600, urgency: "high" });
        resultado.enviados++;
      } catch (e) {
        resultado.fallidos++;
        const codigo = (e as { statusCode?: number }).statusCode;
        // 404 o 410: el celular ya no acepta avisos (desinstalaste la app o quitaste el permiso)
        if (codigo === 404 || codigo === 410) {
          await borrarSuscripcion(s.endpoint).catch(() => {});
          break;
        }
        console.error("Push:", codigo, (e as Error).message);
      }
    }
  }
  return resultado;
}

// ---------- Textos de los avisos ----------

const lista = (eventos: Evento[]) =>
  eventos
    .slice(0, 4)
    .map((e) => `${e.todoElDia ? "Todo el día" : horaLocal(e.inicio)} ${e.titulo}`)
    .join(" · ") + (eventos.length > 4 ? ` · y ${eventos.length - 4} más` : "");

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// Mañana: lo de hoy (eventos y tareas que vencen). Noche: lo de mañana, sobre todo lo que empieza temprano.
export function avisoDelDia(momento: "manana" | "noche", hoy: string, eventos: Evento[] | null, tareas: Tarea[] | null): AvisoPush {
  const dia = momento === "manana" ? hoy : sumarDias(hoy, 1);
  const delDia = eventos ? eventosDelDia(eventos, dia).sort((a, b) => (a.todoElDia === b.todoElDia ? Date.parse(a.inicio) - Date.parse(b.inicio) : a.todoElDia ? -1 : 1)) : [];
  const vencen = (tareas ?? []).filter((t) => t.vence && t.vence <= dia);
  const partes: string[] = [];
  if (delDia.length) partes.push(lista(delDia));
  if (vencen.length) partes.push(`${plural(vencen.length, "tarea vence", "tareas vencen")}${momento === "manana" ? " hoy" : " mañana"}: ${vencen.slice(0, 3).map((t) => t.titulo).join(", ")}`);
  if (momento === "manana") {
    return {
      titulo: delDia.length ? `☀️ Hoy tienes ${plural(delDia.length, "evento", "eventos")}` : "☀️ Hoy tienes el día libre",
      cuerpo: partes.join(". ") || (eventos ? "Sin eventos ni tareas para hoy." : "No se pudo leer tu agenda; ábrela para revisar."),
      url: "/",
      etiqueta: "dia",
    };
  }
  const hora = (iso: string) => Number(new Intl.DateTimeFormat("en-US", { timeZone: ZONA, hour: "numeric", hour12: false }).format(new Date(iso))) % 24;
  const temprano = delDia.find((e) => !e.todoElDia && hora(e.inicio) < 10);
  return {
    titulo: temprano ? `🌙 Mañana empiezas temprano: ${horaLocal(temprano.inicio)}` : delDia.length ? `🌙 Mañana: ${plural(delDia.length, "evento", "eventos")}` : "🌙 Mañana no tienes eventos",
    cuerpo: partes.join(". ") || (eventos ? "Descansa. 😴" : "No se pudo leer tu agenda; ábrela para revisar."),
    url: "/agenda",
    etiqueta: "manana",
  };
}
