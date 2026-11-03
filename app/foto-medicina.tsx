"use client";

// Foto del producto (opcional): se achica en el celular a 320 px antes de guardarla, para que sea ligera
import { Camera } from "lucide-react";
import { useState } from "react";

export function FotoMedicina({ actual }: { actual: string | null }) {
  const [foto, setFoto] = useState<string | null>(actual);
  const [valor, setValor] = useState("");

  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    const img = await createImageBitmap(archivo);
    const escala = Math.min(1, 320 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", 0.72);
    setFoto(url);
    setValor(url);
  }

  return (
    <div className="foto-medicina">
      {foto ? <img src={foto} alt="" /> : <span className="foto-vacia">💊</span>}
      <div>
        <label className="boton secundario chico">
          <Camera size={18} /> {foto ? "Cambiar foto" : "Tomar foto (opcional)"}
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => elegir(e.target.files?.[0])} />
        </label>
        {foto && (
          <button type="button" className="enlace-quitar" onClick={() => (setFoto(null), setValor("quitar"))}>
            Quitar foto
          </button>
        )}
      </div>
      <input type="hidden" name="foto" value={valor} />
    </div>
  );
}
