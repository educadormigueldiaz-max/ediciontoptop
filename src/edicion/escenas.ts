import { Easing, interpolate } from "remotion";
import type { Caja } from "./encuadre";
import type { ElementoEscena } from "./esquema";
import type { ElementoEnEditado } from "./linea-de-tiempo";

export type EscenaEnEditado = ElementoEnEditado & { elemento: ElementoEscena };

export const esEscena = (item: ElementoEnEditado): item is EscenaEnEditado =>
  ["capas", "perspectiva", "tutorial", "objeto3d"].includes(item.elemento.tipo);

// Cómo se ve el video en un momento dado: giro de la escena, ventana donde se ve el video
// (posición, tamaño, giro, esquinas) y cómo se acomoda el cuadro completo dentro de esa ventana.
export type Pose = {
  giroX: number;
  giroY: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  giroVentana: number;
  radio: number;
  dentroX: number;
  dentroY: number;
  dentroEscala: number;
};

export const poseNeutra = (width: number, height: number): Pose => ({
  giroX: 0,
  giroY: 0,
  x: 0,
  y: 0,
  ancho: width,
  alto: height,
  giroVentana: 0,
  radio: 0,
  dentroX: 0,
  dentroY: 0,
  dentroEscala: 1,
});

export const mezclarPoses = (a: Pose, b: Pose, p: number): Pose => {
  const m = (k: keyof Pose) => a[k] + (b[k] - a[k]) * p;
  return {
    giroX: m("giroX"),
    giroY: m("giroY"),
    x: m("x"),
    y: m("y"),
    ancho: m("ancho"),
    alto: m("alto"),
    giroVentana: m("giroVentana"),
    radio: m("radio"),
    dentroX: m("dentroX"),
    dentroY: m("dentroY"),
    dentroEscala: m("dentroEscala"),
  };
};

// 0 → 1 al entrar a la escena y 1 → 0 al salir.
export const progresoEscena = (local: number, duracion: number) => {
  const t = Math.min(12, Math.floor(duracion / 3));
  return interpolate(local, [0, t, duracion - t, duracion], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
};

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Distribución de las escenas con la persona en una ventana (tutorial y objeto 3D).
export const distribucionConVentana = (width: number, height: number) => {
  const horizontal = width > height;
  const ventana = horizontal
    ? { x: width * 0.74, y: height * 0.1, ancho: width * 0.2, alto: width * 0.26 }
    : { x: width * 0.6, y: height * 0.12, ancho: width * 0.34, alto: width * 0.442 };
  const margen = width * (horizontal ? 0.05 : 0.06);
  // En horizontal el título va en una franja arriba; en vertical, al lado de la ventana.
  const titulo = {
    x: margen,
    y: ventana.y,
    ancho: ventana.x - margen * 1.5,
    alto: horizontal ? height * 0.12 : ventana.alto,
  };
  const banda = horizontal
    ? { x: margen, y: height * 0.24, ancho: ventana.x - margen * 1.5, alto: height * 0.66 }
    : {
        x: margen,
        y: ventana.y + ventana.alto + height * 0.03,
        ancho: width - margen * 2,
        alto: height * 0.8 - (ventana.y + ventana.alto + height * 0.03),
      };
  return { ventana, titulo, banda };
};

// Pose final de cada tipo de escena. `cara` es dónde está la cara en el cuadro completo.
export const poseDeEscena = (p: {
  escena: EscenaEnEditado;
  width: number;
  height: number;
  cara: Caja | null;
  local: number;
  fps: number;
}): Pose => {
  const { escena, width, height, cara, local, fps } = p;
  const base = Math.min(width, height);
  const horizontal = width > height;
  const e = escena.elemento;

  switch (e.tipo) {
    case "capas": {
      const s = horizontal ? 0.55 : 0.6;
      const ancho = width * s;
      const alto = height * s;
      return {
        giroX: 8,
        giroY: -18 + Math.sin((local / fps) * 1.2) * 3,
        x: (width - ancho) / 2 + width * 0.04,
        y: (height - alto) / 2 + height * (horizontal ? 0.07 : 0.06),
        ancho,
        alto,
        giroVentana: 0,
        radio: base * 0.04,
        dentroX: 0,
        dentroY: 0,
        dentroEscala: s,
      };
    }
    case "perspectiva": {
      // Ventana angosta y alta, centrada en la cara, para dejarle espacio a la frase.
      const ancho = width * (horizontal ? 0.42 : 0.46);
      const alto = height * (horizontal ? 0.78 : 0.6);
      const margen = width * 0.04;
      const k = alto / height;
      const caraX = cara ? cara.x + cara.ancho / 2 : width / 2;
      return {
        giroX: 3,
        giroY: 0,
        x: e.lado === "izquierda" ? width - ancho - margen : margen,
        y: (height - alto) / 2,
        ancho,
        alto,
        giroVentana: e.lado === "izquierda" ? -20 : 20,
        radio: base * 0.035,
        dentroX: limitar(ancho / 2 - caraX * k, ancho - width * k, 0),
        dentroY: 0,
        dentroEscala: k,
      };
    }
    case "tutorial":
    case "objeto3d": {
      // La ventana muestra la cara centrada, más cerca que el cuadro completo.
      const { ventana } = distribucionConVentana(width, height);
      // Lo bastante cerca para ver bien la cara, sin dejar bordes vacíos en la ventana.
      const k = Math.max(horizontal ? 0.42 : 0.6, ventana.ancho / width, ventana.alto / height);
      const caraX = cara ? cara.x + cara.ancho / 2 : width / 2;
      const caraY = cara ? cara.y + cara.alto / 2 : height * 0.35;
      return {
        giroX: 0,
        giroY: 0,
        ...ventana,
        giroVentana: 0,
        radio: base * 0.05,
        dentroX: limitar(ventana.ancho / 2 - caraX * k, ventana.ancho - width * k, 0),
        dentroY: limitar(ventana.alto / 2 - caraY * k, ventana.alto - height * k, 0),
        dentroEscala: k,
      };
    }
  }
};
