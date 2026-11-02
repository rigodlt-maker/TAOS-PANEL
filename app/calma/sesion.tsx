"use client";

// Sesión de calma: pantalla oscura, respiración guiada, sonido de fondo y temporizador que se apaga solo.
// Los sonidos se generan en el celular (Web Audio): no hay archivos ni internet de por medio.
import { Moon, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MINUTOS, SONIDOS, type Sonido } from "@/lib/calma";

type Motor = { ctx: AudioContext; salida: GainNode; detener: () => void };

// Ruido café: grave y parejo (como un ventilador lejano). Base de los tres sonidos.
function ruidoCafe(ctx: AudioContext): AudioBufferSourceNode {
  const segundos = 6;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * segundos, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < datos.length; i++) {
    ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    datos[i] = ultimo * 3.5;
  }
  const fuente = ctx.createBufferSource();
  fuente.buffer = buffer;
  fuente.loop = true;
  return fuente;
}

function ruidoBlanco(ctx: AudioContext): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  const fuente = ctx.createBufferSource();
  fuente.buffer = buffer;
  fuente.loop = true;
  return fuente;
}

function crearMotor(sonido: Sonido, volumen: number): Motor | null {
  if (sonido === "silencio") return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.gain.linearRampToValueAtTime(volumen, ctx.currentTime + 3); // entra despacio
  salida.connect(ctx.destination);
  const fuentes: AudioScheduledSourceNode[] = [];

  if (sonido === "lluvia") {
    // Lluvia: ruido blanco filtrado (el "shhh" de las gotas) más un fondo grave
    const blanco = ruidoBlanco(ctx);
    const pasaAltos = ctx.createBiquadFilter();
    pasaAltos.type = "highpass";
    pasaAltos.frequency.value = 900;
    const pasaBajos = ctx.createBiquadFilter();
    pasaBajos.type = "lowpass";
    pasaBajos.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    blanco.connect(pasaAltos).connect(pasaBajos).connect(g).connect(salida);
    const cafe = ruidoCafe(ctx);
    const gc = ctx.createGain();
    gc.gain.value = 0.5;
    cafe.connect(gc).connect(salida);
    fuentes.push(blanco, cafe);
  } else if (sonido === "olas") {
    // Olas: ruido café que sube y baja cada ~10 segundos
    const cafe = ruidoCafe(ctx);
    const ola = ctx.createGain();
    ola.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.1;
    const profundidad = ctx.createGain();
    profundidad.gain.value = 0.45;
    lfo.connect(profundidad).connect(ola.gain);
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 1200;
    cafe.connect(filtro).connect(ola).connect(salida);
    fuentes.push(cafe, lfo);
  } else {
    // Ruido suave: café filtrado, parejo
    const cafe = ruidoCafe(ctx);
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 900;
    cafe.connect(filtro).connect(salida);
    fuentes.push(cafe);
  }
  fuentes.forEach((f) => f.start());
  return {
    ctx,
    salida,
    detener: () => {
      const ahora = ctx.currentTime;
      salida.gain.cancelScheduledValues(ahora);
      salida.gain.setValueAtTime(salida.gain.value, ahora);
      salida.gain.linearRampToValueAtTime(0, ahora + 2);
      setTimeout(() => ctx.close(), 2200);
    },
  };
}

const formato = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function SesionCalma({ frase }: { frase: string }) {
  const [sonido, setSonido] = useState<Sonido>("lluvia");
  const [minutos, setMinutos] = useState(30);
  const [activa, setActiva] = useState(false);
  const [restante, setRestante] = useState(0);
  const motor = useRef<Motor | null>(null);
  const bloqueo = useRef<{ release: () => Promise<void> } | null>(null);

  function detener() {
    motor.current?.detener();
    motor.current = null;
    bloqueo.current?.release().catch(() => {});
    bloqueo.current = null;
    setActiva(false);
  }

  async function empezar() {
    motor.current?.detener();
    motor.current = crearMotor(sonido, 0.6);
    setRestante(minutos * 60);
    setActiva(true);
    // Que la pantalla no se apague de golpe mientras suena (si el celular lo permite)
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      bloqueo.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {}
  }

  useEffect(() => {
    if (!activa) return;
    const t = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          detener();
          return 0;
        }
        // Los últimos 30 segundos el sonido se va apagando
        if (r === 30 && motor.current) {
          const { ctx, salida } = motor.current;
          salida.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 29);
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [activa]);

  useEffect(() => () => detener(), []);

  return (
    <div className="calma">
      <a className="calma-cerrar" href="/" aria-label="Salir de la sesión de calma" onClick={detener}>
        <X size={22} />
      </a>
      <Moon size={28} className="calma-luna" />
      <div className={activa ? "calma-respira activa" : "calma-respira"} aria-hidden="true" />
      <p className="calma-guia">{activa ? "Inhala cuando crezca · exhala cuando se encoja" : "Respira lento. Esta noche no hay prisa."}</p>
      <blockquote className="calma-frase">{frase}</blockquote>

      {!activa ? (
        <div className="calma-opciones">
          <div className="calma-fila" role="radiogroup" aria-label="Sonido">
            {SONIDOS.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={sonido === s.id} className={sonido === s.id ? "elegido" : ""} onClick={() => setSonido(s.id)}>
                <span>{s.icono}</span>
                {s.nombre}
              </button>
            ))}
          </div>
          <div className="calma-fila" role="radiogroup" aria-label="Duración">
            {MINUTOS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={minutos === m} className={minutos === m ? "elegido" : ""} onClick={() => setMinutos(m)}>
                {m} min
              </button>
            ))}
          </div>
          <button type="button" className="calma-empezar" onClick={empezar}>
            <Play size={20} /> Empezar
          </button>
        </div>
      ) : (
        <div className="calma-opciones">
          <p className="calma-tiempo">{formato(restante)}</p>
          <button type="button" className="calma-detener" onClick={detener}>
            <Pause size={20} /> Detener
          </button>
        </div>
      )}
      <p className="calma-nota">Si te cuesta dormir muy seguido, platícalo con un profesional de la salud.</p>
    </div>
  );
}
