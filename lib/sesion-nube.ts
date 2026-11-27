// Nube F2 · En TAOS Nube el Optimizador entra con tu cuenta de TAOS (Supabase Auth, la misma de las otras apps),
// no con PANEL_PASSWORD. Aquí se lee esa sesión desde las cookies.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL_SUPABASE = () => (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const LLAVE_PUBLICA = () => (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
export const sesionNubeConfigurada = () => !!URL_SUPABASE() && !!LLAVE_PUBLICA();

export async function clienteSesion() {
  const almacen = await cookies();
  return createServerClient(URL_SUPABASE(), LLAVE_PUBLICA(), {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // En componentes de servidor no se pueden escribir cookies; el proxy renueva la sesión
        }
      },
    },
  });
}

// Id de la persona con sesión abierta (o null). getClaims revisa la firma de la sesión.
export async function usuarioDeSesion(): Promise<string | null> {
  if (!sesionNubeConfigurada()) return null;
  const { data } = await (await clienteSesion()).auth.getClaims();
  const id = data?.claims?.sub;
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

export { URL_SUPABASE, LLAVE_PUBLICA };
