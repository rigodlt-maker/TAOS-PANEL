import { calendarioIcs, leerMedicinas } from "@/lib/medicinas";

export const dynamic = "force-dynamic";

// Archivo de calendario con todas tus tomas (se repiten diario y suenan a la hora): para el calendario del celular
export async function GET() {
  return new Response(calendarioIcs(await leerMedicinas()), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="mis-medicinas.ics"' },
  });
}
