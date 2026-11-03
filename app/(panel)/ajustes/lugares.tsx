"use client";
// Editor de lugares frecuentes: agregar, borrar, ícono de una lista y dirección o enlace de mapas
import { useState } from "react";

export const ICONOS: [string, string][] = [
  ["🏡", "Casa"], ["💼", "Trabajo"], ["🏢", "Oficina"], ["🏋️", "Gimnasio"], ["👨‍👩‍👧", "Familia"], ["🏫", "Escuela"],
  ["🏥", "Hospital"], ["🛒", "Súper"], ["☕", "Café"], ["🍽️", "Restaurante"], ["⛪", "Iglesia"], ["🌳", "Parque"],
  ["🌆", "Ciudad"], ["✈️", "Aeropuerto"], ["🚌", "Terminal"], ["📍", "Otro"],
];

type Fila = { id: number; icono: string; nombre: string; direccion: string };

export function Lugares({ iniciales }: { iniciales: { icono: string; nombre: string; direccion: string }[] }) {
  const [filas, setFilas] = useState<Fila[]>(() => iniciales.map((l, i) => ({ id: i, ...l })));
  const [siguiente, setSiguiente] = useState(iniciales.length);
  const cambiar = (id: number, campo: keyof Omit<Fila, "id">, valor: string) => setFilas((f) => f.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));
  const agregar = () => {
    setFilas((f) => [...f, { id: siguiente, icono: "📍", nombre: "", direccion: "" }]);
    setSiguiente((n) => n + 1);
  };
  const borrar = (id: number) => setFilas((f) => f.filter((x) => x.id !== id));

  return (
    <div className="campos">
      {filas.length === 0 && <p className="tenue" style={{ margin: 0, fontSize: 14 }}>Todavía no tienes lugares. Toca «Agregar lugar».</p>}
      {filas.map((l, i) => (
        <div key={l.id} className="fila-lugar">
          <select name="lugar_icono" value={l.icono} onChange={(e) => cambiar(l.id, "icono", e.target.value)} aria-label={`Ícono del lugar ${i + 1}`}>
            {!ICONOS.some(([e]) => e === l.icono) && <option value={l.icono}>{l.icono}</option>}
            {ICONOS.map(([e, nombre]) => (
              <option key={e} value={e}>
                {e} {nombre}
              </option>
            ))}
          </select>
          <input name="lugar_nombre" value={l.nombre} onChange={(e) => cambiar(l.id, "nombre", e.target.value)} placeholder="Nombre (Casa, Trabajo…)" maxLength={40} aria-label={`Nombre del lugar ${i + 1}`} />
          <button type="button" className="borrar-lugar" onClick={() => borrar(l.id)} aria-label={`Borrar ${l.nombre || `lugar ${i + 1}`}`}>
            🗑
          </button>
          <input
            name="lugar_direccion"
            value={l.direccion}
            onChange={(e) => cambiar(l.id, "direccion", e.target.value)}
            placeholder="Dirección o enlace de Google Maps / Mapas"
            maxLength={300}
            aria-label={`Dirección del lugar ${i + 1}`}
          />
        </div>
      ))}
      <button type="button" className="boton secundario" onClick={agregar}>
        + Agregar lugar
      </button>
    </div>
  );
}
