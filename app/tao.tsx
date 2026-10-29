"use client";

// Botón "Tao" del encabezado, igual que en las otras apps TAOS: abre el chat en una hoja desde abajo
import { ArrowUp, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Mensaje = { pregunta: string; respuesta: string | null };

// Texto con **negritas**, [enlaces](/ruta) y direcciones https://…
function enLinea(texto: string, base: string) {
  return texto.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\)|https?:\/\/\S+)/g).map((p, i) => {
    const clave = `${base}-${i}`;
    const negrita = p.match(/^\*\*([^*]+)\*\*$/);
    if (negrita) return <strong key={clave}>{negrita[1]}</strong>;
    const enlace = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (enlace)
      return enlace[2].startsWith("/") ? (
        <Link key={clave} href={enlace[2]}>
          {enlace[1]}
        </Link>
      ) : (
        <Fragment key={clave}>{enlace[1]}</Fragment>
      );
    if (/^https?:\/\//.test(p))
      return (
        <a key={clave} href={p} target="_blank" rel="noopener">
          Abrir en Google Maps
        </a>
      );
    return <Fragment key={clave}>{p}</Fragment>;
  });
}

function Texto({ texto }: { texto: string }) {
  return (
    <div className="tao-texto">
      {texto.split(/\n{2,}/).map((bloque, i) => {
        const lineas = bloque.split("\n");
        const lista = lineas.filter((l) => /^(- |\d+\. )/.test(l));
        const cabeza = lineas.filter((l) => !/^(- |\d+\. )/.test(l));
        return (
          <div key={i}>
            {cabeza.map((l, j) => (
              <p key={j}>{enLinea(l, `${i}-${j}`)}</p>
            ))}
            {lista.length > 0 && (
              <ul>
                {lista.map((l, j) => (
                  <li key={j}>{enLinea(l.replace(/^- /, ""), `${i}-l${j}`)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BotonTao({ ejemplos }: { ejemplos: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const final = useRef<HTMLDivElement>(null);
  const ruta = usePathname();

  // La hoja va directo en <body>: dentro del encabezado (que tiene desenfoque) quedaría fuera de la pantalla
  useEffect(() => setMontado(true), []);
  useEffect(() => setAbierto(false), [ruta]);
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);
  useEffect(() => {
    final.current?.scrollIntoView({ block: "end" });
  }, [mensajes]);

  async function enviar(pregunta: string) {
    pregunta = pregunta.trim();
    if (!pregunta || ocupado) return;
    setTexto("");
    setOcupado(true);
    setMensajes((m) => [...m, { pregunta, respuesta: null }]);
    let respuesta: string;
    try {
      const r = await fetch("/api/tao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregunta }) });
      if (r.redirected) respuesta = "Tu sesión se cerró. Recarga la app y vuelve a entrar.";
      else respuesta = ((await r.json().catch(() => null)) as { respuesta?: string } | null)?.respuesta ?? `Algo falló (error ${r.status}). Intenta de nuevo.`;
    } catch {
      respuesta = "No me pude conectar. Revisa tu internet e intenta de nuevo.";
    }
    setMensajes((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, respuesta } : x)));
    setOcupado(false);
  }

  return (
    <>
      <button type="button" className="tao-boton" onClick={() => setAbierto(true)} aria-haspopup="dialog">
        <Sparkles size={20} />
        Tao
      </button>
      {montado &&
        createPortal(
          <div className="tao-fondo" hidden={!abierto} onClick={() => setAbierto(false)}>
            <div role="dialog" aria-modal="true" aria-label="Pregúntale a Tao" className="tao-hoja" onClick={(e) => e.stopPropagation()}>
              <div className="tao-asa" />
              <div className="tao-cabeza">
                <h2>
                  <Sparkles size={20} /> Pregúntale a Tao
                </h2>
                <button type="button" className="tao-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">
                  <X size={20} />
                </button>
              </div>
              <div className="tao-cuerpo" onClick={(e) => (e.target as HTMLElement).closest("a") && setAbierto(false)}>
                {mensajes.length === 0 && (
                  <div className="tao-ejemplos">
                    {ejemplos.map((e) => (
                      <button key={e} type="button" onClick={() => enviar(e)}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                {mensajes.map((m, i) => (
                  <div key={i} className="tao-par">
                    <p className="tao-pregunta">{m.pregunta}</p>
                    <div className="tao-respuesta">{m.respuesta === null ? <Loader2 size={20} className="girar" /> : <Texto texto={m.respuesta} />}</div>
                  </div>
                ))}
                <div ref={final} />
                <form
                  className="tao-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    enviar(texto);
                  }}
                >
                  <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} placeholder="¿Qué tengo hoy?" aria-label="Tu pregunta" />
                  <button type="submit" disabled={ocupado || !texto.trim()} aria-label="Preguntar">
                    {ocupado ? <Loader2 size={20} className="girar" /> : <ArrowUp size={20} />}
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
