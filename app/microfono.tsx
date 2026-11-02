"use client";

// Botón de micrófono: le hablas a Tao y lo que dices se convierte en tu pregunta.
// Usa el dictado del navegador (gratis). Si el celular no lo permite, el botón no aparece
// y puedes usar el micrófono del teclado.
import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Reconocedor = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function crearReconocedor(): Reconocedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  const Clase = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Clase ? new Clase() : null;
}

export function Microfono({ onTexto, onParcial }: { onTexto: (texto: string) => void; onParcial?: (texto: string) => void }) {
  const [disponible, setDisponible] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [aviso, setAviso] = useState("");
  const rec = useRef<Reconocedor | null>(null);

  useEffect(() => setDisponible(!!crearReconocedor()), []);

  function alternar() {
    if (escuchando) {
      rec.current?.stop();
      return;
    }
    const r = crearReconocedor();
    if (!r) return;
    r.lang = "es-MX";
    r.interimResults = true;
    r.continuous = false;
    let final = "";
    r.onresult = (e) => {
      let parcial = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else parcial += t;
      }
      onParcial?.((final + parcial).trim());
    };
    r.onerror = (e) => setAviso(e.error === "not-allowed" ? "Permite el micrófono en los ajustes del navegador." : "No te escuché bien, intenta otra vez.");
    r.onend = () => {
      setEscuchando(false);
      if (final.trim()) onTexto(final.trim());
    };
    rec.current = r;
    setAviso("");
    setEscuchando(true);
    try {
      r.start();
    } catch {
      setEscuchando(false);
    }
  }

  if (!disponible) return null;
  return (
    <span className="tao-mic-caja">
      <button
        type="button"
        onClick={alternar}
        aria-label={escuchando ? "Dejar de escuchar" : "Hablarle a Tao"}
        aria-pressed={escuchando}
        className={escuchando ? "tao-mic escuchando" : "tao-mic"}
      >
        {escuchando ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
      {aviso && (
        <span role="status" className="tao-mic-aviso">
          {aviso}
        </span>
      )}
    </span>
  );
}
