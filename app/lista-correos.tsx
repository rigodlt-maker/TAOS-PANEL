"use client";

// Correos sin leer con acciones rápidas: marcar leído, archivar o mandar a la papelera (se puede recuperar en Gmail)
import { Archive, Check, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Correo } from "@/lib/google";

type Accion = "leido" | "archivar" | "papelera";
const HECHO: Record<Accion, string> = { leido: "Marcado como leído", archivar: "Archivado", papelera: "Enviado a la papelera" };

export function ListaCorreos({ correos }: { correos: Correo[] }) {
  const [quitados, setQuitados] = useState<Record<string, Accion>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function hacer(id: string, accion: Accion) {
    setOcupado(id);
    setError("");
    try {
      const r = await fetch("/api/correo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, accion }) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (d.ok) setQuitados((q) => ({ ...q, [id]: accion }));
      else setError(d.error ?? "No se pudo. Intenta de nuevo.");
    } catch {
      setError("No me pude conectar. Revisa tu internet.");
    }
    setOcupado(null);
  }

  const visibles = correos.filter((c) => !quitados[c.id]);
  const ultimos = Object.values(quitados);
  return (
    <>
      {error && <p className="error">⚠️ {error}</p>}
      {ultimos.length > 0 && <p className="tenue" style={{ marginTop: 0 }}>✅ {HECHO[ultimos.at(-1)!]}</p>}
      {visibles.length === 0 ? (
        <p className="tenue">Principal al día 🎉</p>
      ) : (
        <ul>
          {visibles.map((c) => (
            <li key={c.id} className="correo">
              <a href={c.enlace} target="_blank" style={{ color: "var(--texto)", display: "block" }}>
                <strong>{c.de}</strong>
                <div className="recorte" style={{ fontSize: 15 }}>{c.asunto}</div>
                <div className="tenue recorte">{c.fragmento}</div>
              </a>
              <div className="correo-acciones">
                {ocupado === c.id ? (
                  <Loader2 size={20} className="girar" />
                ) : (
                  <>
                    <button type="button" onClick={() => hacer(c.id, "leido")} aria-label={`Marcar como leído: ${c.asunto}`}>
                      <Check size={18} /> Leído
                    </button>
                    <button type="button" onClick={() => hacer(c.id, "archivar")} aria-label={`Archivar: ${c.asunto}`}>
                      <Archive size={18} /> Archivar
                    </button>
                    <button type="button" onClick={() => hacer(c.id, "papelera")} aria-label={`Mandar a la papelera: ${c.asunto}`}>
                      <Trash2 size={18} /> Papelera
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
