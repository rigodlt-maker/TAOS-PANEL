"use client";

// Tamaño de letra de la app (Normal, Grande, Muy grande). Se guarda en este celular.
// El script de app/layout.tsx lo aplica antes de pintar la pantalla, para que no "brinque".
// Misma lógica que components/taos/tamano-letra.tsx de las otras apps TAOS, con estilos de globals.css (.letra).
import { useEffect, useState } from "react";

const CLAVE = "taos-letra";
const OPCIONES = [
  { id: "normal", nombre: "Normal", muestra: 15 },
  { id: "grande", nombre: "Grande", muestra: 17 },
  { id: "muy-grande", nombre: "Muy grande", muestra: 19 },
] as const;

// Se pone en el <head> del layout raíz
export const SCRIPT_LETRA = `try{var l=localStorage.getItem("${CLAVE}");if(l&&l!=="normal")document.documentElement.dataset.letra=l}catch(e){}`;

export function TamanoLetra() {
  const [actual, setActual] = useState("normal");
  useEffect(() => {
    try {
      setActual(localStorage.getItem(CLAVE) ?? "normal");
    } catch {}
  }, []);

  function elegir(id: string) {
    setActual(id);
    try {
      localStorage.setItem(CLAVE, id);
    } catch {}
    if (id === "normal") delete document.documentElement.dataset.letra;
    else document.documentElement.dataset.letra = id;
  }

  return (
    <div className="letra" role="radiogroup" aria-label="Tamaño de letra">
      {OPCIONES.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={actual === o.id}
          onClick={() => elegir(o.id)}
        >
          <strong style={{ fontSize: o.muestra }}>Aa</strong>
          <small>{o.nombre}</small>
        </button>
      ))}
    </div>
  );
}
