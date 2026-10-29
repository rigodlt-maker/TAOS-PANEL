import { EJEMPLOS_TAO } from "@/lib/tao";
import { Navegacion } from "../navegacion";
import { BotonTao } from "../tao";

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <header className="encabezado">
        <a href="/" className="marca">
          <img src="/icono-192.png" alt="" width={32} height={32} />
          Optimizador de Vida
        </a>
        <BotonTao ejemplos={EJEMPLOS_TAO} />
      </header>
      <main>{children}</main>
      <Navegacion />
    </div>
  );
}
