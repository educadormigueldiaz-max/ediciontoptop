// Conexión con Kreo: cada video que alguien procesa en el piloto se cobra en tokens de su cuenta de Kreo.
// - Se activa con: npm run piloto -- --kreo http://localhost:8770   (se quita con --kreo no)
// - Cada persona pega su llave (kreo_…), que crea en Kreo → Mi cuenta → Editor y tokens.
// - Antes de editar se apartan los tokens; al terminar se cobra; si falla, se devuelven.
// - Las cuentas de administración del piloto no pagan tokens.
import fs from "node:fs";
import path from "node:path";
import { escribirJson } from "../herramientas.mjs";
import { CARPETA_PILOTO } from "./datos.mjs";

const ARCHIVO = path.join(CARPETA_PILOTO, "kreo.json");

export const kreoUrl = () => {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO, "utf8")).url || null;
  } catch {
    return process.env.KREO_URL || null;
  }
};

export const configurarKreo = (url) => {
  if (!url) fs.rmSync(ARCHIVO, { force: true });
  else escribirJson(ARCHIVO, { url: url.replace(/\/$/, "") });
};

// ¿A esta persona se le cobran tokens?
export const cobraKreo = (persona) => Boolean(kreoUrl()) && !persona?.admin;

const llamar = async (ruta, llave, cuerpo) => {
  try {
    const r = await fetch(kreoUrl() + ruta, {
      method: cuerpo ? "POST" : "GET",
      headers: { authorization: `Bearer ${llave}`, ...(cuerpo ? { "content-type": "application/json" } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  } catch {
    return { status: 0, ok: false, error: "sin_conexion" };
  }
};

export const MENSAJES = {
  sin_conexion: "No pudimos conectarnos con Kreo. Intenta de nuevo en un momento.",
  llave_invalida: "Tu llave de Kreo no sirve. Crea una nueva en Kreo → Mi cuenta → Editor y tokens y pégala aquí.",
  editor_inactivo: "Tu plan del editor en Kreo no está al día. Paga tu mensualidad en Kreo y vuelve a intentarlo.",
  saldo_insuficiente: "No te alcanzan los tokens para este video. Compra un paquete en Kreo → Editor y tokens y vuelve a intentarlo.",
  operacion_desconocida: "Kreo todavía no tiene precio para este tipo de proceso. Avísale a quien administra Kreo.",
};
export const mensajeKreo = (r) => MENSAJES[r?.error] ?? "Kreo no pudo revisar tus tokens. Intenta de nuevo en un momento.";

export const validarLlave = (llave) => llamar("/api/editor/auth/validate", llave, {});
export const saldoKreo = (llave) => llamar("/api/editor/tokens/balance", llave);
export const reservarTokens = (llave, operacion, cantidad) => llamar("/api/editor/tokens/reserve", llave, { operacion, cantidad });
export const liberarTokens = (llave, reserva) => llamar("/api/editor/tokens/release", llave, { reserva });

// El cobro final se reintenta: si Kreo no responde, la reserva queda apartada y Kreo la devuelve sola en 6 horas.
export const confirmarTokens = async (llave, reserva) => {
  for (let i = 0; i < 3; i++) {
    const r = await llamar("/api/editor/tokens/confirm", llave, { reserva });
    if (r.ok || r.status === 404) return r;
    await new Promise((listo) => setTimeout(listo, 3000 * (i + 1)));
  }
  return { ok: false, error: "sin_conexion" };
};
