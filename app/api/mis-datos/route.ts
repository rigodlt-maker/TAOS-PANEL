// Nube F2 · «Descargar mis datos» del Optimizador (el proxy ya pidió tu sesión o tu contraseña)
import { esDemo } from "@/lib/demo";
import { APP_DATOS, exportarMisDatos } from "@/lib/mis-datos";
import { cliente } from "@/lib/push";
import { usuarioActual } from "@/lib/usuario";

export const dynamic = "force-dynamic";

export async function GET() {
  if (esDemo()) return Response.json({ ok: false, mensaje: "En modo demostración no hay datos tuyos que descargar." }, { status: 400 });
  try {
    const archivo = await exportarMisDatos(cliente(), await usuarioActual());
    const nombre = `optimizador-mis-datos-${archivo.generado.slice(0, 10)}.json`;
    return new Response(JSON.stringify(archivo, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${nombre}"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json({ ok: false, mensaje: (e as Error).message, app: APP_DATOS }, { status: 500 });
  }
}
