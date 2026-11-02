// Fondo animado de la pantalla Hoy según el clima: sol, luna con estrellas, nubes, lluvia, tormenta, nieve o niebla.
// Solo CSS (sin imágenes ni librerías), detrás del contenido y muy suave para no distraer.
// Si el celular tiene activado "reducir movimiento", se queda quieto.
import type { Escena } from "@/lib/clima";

// Posiciones fijas (no aleatorias) para que el servidor y el navegador dibujen lo mismo
const sembrar = (n: number, semilla: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = (i * 37 + semilla * 11) % 100;
    const retraso = ((i * 53 + semilla * 7) % 100) / 100;
    return { x, retraso, tam: 0.6 + (((i * 29) % 10) / 10) * 0.8 };
  });

export function Cielo({ escena }: { escena: Escena }) {
  const gotas = escena === "lluvia" || escena === "tormenta";
  return (
    <div className={`cielo escena-${escena}`} aria-hidden="true">
      {escena === "sol" && <div className="cielo-sol" />}
      {escena === "luna" && (
        <>
          <div className="cielo-luna" />
          {sembrar(18, 3).map((e, i) => (
            <span key={i} className="cielo-estrella" style={{ left: `${e.x}%`, top: `${(i * 23) % 45}%`, animationDelay: `${e.retraso * 4}s`, transform: `scale(${e.tam})` }} />
          ))}
        </>
      )}
      {(escena === "nubes" || gotas || escena === "nieve") && (
        <>
          <div className="cielo-nube n1" />
          <div className="cielo-nube n2" />
          <div className="cielo-nube n3" />
        </>
      )}
      {gotas &&
        sembrar(36, 5).map((g, i) => (
          <span key={i} className="cielo-gota" style={{ left: `${g.x}%`, animationDelay: `${g.retraso * 1.2}s`, animationDuration: `${0.8 + g.tam * 0.5}s` }} />
        ))}
      {escena === "tormenta" && <div className="cielo-relampago" />}
      {escena === "nieve" &&
        sembrar(26, 9).map((c, i) => (
          <span key={i} className="cielo-copo" style={{ left: `${c.x}%`, animationDelay: `${c.retraso * 8}s`, animationDuration: `${7 + c.tam * 5}s` }} />
        ))}
      {escena === "niebla" && (
        <>
          <div className="cielo-bruma b1" />
          <div className="cielo-bruma b2" />
        </>
      )}
    </div>
  );
}
