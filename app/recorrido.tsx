"use client";

// Recorrido de bienvenida con "reflector": toda la app se oscurece y solo se ilumina el botón que se explica,
// con flecha, un título corto y 1–2 frases. Sale una sola vez en cada celular (o con ?recorrido=1).
// Misma lógica que components/taos/recorrido.tsx de las otras apps TAOS, con los estilos propios del Optimizador (globals.css).
// Para iluminar algo, ponle data-recorrido="nombre" y usa ese nombre en "donde" del paso.
import { X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export type Paso = { icono: string; titulo: string; texto: string; donde?: string };

const CLAVE = "taos-recorrido-v2";
const NO_MOSTRAR_EN = ["/bienvenida", "/login", "/configurar", "/acceso-denegado"];
type Caja = { x: number; y: number; w: number; h: number };

export function Recorrido({ pasos }: { pasos: Paso[] }) {
  const [paso, setPaso] = useState<number | null>(null);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [vista, setVista] = useState({ w: 400, h: 800 });
  const ruta = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (NO_MOSTRAR_EN.some((r) => ruta.startsWith(r))) return;
    let visto = false;
    try {
      visto = localStorage.getItem(CLAVE) === "1";
    } catch {}
    if (!visto || params.get("recorrido") === "1") setPaso(0);
  }, [ruta, params]);

  // Busca el botón del paso y mide dónde está (también al girar el celular o al hacer scroll)
  const medir = useCallback(() => {
    setVista({ w: window.innerWidth, h: window.innerHeight });
    const donde = paso === null ? undefined : pasos[paso]?.donde;
    const el = donde ? document.querySelector<HTMLElement>(`[data-recorrido="${donde}"]`) : null;
    if (!el) return setCaja(null);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.top > window.innerHeight || r.bottom < 0) {
      el.scrollIntoView({ block: "center" });
      const r2 = el.getBoundingClientRect();
      return setCaja({ x: r2.left, y: r2.top, w: r2.width, h: r2.height });
    }
    setCaja({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, [paso, pasos]);

  useEffect(() => {
    if (paso === null) return;
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [paso, medir]);

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {}
    setPaso(null);
  }

  if (paso === null) return null;
  const actual = pasos[paso];
  const ultimo = paso === pasos.length - 1;
  const m = 8; // margen de la luz alrededor del botón
  const abajo = caja ? caja.y + caja.h / 2 > vista.h / 2 : false; // el botón está en la mitad de abajo → texto arriba
  const centroX = caja ? caja.x + caja.w / 2 : vista.w / 2;
  const controlesArriba = caja ? caja.y > vista.h * 0.72 : false;

  return (
    <div className="reflector" role="dialog" aria-modal="true" aria-label="Recorrido de la app">
      {/* Oscurece todo menos el botón */}
      {caja ? (
        <div
          className="reflector-luz"
          style={{ left: caja.x - m, top: caja.y - m, width: caja.w + m * 2, height: caja.h + m * 2 }}
        />
      ) : (
        <div className="reflector-sombra" />
      )}

      {/* Explicación */}
      <div
        className="reflector-texto"
        style={caja ? (abajo ? { bottom: vista.h - caja.y + m + 56 } : { top: caja.y + caja.h + m + 56 }) : { top: "30%" }}
      >
        <p className="reflector-icono" aria-hidden>
          {actual.icono}
        </p>
        <h2>{actual.titulo}</h2>
        <p>{actual.texto}</p>
      </div>

      {/* Flecha hacia el botón */}
      {caja && (
        <svg
          className="reflector-flecha"
          width="44"
          height="48"
          viewBox="0 0 44 48"
          style={{ left: Math.min(Math.max(centroX - 22, 8), vista.w - 52), ...(abajo ? { top: caja.y - m - 52 } : { top: caja.y + caja.h + m + 4 }), transform: abajo ? undefined : "scaleY(-1)" }}
          aria-hidden
        >
          <path d="M8 4 C 30 10, 30 26, 22 42" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M14 36 L22 44 L28 34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {/* Saltar */}
      <button type="button" onClick={cerrar} aria-label="Saltar recorrido" className="reflector-saltar">
        Saltar <X size={16} />
      </button>

      {/* Anterior · puntitos · Siguiente */}
      <div
        className="reflector-controles"
        style={controlesArriba ? { top: "max(4rem, calc(env(safe-area-inset-top) + 3.5rem))" } : { bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <button type="button" onClick={() => setPaso(paso - 1)} className="secundario" style={paso === 0 ? { visibility: "hidden" } : undefined}>
          Anterior
        </button>
        <div className="recorrido-puntos" aria-label={`Paso ${paso + 1} de ${pasos.length}`}>
          {pasos.map((_, i) => (
            <span key={i} className={i === paso ? "activo" : ""} />
          ))}
        </div>
        <button type="button" onClick={() => (ultimo ? cerrar() : setPaso(paso + 1))}>
          {ultimo ? "Finalizar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
