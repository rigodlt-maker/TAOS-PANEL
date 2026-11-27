// Nube F2 · Los trabajos automáticos del Optimizador (resumen y despertador de medicinas) para cada persona.
// Propia: solo el dueño (ALLOWED_EMAIL). Nube: todas las cuentas con correo confirmado, tope por ronda.
// Cada quien corre dentro de conUsuario(id): todo lo que se lee o se escribe es SOLO suyo.
import { esNube } from "./modo";
import { cliente, idDelDueno } from "./push";
import { conUsuario } from "./usuario";

type UsuarioAuth = { id: string; email?: string | null; email_confirmed_at?: string | null };
export const TOPE_POR_RONDA = 500;
export type OpcionesRonda = { nube?: boolean; listar?: () => Promise<UsuarioAuth[]>; dueno?: () => Promise<string> };

async function listarUsuarios(): Promise<UsuarioAuth[]> {
  const todos: UsuarioAuth[] = [];
  for (let pagina = 1; pagina <= 50; pagina++) {
    const { data, error } = await cliente().auth.admin.listUsers({ page: pagina, perPage: 100 });
    if (error) throw new Error(error.message);
    todos.push(...data.users);
    if (data.users.length < 100) break;
  }
  return todos;
}

export async function usuariosDeLaRonda(o: OpcionesRonda = {}): Promise<string[]> {
  if (!(o.nube ?? esNube())) return [await (o.dueno ?? idDelDueno)()];
  return (await (o.listar ?? listarUsuarios)())
    .filter((u) => u.email && u.email_confirmed_at)
    .slice(0, TOPE_POR_RONDA)
    .map((u) => u.id);
}

// Si a una persona le falla algo, se anota (sin su correo) y se sigue con las demás
export async function paraCadaUsuario<T>(trabajo: (id: string) => Promise<T>, o: OpcionesRonda = {}) {
  const resultados: T[] = [];
  let fallas = 0;
  const ids = await usuariosDeLaRonda(o);
  for (const id of ids) {
    try {
      resultados.push(await conUsuario(id, () => trabajo(id)));
    } catch (e) {
      fallas++;
      console.error("Ronda: falló un usuario", id.slice(0, 8), e instanceof Error ? e.message : String(e));
    }
  }
  return { usuarios: ids.length, fallas, resultados };
}
