"use client";

// Campana 🔔 del encabezado: los avisos que te ha mandado la app (los guarda el service worker en este celular, sin servidor),
// con un numerito de los que no has visto y el acceso para activar las notificaciones.
// Misma lógica que components/taos/campana.tsx de las otras apps TAOS, con los estilos propios del Optimizador (globals.css).
import { Bell, BellOff, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Aviso = { titulo: string; cuerpo: string; url: string; fecha: number };
const VISTO = "taos-avisos-visto";

async function leerBandeja(): Promise<Aviso[]> {
  try {
    const r = await (await caches.open("bandeja-avisos")).match("/__avisos");
    const lista = r ? await r.json() : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function hace(fecha: number) {
  const min = Math.round((Date.now() - fecha) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export function Campana({ ajustes }: { ajustes: string }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [visto, setVisto] = useState(0);
  const [abierta, setAbierta] = useState(false);
  const [permiso, setPermiso] = useState<NotificationPermission | "no">("default");

  const cargar = useCallback(async () => {
    setAvisos(await leerBandeja());
    try {
      setVisto(Number(localStorage.getItem(VISTO) ?? 0));
    } catch {}
    setPermiso(typeof Notification === "undefined" ? "no" : Notification.permission);
  }, []);

  useEffect(() => {
    cargar();
    const alLlegar = (e: MessageEvent) => e.data?.tipo === "taos-aviso" && cargar();
    navigator.serviceWorker?.addEventListener("message", alLlegar);
    document.addEventListener("visibilitychange", cargar);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", alLlegar);
      document.removeEventListener("visibilitychange", cargar);
    };
  }, [cargar]);

  const nuevos = avisos.filter((a) => a.fecha > visto).length;

  // Al abrir quedan como vistos; el puntito de "nuevo" se conserva hasta cerrar la bandeja
  function abrir() {
    setAbierta(true);
    try {
      localStorage.setItem(VISTO, String(Date.now()));
    } catch {}
  }

  function cerrar() {
    setAbierta(false);
    setVisto(Date.now());
  }

  const activos = permiso === "granted";
  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={nuevos ? `Avisos: ${nuevos} nuevos` : "Avisos"}
        data-recorrido="campana"
        className="campana"
      >
        {activos || permiso === "default" ? <Bell size={20} /> : <BellOff size={20} />}
        {nuevos > 0 && (
          <span className="campana-numero">
            {nuevos > 9 ? "+9" : nuevos}
          </span>
        )}
      </button>
      {abierta &&
        createPortal(
          <div className="campana-fondo" role="dialog" aria-modal="true" aria-label="Avisos" onClick={cerrar}>
            <div className="campana-hoja" onClick={(e) => e.stopPropagation()}>
              <div className="campana-cabeza">
                <h2>Avisos</h2>
                <button type="button" onClick={cerrar} aria-label="Cerrar" className="campana-cerrar">
                  <X size={20} />
                </button>
              </div>

              {!activos && (
                <a href={ajustes} onClick={cerrar} className="campana-activar">
                  <Bell size={20} />
                  <span>
                    <strong>{permiso === "denied" ? "Los avisos están bloqueados" : "Activa los avisos"}</strong>
                    <span className="tenue">
                      {permiso === "denied" ? "Permítelos en los ajustes de tu celular para esta app." : "Te aviso a tiempo de lo importante. Tócalo para activarlos."}
                    </span>
                  </span>
                </a>
              )}

              {avisos.length === 0 ? (
                <p className="tenue">Aquí verás los avisos que te mande la app. Por ahora no hay ninguno.</p>
              ) : (
                <ul className="campana-lista">
                  {avisos.map((a, i) => (
                    <li key={`${a.fecha}-${i}`}>
                      <a href={a.url} onClick={cerrar}>
                        <span className={a.fecha > visto ? "campana-punto nuevo" : "campana-punto"} />
                        <span>
                          <strong>{a.titulo}</strong>
                          {a.cuerpo && <span className="tenue">{a.cuerpo}</span>}
                          <small className="tenue">{hace(a.fecha)}</small>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {activos && (
                <a href={ajustes} onClick={cerrar} className="campana-configurar">
                  Configurar avisos
                </a>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
