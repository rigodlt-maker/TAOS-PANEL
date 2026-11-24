// B4 (1.3.0) · Error de una sección: lo que la persona entiende y, escondido, el detalle técnico para soporte
export function ErrorSeccion({ error, detalle }: { error: string; detalle?: string }) {
  return (
    <>
      <p className="error">⚠️ {error}</p>
      {detalle && (
        <details className="tenue">
          <summary>Detalle para soporte</summary>
          <code>{detalle}</code>
        </details>
      )}
    </>
  );
}
