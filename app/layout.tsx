import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarSW } from "./registrar-sw";
import { SCRIPT_LETRA } from "./tamano-letra";

export const metadata: Metadata = {
  title: "Optimizador de Vida",
  description: "Mi calendario, correo, tareas y más en una sola página",
  appleWebApp: { capable: true, title: "Optimizador", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        {/* Tamaño de letra elegido en este celular, antes de pintar */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_LETRA }} />
      </head>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
