import { Easing, interpolate } from "remotion";
import { elegirZona, margenesSeguros, type Caja } from "./encuadre";

// Dónde va una escena de apoyo respecto al video de la persona:
// - completa: la animación tapa el video y se oye la voz (lo de siempre).
// - encima: una tarjeta con la animación sobre el video, en el espacio libre que deja la cara.
// - dividida: la animación en una mitad y la persona en la otra (arriba y abajo en vertical,
//   lado a lado en horizontal). El video se corre para que la cara quede en su mitad.
export type Ubicacion = "completa" | "encima" | "dividida";

// Frames que tarda la pantalla en dividirse o en volver a juntarse.
export const RAMPA_DIVISION = 12;

type ConTiempo = { desdeFrame: number; duracionFrames: number };
export type TramoDividido = { desde: number; hasta: number };

// Escenas divididas seguidas (pegadas) se unen: la pantalla se divide una sola vez.
export const tramosDivididos = (items: ConTiempo[]): TramoDividido[] => {
  const orden = [...items].sort((a, b) => a.desdeFrame - b.desdeFrame);
  const tramos: TramoDividido[] = [];
  for (const x of orden) {
    const ultimo = tramos.at(-1);
    if (ultimo && x.desdeFrame - ultimo.hasta <= 3) ultimo.hasta = Math.max(ultimo.hasta, x.desdeFrame + x.duracionFrames);
    else tramos.push({ desde: x.desdeFrame, hasta: x.desdeFrame + x.duracionFrames });
  }
  return tramos;
};

// Cuánto está dividida la pantalla en un frame (0 = video normal, 1 = dividida) y en qué tramo.
export const avanceDivision = (frame: number, tramos: TramoDividido[]) => {
  const tramo = tramos.find((t) => frame >= t.desde && frame < t.hasta) ?? null;
  if (!tramo) return { t: 0, tramo: null };
  const rampa = Math.min(RAMPA_DIVISION, (tramo.hasta - tramo.desde) / 3);
  const t = Math.min(
    interpolate(frame, [tramo.desde, tramo.desde + rampa], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [tramo.hasta - rampa, tramo.hasta], [1, 0], { extrapolateLeft: "clamp" }),
  );
  return { t: Easing.bezier(0.65, 0, 0.35, 1)(Math.max(0, Math.min(1, t))), tramo };
};

export const esVertical = (width: number, height: number) => height >= width;

// Mitad de la animación (arriba en vertical y cuadrado, a la izquierda en horizontal).
export const mitadAnimacion = (width: number, height: number): Caja =>
  esVertical(width, height)
    ? { x: 0, y: 0, ancho: width, alto: Math.round(height / 2) }
    : { x: 0, y: 0, ancho: Math.round(width / 2), alto: height };

// Cuánto se corre el video para que la cara quede en el centro de la mitad de la persona.
// Solo hacia abajo (o a la derecha): lo que queda descubierto lo tapa la animación.
export const corrimientoDividido = (width: number, height: number, cara: Caja | null) => {
  const limitar = (v: number, max: number) => Math.max(0, Math.min(max, v));
  if (esVertical(width, height)) {
    const centro = cara ? cara.y + cara.alto / 2 : height * 0.4;
    return { x: 0, y: limitar(height * 0.75 - centro, height / 2) };
  }
  const centro = cara ? cara.x + cara.ancho / 2 : width / 2;
  return { x: limitar(width * 0.75 - centro, width / 2), y: 0 };
};

// La cara después de correr el video.
export const caraCorrida = (cara: Caja | null, corrimiento: { x: number; y: number }): Caja | null =>
  cara ? { ...cara, x: cara.x + corrimiento.x, y: cara.y + corrimiento.y } : null;

// Márgenes de la animación dentro de su mitad: al menos ~70 px por 1080 de ancho del video a los
// lados (lo que toca el borde del video) y la zona segura de arriba.
export const margenesDivididos = (width: number, height: number) => {
  const m = margenesSeguros(width, height);
  const lados = Math.max(m.lados, (70 * Math.min(width, height)) / 1080);
  return esVertical(width, height)
    ? // Los subtítulos van justo debajo de la línea que divide.
      { arriba: m.arriba, abajo: height * 0.03, lados }
    : { arriba: m.arriba, abajo: m.abajo, lados };
};

// Tarjeta de una escena "encima": el espacio libre más grande que no toca la cara (y, si se
// puede, tampoco los subtítulos). Si no hay espacio suficiente, los subtítulos ceden su lugar;
// si aún no alcanza, va en la mitad de abajo (vertical) o en la izquierda (horizontal).
export const cajaEncima = (p: {
  width: number;
  height: number;
  cara: Caja | null;
  topeSubtitulos: number | null;
}): Caja & { ocultaSubtitulos: boolean } => {
  const { width, height, cara } = p;
  const vertical = esVertical(width, height);
  const m = margenesSeguros(width, height);
  const minimo = (z: Caja) => (vertical ? z.alto >= height * 0.3 : z.ancho >= width * 0.34 && z.alto >= height * 0.5);
  if (cara) {
    const z = elegirZona({ width, height, cara, limiteAbajo: p.topeSubtitulos });
    if (minimo(z)) return { ...recortar(z, vertical, width, height), ocultaSubtitulos: false };
    const sin = elegirZona({ width, height, cara, limiteAbajo: null });
    if (minimo(sin)) return { ...recortar(sin, vertical, width, height), ocultaSubtitulos: p.topeSubtitulos !== null };
  }
  // Sin cara (o sin lugar): la mitad que menos la tapa.
  if (vertical) {
    const arriba = Math.max(height * 0.5, cara ? Math.min(cara.y + cara.alto, height * 0.62) : height * 0.5);
    const piso = p.topeSubtitulos !== null && p.topeSubtitulos - arriba >= height * 0.3 ? p.topeSubtitulos : height - m.abajo * 0.5;
    return { x: m.lados, y: arriba, ancho: width - m.lados * 2, alto: piso - arriba, ocultaSubtitulos: piso !== p.topeSubtitulos && p.topeSubtitulos !== null };
  }
  // Horizontal sin lugar (la cara llena el cuadro): una tarjeta más chica en la esquina de arriba
  // del lado contrario a la cara.
  const izquierda = !cara || cara.x + cara.ancho / 2 >= width / 2;
  const ancho = width * (cara ? 0.36 : 0.44);
  const alto = Math.min((p.topeSubtitulos ?? height - m.abajo) - m.arriba, cara ? height * 0.48 : height);
  return { x: izquierda ? m.lados : width - m.lados - ancho, y: m.arriba, ancho, alto, ocultaSubtitulos: false };
};

// Una tarjeta no necesita ser más grande que esto (en vertical, ni más alta que ancha × 1.1).
const recortar = (z: Caja, vertical: boolean, width: number, height: number): Caja => {
  if (vertical) {
    const alto = Math.min(z.alto, z.ancho * 1.1);
    return { ...z, y: z.y + (z.alto - alto) / 2, alto };
  }
  const ancho = Math.min(z.ancho, width * 0.5);
  const alto = Math.min(z.alto, height * 0.8);
  return { x: z.x + (z.ancho - ancho) / 2, y: z.y + (z.alto - alto) / 2, ancho, alto };
};
