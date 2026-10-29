"use client";

import { useState } from "react";

export function Copiar({ texto }: { texto: string }) {
  const [listo, setListo] = useState(false);
  return (
    <div className="pila">
      <button
        type="button"
        className="boton"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texto);
          } catch {
            (document.getElementById("sql") as HTMLTextAreaElement | null)?.select();
          }
          setListo(true);
        }}
      >
        {listo ? "✅ ¡Copiado!" : "Copiar código"}
      </button>
      <textarea id="sql" readOnly value={texto} rows={6} style={{ width: "100%", fontFamily: "monospace", fontSize: 11, background: "var(--fondo)", color: "var(--tenue)", border: "1px solid var(--borde)", borderRadius: 12, padding: 10 }} />
    </div>
  );
}
