import { decodificarEntidades } from "./texto";

export type Noticia = { titulo: string; fuente: string; enlace: string };

// Titulares principales de Google Noticias México
export async function obtenerNoticias(maximo = 6): Promise<Noticia[]> {
  const res = await fetch("https://news.google.com/rss?hl=es-419&gl=MX&ceid=MX:es-419", { cache: "no-store" });
  if (!res.ok) throw new Error(`Google Noticias respondió ${res.status}`);
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, maximo);
  return items.map(([, item]) => {
    const campo = (etiqueta: string) =>
      decodificarEntidades(item.match(new RegExp(`<${etiqueta}[^>]*>([\\s\\S]*?)</${etiqueta}>`))?.[1] ?? "").trim();
    const fuente = campo("source");
    let titulo = campo("title");
    if (fuente && titulo.endsWith(` - ${fuente}`)) titulo = titulo.slice(0, -(fuente.length + 3));
    return { titulo, fuente, enlace: campo("link") };
  });
}
