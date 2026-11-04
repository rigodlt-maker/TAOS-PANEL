import type { MetadataRoute } from "next";
import { esDemo } from "@/lib/demo";

// Permite instalar el panel como app en el celular
export default function manifest(): MetadataRoute.Manifest {
  // Apps de demostración (sin base de datos): ícono a lápiz y "Demo" en el nombre, para no confundirlas con la app real
  const demo = esDemo();
  const ico = demo ? "/demo/icono" : "/icono";
  return {
    name: demo ? "Optimizador de Vida (demo)" : "Optimizador de Vida",
    short_name: demo ? "Optimizador demo" : "Optimizador",
    description: "Mi calendario, correo, tareas y más en una sola página",
    start_url: "/",
    display: "standalone",
    background_color: "#060606",
    theme_color: "#0d0a29",
    lang: "es-MX",
    icons: [
      { src: `${ico}-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${ico}-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${ico}-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Atajos: al dejar presionado el ícono de la app (Android) aparecen estos accesos directos
    shortcuts: [
      { name: "Agenda", short_name: "Agenda", url: "/agenda" },
      { name: "Correo", short_name: "Correo", url: "/correo" },
      { name: "Tareas", short_name: "Tareas", url: "/tareas" },
    ],
  };
}
