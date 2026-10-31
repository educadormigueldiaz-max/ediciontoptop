import type { Caption } from "@remotion/captions";
import type { Edicion, Elemento } from "./esquema";

export const ZOOM_EN_CORTES = 1.12;
// Cuánto se acerca la cámara a lo largo de un tramo con `empuje` (4 %), y lo más rápido que lo
// hace (por segundo), para que en tramos cortos no se note como un salto.
const EMPUJE = 0.04;
const EMPUJE_POR_SEGUNDO = 0.01;

// Zoom extra del empuje lento en un cuadro del video original. Se mide sobre el tramo completo,
// así un pedazo del tramo (por ejemplo, la persona recortada) se mueve igual que el video.
export const zoomDeEmpuje = (empuje: Tramo["empuje"], cuadroOriginal: number, fps: number) => {
  if (!empuje) return 1;
  const avance = Math.min(1, Math.max(0, (cuadroOriginal - empuje.inicio) / empuje.duracion));
  return 1 + Math.min(EMPUJE, (EMPUJE_POR_SEGUNDO * empuje.duracion) / fps) * avance;
};

export type Tramo = {
  desdeFrame: number; // dónde empieza en el video editado
  duracionFrames: number;
  trimBefore: number; // frame del video original donde empieza
  zoom: number;
  // Tramo completo (cuadro del original donde empieza y duración) para el empuje lento, o null.
  empuje: { inicio: number; duracion: number } | null;
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
      empuje: edicion.opciones.empuje ? { inicio: desde, duracion: duracionFrames } : null,
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

// Palabra de los subtítulos; `alterna` = va con la segunda letra.
export type Subtitulo = Caption & { alterna?: boolean };

// Lleva cada palabra a su momento en el video editado. Las palabras de partes
// cortadas desaparecen, así que los subtítulos siempre siguen a los cortes.
export const palabrasEnElEditado = (
  edicion: Edicion,
  tramos: Tramo[],
  fps: number,
  // Índices de `palabras` que no van en los subtítulos (por ejemplo, las que muestra un lettering).
  ocultas: ReadonlySet<number> = new Set(),
): Subtitulo[] => {
  const soloClaves = edicion.opciones.estiloSubtitulos === "claves";
  const captions: Subtitulo[] = [];
  for (const [indice, palabra] of edicion.palabras.entries()) {
    if (ocultas.has(indice)) continue;
    if (soloClaves && !palabra.clave) continue;
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
        alterna: palabra.letra === "alterna",
      });
      break;
    }
  }
  return captions;
};

// Silencios más cortos que esto (entre palabras de una misma frase) no cuentan como pausa.
const PAUSA_MINIMA = 0.4;

// Tramos [desde, hasta) del video editado, en frames, en que la persona habla. Usa todas las
// palabras, aunque los subtítulos muestren solo las claves.
export const momentosConVoz = (edicion: Edicion, tramos: Tramo[], fps: number): Array<[number, number]> => {
  const tramosConVoz: Array<[number, number]> = [];
  for (const palabra of edicion.palabras) {
    for (const tramo of tramos) {
      const inicioTramo = tramo.trimBefore / fps;
      const finTramo = (tramo.trimBefore + tramo.duracionFrames) / fps;
      const a = Math.max(palabra.inicio, inicioTramo);
      const b = Math.min(palabra.fin, finTramo);
      if (b <= a) continue;
      tramosConVoz.push([
        Math.round(tramo.desdeFrame + (a - inicioTramo) * fps),
        Math.round(tramo.desdeFrame + (b - inicioTramo) * fps),
      ]);
    }
  }
  // Los tramos pueden ir en otro orden que el original: se ordenan y se unen los cercanos.
  tramosConVoz.sort((x, y) => x[0] - y[0]);
  const conVoz: Array<[number, number]> = [];
  for (const [desde, hasta] of tramosConVoz) {
    const anterior = conVoz.at(-1);
    if (anterior && desde - anterior[1] < PAUSA_MINIMA * fps) anterior[1] = Math.max(anterior[1], hasta);
    else conVoz.push([desde, hasta]);
  }
  return conVoz;
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
  // Frames (relativos al elemento) en que aparece cada punto, paso o etiqueta.
  momentos: number[];
};

const momentosDe = (e: Elemento): number[] => {
  switch (e.tipo) {
    case "lista":
      return e.puntos.map((p) => p.en);
    case "tutorial":
      return e.pasos.map((p) => p.en);
    case "objeto3d":
      return e.etiquetas.map((p) => p.en);
    case "apoyo": {
      // Los puntos sin momento propio se reparten en la primera mitad de la escena.
      const n = e.puntos.length;
      return e.puntos.map(
        (p, i) => p.en ?? e.inicio + (e.fin - e.inicio) * (0.15 + (n > 1 ? (0.4 * i) / (n - 1) : 0)),
      );
    }
    default:
      return [];
  }
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
    // Lo último que aparece necesita tiempo para entrar y leerse antes de que el elemento se vaya:
    // ningún punto aparece en el último 1.2 s (o el último tercio, si el elemento es corto).
    const ultimo = hasta - desde - Math.min(Math.round(1.2 * fps), Math.floor((hasta - desde) / 3));
    const momentos = momentosDe(elemento).map((en) => {
      const f = aFrameEditado(en, tramos, fps, "inicio");
      return Math.max(0, Math.min((f ?? desde) - desde, ultimo));
    });
    return [{ elemento, desdeFrame: desde, duracionFrames: hasta - desde, momentos }];
  });

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

// Une cada lettering con las palabras que repite: empieza justo cuando se empiezan a decir
// y esas palabras salen de los subtítulos, para que no aparezcan dos veces.
export const ajustarLetterings = (
  edicion: Edicion,
): { elementos: Elemento[]; palabrasOcultas: Set<number> } => {
  const ocultas = new Set<number>();
  const dichas = edicion.palabras.map((p) => normalizar(p.texto));
  const elementos = edicion.elementos.map((e) => {
    if (e.tipo !== "lettering") return e;
    const frase = e.texto.split(/\s+/).map(normalizar).filter(Boolean);
    if (frase.length === 0) return e;
    let mejor: { desde: number; hasta: number; distancia: number } | null = null;
    for (let i = 0; i < dichas.length; i++) {
      const p = edicion.palabras[i];
      if (dichas[i] !== frase[0] || p.inicio < e.inicio - 4 || p.inicio > e.fin) continue;
      let k = 0;
      let j = i;
      while (k < frase.length && j < dichas.length) {
        if (!dichas[j]) {
          j++;
          continue;
        }
        if (dichas[j] !== frase[k]) break;
        k++;
        j++;
      }
      // Basta con que coincidan las primeras palabras (o todas, si la frase es corta).
      if (k < Math.min(2, frase.length)) continue;
      const distancia = Math.abs(p.inicio - e.inicio) - k * 10;
      if (!mejor || distancia < mejor.distancia) mejor = { desde: i, hasta: j, distancia };
    }
    if (!mejor) return e;
    for (let i = mejor.desde; i < mejor.hasta; i++) ocultas.add(i);
    const primera = edicion.palabras[mejor.desde];
    const ultima = edicion.palabras[mejor.hasta - 1];
    return { ...e, inicio: primera.inicio, fin: Math.max(e.fin, ultima.fin + 0.5) };
  });
  return { elementos, palabrasOcultas: ocultas };
};
