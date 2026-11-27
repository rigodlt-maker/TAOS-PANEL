"use client";
// Nube F4 · Botones para suscribirse (mensual o anual, 7 días gratis) y recuperar una compra
import { useEffect, useState, useTransition } from "react";
import { comprar, precios, PRODUCTOS, recuperar, servicioPlay } from "@/lib/suscribirme";

export function Suscribirme() {
  const [precio, setPrecio] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  useEffect(() => {
    servicioPlay().then((s) => s && precios(s).then(setPrecio));
  }, []);
  const correr = (f: () => Promise<{ ok: boolean; mensaje: string }>) =>
    iniciar(async () => {
      const r = await f();
      setMensaje(r);
      if (r.ok) setTimeout(() => location.reload(), 1200);
    });
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button type="button" disabled={pendiente} onClick={() => correr(() => comprar(PRODUCTOS.mensual))} className="boton">
        Mensual · {precio[PRODUCTOS.mensual] ?? "$59"} (7 días gratis)
      </button>
      <button type="button" disabled={pendiente} onClick={() => correr(() => comprar(PRODUCTOS.anual))} className="boton secundario">
        Anual · {precio[PRODUCTOS.anual] ?? "$499"} (7 días gratis)
      </button>
      <button type="button" disabled={pendiente} onClick={() => correr(recuperar)} className="enlace-boton">
        Ya pagué: recuperar mi suscripción
      </button>
      {mensaje && <p className={mensaje.ok ? "aviso" : "error"}>{mensaje.mensaje}</p>}
      <p className="tenue" style={{ fontSize: 12, margin: 0 }}>El cobro lo hace Google Play. Puedes cancelar cuando quieras en Google Play › Pagos y suscripciones.</p>
    </div>
  );
}
