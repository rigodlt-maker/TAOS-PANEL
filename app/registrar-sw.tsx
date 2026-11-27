"use client";

import { useEffect } from "react";
import { renovarPushSiHaceFalta } from "@/lib/renovar-push";

export function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Si se cambió la llave secreta, las notificaciones de este celular se renuevan solas
    renovarPushSiHaceFalta().catch(() => {});
  }, []);
  return null;
}
