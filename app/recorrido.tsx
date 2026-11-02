"use client";

// Recorrido de bienvenida: 4 o 5 tarjetas que explican la app. Sale una sola vez en cada celular
// (o cuando entras con ?recorrido=1). Igual en las apps TAOS.
import { X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export type Paso = { icono: string; titulo: string; texto: string };

const CLAVE = "taos-recorrido-v1";
const NO_MOSTRAR_EN = ["/bienvenida", "/login", "/configurar", "/acceso-denegado"];

export function Recorrido({ pasos }: { pasos: Paso[] }) {
  const [paso, setPaso] = useState<number | null>(null);
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

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {}
    setPaso(null);
  }

  if (paso === null) return null;
  const actual = pasos[paso];
  const ultimo = paso === pasos.length - 1;
  return (
    <div className="recorrido-fondo" role="dialog" aria-modal="true" aria-label="Recorrido de la app">
      <div className="recorrido">
        <button type="button" onClick={cerrar} aria-label="Saltar recorrido" className="recorrido-cerrar">
          <X size={20} />
        </button>
        <p className="recorrido-icono">{actual.icono}</p>
        <h2>{actual.titulo}</h2>
        <p className="tenue">{actual.texto}</p>
        <div className="recorrido-pie">
          <div className="recorrido-puntos" aria-label={`Paso ${paso + 1} de ${pasos.length}`}>
            {pasos.map((_, i) => (
              <span key={i} className={i === paso ? "activo" : ""} />
            ))}
          </div>
          <div className="recorrido-botones">
            {paso > 0 && (
              <button type="button" className="secundario" onClick={() => setPaso(paso - 1)}>
                Atrás
              </button>
            )}
            <button type="button" onClick={() => (ultimo ? cerrar() : setPaso(paso + 1))}>
              {ultimo ? "¡Listo!" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
