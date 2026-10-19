import type { Caption } from "@remotion/captions";
import type { Edicion } from "./esquema";

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
