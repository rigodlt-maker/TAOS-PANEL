"use client";
// Campo de contraseña con ojito para ver u ocultar lo que se escribe (todas las pantallas de contraseña del Optimizador)
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function CampoContrasena(props: Omit<React.ComponentProps<"input">, "type">) {
  const [ver, setVer] = useState(false);
  return (
    <div style={{ position: "relative", display: "grid" }}>
      <input {...props} type={ver ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false} style={{ paddingRight: 52, ...props.style }} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Ocultar contraseña" : "Ver contraseña"}
        aria-pressed={ver}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 48, minHeight: 0, padding: 0, display: "grid", placeItems: "center", background: "transparent", border: 0, color: "var(--tenue)" }}
      >
        {ver ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
      </button>
    </div>
  );
}
