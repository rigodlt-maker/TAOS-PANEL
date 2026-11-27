// Nube F2 · ¿De quién son los datos de esta petición?
// - Un trabajo automático (resumen, despertador) fija a la persona que está procesando: conUsuario(id, …).
// - Si no, en TAOS Nube es la persona con sesión; en tu versión propia, el dueño (ALLOWED_EMAIL), como siempre.
// En Nube, si no hay ninguna de las dos, se detiene: nunca se usan los datos de otra persona «por si acaso».
import { AsyncLocalStorage } from "node:async_hooks";
import { esNube } from "./modo";
import { idDelDueno } from "./push";
import { usuarioDeSesion } from "./sesion-nube";

const enCurso = new AsyncLocalStorage<string>();

export const conUsuario = <T>(id: string, trabajo: () => Promise<T>) => enCurso.run(id, trabajo);

export async function usuarioActual(): Promise<string> {
  const fijo = enCurso.getStore();
  if (fijo) return fijo;
  if (esNube()) {
    const id = await usuarioDeSesion().catch(() => null);
    if (!id) throw new Error("Vuelve a entrar a tu cuenta.");
    return id;
  }
  return idDelDueno();
}
