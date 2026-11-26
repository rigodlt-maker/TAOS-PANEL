"use client";

// Buscador 🔍 del encabezado, igual que en las otras apps TAOS: "¿Qué quieres hacer?" → te lleva a la pantalla.
// Sin escribir, muestra todo por grupos. Si no hay pantalla, se lo pregunta a Tao (evento "taos-preguntar").
import { ChevronRight, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DESTINOS, GRUPOS, buscarDestinos, type Destino } from "@/lib/destinos";

const preguntarATao = (pregunta: string) => window.dispatchEvent(new CustomEvent("taos-preguntar", { detail: pregunta }));

export function Buscador() {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [consulta, setConsulta] = useState("");
  const entrada = useRef<HTMLInputElement>(null);
  const ruta = usePathname();
  const router = useRouter();
  const resultados = useMemo(() => buscarDestinos(consulta), [consulta]);

  useEffect(() => setMontado(true), []);
  useEffect(() => setAbierto(false), [ruta]);
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    if (abierto) setTimeout(() => entrada.current?.focus(), 50);
    else setConsulta("");
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    const abrir = () => setAbierto(true);
    window.addEventListener("keydown", tecla);
    window.addEventListener("taos-buscar", abrir);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("taos-buscar", abrir);
    };
  }, []);

  const fila = (d: Destino) => (
    <li key={d.ruta}>
      <Link href={d.ruta} onClick={() => setAbierto(false)} className="buscador-fila">
        <span className="buscador-icono">{d.icono}</span>
        <span className="buscador-textos">
          <strong>{d.nombre}</strong>
          <span>{d.detalle}</span>
        </span>
        <ChevronRight size={16} className="buscador-flecha" />
      </Link>
    </li>
  );

  return (
    <>
      <button type="button" className="campana" onClick={() => setAbierto(true)} aria-label="Buscar en la app" aria-haspopup="dialog" data-recorrido="buscar">
        <Search size={20} />
      </button>
      {montado &&
        abierto &&
        createPortal(
          <div className="buscador-fondo" onClick={() => setAbierto(false)}>
            <div role="dialog" aria-modal="true" aria-label="Buscar" className="buscador-hoja" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ margin: "0 4px 8px", fontSize: 18 }}>¿Qué quieres hacer?</h2>
              <form
                className="buscador-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (resultados[0]) {
                    setAbierto(false);
                    router.push(resultados[0].ruta);
                  } else if (consulta.trim()) {
                    setAbierto(false);
                    preguntarATao(consulta);
                  }
                }}
              >
                <label className="buscador-caja">
                  <Search size={20} />
                  <input ref={entrada} value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Ej. mis medicinas, ¿qué tengo hoy?" aria-label="¿Qué quieres hacer?" enterKeyHint="search" />
                </label>
                <button type="button" className="campana-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">
                  <X size={20} />
                </button>
              </form>
              <div className="buscador-cuerpo">
                {consulta.trim() ? (
                  <>
                    {resultados.length > 0 ? <ul className="buscador-lista">{resultados.map(fila)}</ul> : <p className="tenue">No encontré eso con esas palabras. Prueba con otras, por ejemplo: agenda, medicinas, hábitos.</p>}
                    <button
                      type="button"
                      className="buscador-tao"
                      onClick={() => {
                        setAbierto(false);
                        preguntarATao(consulta);
                      }}
                    >
                      <Sparkles size={20} />
                      <span>
                        Preguntarle a Tao: <strong>“{consulta.trim()}”</strong>
                      </span>
                    </button>
                  </>
                ) : (
                  GRUPOS.map((g) => (
                    <section key={g}>
                      <h3 className="buscador-grupo">{g}</h3>
                      <ul className="buscador-lista">{DESTINOS.filter((d) => d.grupo === g).map(fila)}</ul>
                    </section>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// Barra "¿Qué quieres hacer?" dentro de una pantalla (abre el buscador del encabezado)
export function BarraBuscar() {
  return (
    <button type="button" className="buscador-barra" onClick={() => window.dispatchEvent(new Event("taos-buscar"))}>
      <Search size={20} /> ¿Qué quieres hacer?
    </button>
  );
}
