import type { Caption } from "@remotion/captions";
import type { Edicion, Elemento } from "./esquema";

export const ZOOM_EN_CORTES = 1.12;

export type Tramo = {
  desdeFrame: number; // dónde empieza en el video editado
  duracionFrames: number;
  trimBefore: number; // frame del video original donde empieza
  zoom: number;
};

// Convierte los segmentos (segundos del original) en tramos consecutivos (frames del editado).
export const calcularTramos = (edicion: Edicion, fps: number): Tramo[] => {
  let cursor = 0;
  return edicion.segmentos.map((s, i) => {
    const desde = Math.round(s.inicio * fps);
    const hasta = Math.round(Math.min(s.fin, edicion.duracion) * fps);
    const duracionFrames = Math.max(1, hasta - desde);
    const tramo: Tramo = {
      desdeFrame: cursor,
      duracionFrames,
      trimBefore: desde,
      zoom: s.zoom ?? (edicion.opciones.zoomEnCortes && i % 2 === 1 ? ZOOM_EN_CORTES : 1),
    };
    cursor += duracionFrames;
    return tramo;
  });
};

export const framesDeVideo = (tramos: Tramo[]) =>
  tramos.reduce((total, t) => total + t.duracionFrames, 0);

export const framesTotales = (edicion: Edicion, fps: number) =>
  framesDeVideo(calcularTramos(edicion, fps)) +
  (edicion.opciones.cierre ? Math.round(edicion.opciones.cierre.duracion * fps) : 0);

const FIN_DE_FRASE = /[.!?…]["»”]?$/;

// Lleva cada palabra a su momento en el video editado. Las palabras de partes
// cortadas desaparecen, así que los subtítulos siempre siguen a los cortes.
export const palabrasEnElEditado = (
  edicion: Edicion,
  tramos: Tramo[],
  fps: number,
): Caption[] => {
  const captions: Caption[] = [];
  for (const palabra of edicion.palabras) {
    for (const tramo of tramos) {
      const inicioTramo = tramo.trimBefore / fps;
      const finTramo = (tramo.trimBefore + tramo.duracionFrames) / fps;
      const a = Math.max(palabra.inicio, inicioTramo);
      const b = Math.min(palabra.fin, finTramo);
      if (b - a <= 0.02) continue;
      const offset = tramo.desdeFrame / fps - inicioTramo;
      captions.push({
        text: (captions.length === 0 ? "" : " ") + palabra.texto.trim(),
        startMs: (a + offset) * 1000,
        endMs: (b + offset) * 1000,
        timestampMs: null,
        confidence: null,
        pageBreakAfter: FIN_DE_FRASE.test(palabra.texto.trim()),
      });
      break;
    }
  }
  return captions;
};

// Frame del video editado que corresponde a un segundo del original.
// Si ese segundo se cortó: para un "inicio" se usa el comienzo del siguiente tramo,
// para un "fin" el final del tramo anterior. Devuelve null si no queda nada.
export const aFrameEditado = (
  segundo: number,
  tramos: Tramo[],
  fps: number,
  lado: "inicio" | "fin",
): number | null => {
  const frame = segundo * fps;
  for (const t of tramos) {
    if (frame >= t.trimBefore && frame <= t.trimBefore + t.duracionFrames) {
      return Math.round(t.desdeFrame + frame - t.trimBefore);
    }
  }
  if (lado === "inicio") {
    const siguientes = tramos.filter((t) => t.trimBefore > frame);
    if (siguientes.length === 0) return null;
    return siguientes.reduce((a, b) => (b.trimBefore < a.trimBefore ? b : a)).desdeFrame;
  }
  const anteriores = tramos.filter((t) => t.trimBefore + t.duracionFrames < frame);
  if (anteriores.length === 0) return null;
  const t = anteriores.reduce((a, b) => (b.trimBefore > a.trimBefore ? b : a));
  return t.desdeFrame + t.duracionFrames;
};

export type ElementoEnEditado = {
  elemento: Elemento;
  desdeFrame: number;
  duracionFrames: number;
  // Solo para listas: frame (relativo al elemento) en que aparece cada punto.
  momentos: number[];
};

// Duración mínima para que un elemento alcance a leerse.
const MIN_FRAMES_ELEMENTO = 10;

export const elementosEnElEditado = (
  edicion: Edicion,
  tramos: Tramo[],
  fps: number,
): ElementoEnEditado[] =>
  edicion.elementos.flatMap((elemento) => {
    const desde = aFrameEditado(elemento.inicio, tramos, fps, "inicio");
    const hasta = aFrameEditado(elemento.fin, tramos, fps, "fin");
    if (desde === null || hasta === null || hasta - desde < MIN_FRAMES_ELEMENTO) return [];
    const momentos =
      elemento.tipo === "lista"
        ? elemento.puntos.map((p) => {
            const f = aFrameEditado(p.en, tramos, fps, "inicio");
            return Math.max(0, Math.min((f ?? desde) - desde, hasta - desde - 1));
          })
        : [];
    return [{ elemento, desdeFrame: desde, duracionFrames: hasta - desde, momentos }];
  });
