"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Botón para volver a cargar una sección que falló (clima, noticias, agenda…) sin salir de la pantalla
export function Reintentar() {
  const router = useRouter();
  const [cargando, iniciar] = useTransition();
  return (
    <button type="button" className="boton secundario chico" disabled={cargando} onClick={() => iniciar(() => router.refresh())} style={{ marginTop: 8 }}>
      {cargando ? "Cargando…" : "Intentar de nuevo"}
    </button>
  );
}
