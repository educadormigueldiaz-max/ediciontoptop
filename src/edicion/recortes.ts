import type { Caja } from "./encuadre";
import type { Edicion, ElementoRecorte } from "./esquema";
import type { ElementoEnEditado, Tramo } from "./linea-de-tiempo";

export type RecorteEnEditado = ElementoEnEditado & { elemento: ElementoRecorte };

export const esRecorte = (item: ElementoEnEditado): item is RecorteEnEditado =>
  ["detras", "fondo", "marco"].includes(item.elemento.tipo);

// Ruta (dentro de public/) de la máscara de un cuadro del video original, o null si ese
// cuadro todavía no tiene recorte (falta `npm run recortar`).
export const mascaraDe = (recorte: Edicion["recorte"], cuadro: number): string | null =>
  recorte && recorte.cuadros.some(([desde, hasta]) => cuadro >= desde && cuadro < hasta)
    ? `${recorte.carpeta}/${cuadro}.png`
    : null;

// ¿Todos los cuadros que muestra un elemento tienen máscara?
export const recorteCompleto = (recorte: Edicion["recorte"], item: ElementoEnEditado, tramos: Tramo[]) =>
  tramosDentro(tramos, item.desdeFrame, item.desdeFrame + item.duracionFrames).every((t) => {
    for (let f = 0; f < t.duracionFrames; f++) {
      if (!mascaraDe(recorte, t.trimBefore + f)) return false;
    }
    return true;
  });

// Partes de los tramos que caen entre los frames [desde, hasta) del editado, con `desdeFrame`
// relativo a `desde`.
export const tramosDentro = (tramos: Tramo[], desde: number, hasta: number): Tramo[] =>
  tramos.flatMap((t) => {
    const a = Math.max(desde, t.desdeFrame);
    const b = Math.min(hasta, t.desdeFrame + t.duracionFrames);
    if (b <= a) return [];
    return [{ ...t, desdeFrame: a - desde, duracionFrames: b - a, trimBefore: t.trimBefore + a - t.desdeFrame }];
  });

// Cara supuesta cuando no se sabe dónde está: centrada y en el tercio de arriba.
export const caraSupuesta = (width: number, height: number): Caja => ({
  x: width * 0.32,
  y: height * 0.2,
  ancho: width * 0.36,
  alto: width * 0.42,
});

// Marco: forma de color (círculo o tarjeta) y cómo se mueve la persona para salir de ella.
export const geometriaMarco = (p: {
  forma: "circulo" | "tarjeta";
  width: number;
  height: number;
  cara: Caja;
}) => {
  const { forma, width, height, cara } = p;
  const horizontal = width > height;
  const centroX = width / 2;
  const centroY = height * (horizontal ? 0.6 : 0.56);
  const caja =
    forma === "circulo"
      ? (() => {
          const radio = Math.min(width * 0.42, height * (horizontal ? 0.36 : 0.27));
          return { x: centroX - radio, y: centroY - radio, ancho: radio * 2, alto: radio * 2, radio };
        })()
      : (() => {
          const ancho = horizontal ? width * 0.4 : width * 0.78;
          const alto = horizontal ? height * 0.66 : height * 0.46;
          return { x: centroX - ancho / 2, y: centroY - alto / 2, ancho, alto, radio: Math.min(width, height) * 0.06 };
        })();
  // La persona se achica y se mueve para que la cabeza salga por el borde de arriba de la forma
  // (un tercio de la caja de la cara queda por encima; la caja incluye el pelo).
  const escala = horizontal ? 0.72 : 0.8;
  const caraX = cara.x + cara.ancho / 2;
  const cabeza = caja.y - cara.alto * escala * 0.35;
  return {
    forma: caja,
    escala,
    x: centroX - caraX * escala,
    y: cabeza - cara.y * escala,
    // Dónde queda la coronilla.
    cabeza,
  };
};
