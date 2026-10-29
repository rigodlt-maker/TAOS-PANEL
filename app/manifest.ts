import type { MetadataRoute } from "next";

// Permite instalar el panel como app en el celular
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Optimizador de Vida",
    short_name: "Optimizador",
    description: "Mi calendario, correo, tareas y más en una sola página",
    start_url: "/",
    display: "standalone",
    background_color: "#060606",
    theme_color: "#0d0a29",
    lang: "es-MX",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
