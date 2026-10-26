import { interpolate } from "remotion";
import type { ElementoColor } from "./esquema";
import type { ElementoEnEditado } from "./linea-de-tiempo";

// Color de un momento (elemento "color"): un filtro sobre el video y la persona recortada, que
// entra y sale suave. Los textos, gráficos y escenas de apoyo conservan sus colores.
export type ColorEnEditado = ElementoEnEditado & { elemento: ElementoColor };

export const esColor = (item: ElementoEnEditado): item is ColorEnEditado =>
  item.elemento.tipo === "color";

// Filtro de cada efecto con intensidad `p` (0 = sin efecto, 1 = completo) y cuánto oscurece los
// bordes (viñeta).
const EFECTOS: Record<ElementoColor["efecto"], { filtro: (p: number) => string; vineta: number }> = {
  "blanco-y-negro": {
    filtro: (p) => `grayscale(${p}) contrast(${1 + 0.15 * p}) brightness(${1 - 0.03 * p})`,
    vineta: 0.45,
  },
  sepia: { filtro: (p) => `sepia(${0.75 * p}) contrast(${1 + 0.05 * p})`, vineta: 0.3 },
  dramatico: {
    filtro: (p) => `saturate(${1 - 0.6 * p}) contrast(${1 + 0.25 * p}) brightness(${1 - 0.08 * p})`,
    vineta: 0.55,
  },
  intenso: { filtro: (p) => `saturate(${1 + 0.5 * p}) contrast(${1 + 0.12 * p})`, vineta: 0 },
};

// Frames que tarda en entrar o salir (menos si el momento es corto).
const FUNDIDO = 8;

export const colorEn = (
  items: ColorEnEditado[],
  frame: number,
): { filtro: string | undefined; vineta: number } => {
  let mejor: { item: ColorEnEditado; p: number } | null = null;
  for (const item of items) {
    const fin = item.desdeFrame + item.duracionFrames;
    if (frame < item.desdeFrame || frame >= fin) continue;
    const f = Math.min(FUNDIDO, Math.floor(item.duracionFrames / 3));
    const p = interpolate(frame, [item.desdeFrame, item.desdeFrame + f, fin - f, fin], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    if (!mejor || p > mejor.p) mejor = { item, p };
  }
  if (!mejor || mejor.p <= 0) return { filtro: undefined, vineta: 0 };
  const efecto = EFECTOS[mejor.item.elemento.efecto];
  return { filtro: efecto.filtro(mejor.p), vineta: efecto.vineta * mejor.p };
};
