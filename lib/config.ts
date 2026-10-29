// Ajustes personales del panel
export const ZONA = "America/Mexico_City";
// El centro de México no tiene horario de verano desde 2022, así que el desfase es fijo
export const DESFASE = "-06:00";
// A dónde llegan los resúmenes por correo (por defecto, tu correo de ALLOWED_EMAIL)
export const CORREO_DESTINO = process.env.EMAIL_DESTINO || process.env.ALLOWED_EMAIL || "";
