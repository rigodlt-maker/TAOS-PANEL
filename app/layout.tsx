import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarSW } from "./registrar-sw";

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
      <body>
        {process.env.NEXT_PUBLIC_TAOS_MODIFICADA === "1" && (
          <div role="alert" style={{ background: "#2a2100", color: "#f0d27a", fontSize: 13, lineHeight: 1.4, padding: "8px 16px", textAlign: "center", borderBottom: "1px solid #d4af37" }}>
            ⚠️ Esta copia de la app fue modificada: puede no funcionar como se diseñó y no tiene soporte de TAOS.
          </div>
        )}
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
