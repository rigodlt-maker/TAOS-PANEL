// Nube F4 · Aviso arriba del Optimizador cuando no hay suscripción vigente (o hay un problema de pago)
import { Suscribirme } from "./suscribirme";
import { esDemo } from "@/lib/demo";
import { esNube } from "@/lib/modo";
import { cliente } from "@/lib/push";
import { usuarioDeSesion } from "@/lib/sesion-nube";
import { mensajeDeEstado } from "@/lib/suscripcion";
import { suscripcionDe } from "@/lib/suscripcion-servidor";

export async function AvisoSuscripcion() {
  if (!esNube() || esDemo()) return null;
  const usuario = await usuarioDeSesion().catch(() => null);
  if (!usuario) return null;
  const mensaje = mensajeDeEstado(await suscripcionDe(cliente(), usuario));
  if (!mensaje) return null;
  return (
    <div className="tarjeta" style={{ borderColor: "var(--dorado, #d4af37)", display: "grid", gap: 12, marginBottom: 16 }}>
      <p style={{ margin: 0 }}>{mensaje}</p>
      <Suscribirme />
    </div>
  );
}
