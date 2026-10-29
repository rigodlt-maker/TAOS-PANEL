import { Navegacion } from "../navegacion";

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <header className="encabezado">
        <a href="/" className="marca">
          <img src="/icono-192.png" alt="" width={32} height={32} />
          Optimizador de Vida
        </a>
      </header>
      <main>{children}</main>
      <Navegacion />
    </div>
  );
}
