import { Easing, interpolate } from "remotion";
import type { Edicion } from "./esquema";
import { zoomDeEmpuje, type ElementoEnEditado, type Tramo } from "./linea-de-tiempo";

// Rectángulo en píxeles del video de salida.
export type Caja = { x: number; y: number; ancho: number; alto: number };
// Espacio libre donde se coloca un elemento, y de qué lado de la cara quedó.
export type Zona = Caja & { lado: "arriba" | "abajo" | "izquierda" | "derecha" | "libre" };

// Tiempo que tarda en entrar y salir un acercamiento de énfasis.
const RAMPA_ENFASIS = 0.15;

export const zoomEnfasisEn = (segundo: number, enfasis: Edicion["enfasis"]) =>
  enfasis.reduce(
    (max, e) =>
      Math.max(
        max,
        interpolate(
          segundo,
          [e.inicio, e.inicio + RAMPA_ENFASIS, e.fin, e.fin + RAMPA_ENFASIS],
          [1, e.zoom, e.zoom, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        ),
      ),
    1,
  );

// Tamaño y posición del video original dentro del formato de salida (lo que sobra se recorta).
export const geometriaVideo = (p: {
  width: number;
  height: number;
  anchoOriginal: number;
  altoOriginal: number;
  enfoqueX: number;
  enfoqueY: number;
  zoom: number;
}) => {
  const escala = Math.max(p.width / p.anchoOriginal, p.height / p.altoOriginal) * p.zoom;
  const ancho = p.anchoOriginal * escala;
  const alto = p.altoOriginal * escala;
  return {
    ancho,
    alto,
    left: (p.width - ancho) * p.enfoqueX,
    top: (p.height - alto) * p.enfoqueY,
  };
};

const mediana = (valores: number[]) => {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.floor(orden.length / 2)];
};

// Punto de enfoque del recorte. Con "auto", el recorte deja la cara centrada a lo ancho y a la
// altura de los ojos (40 % desde arriba), usando dónde está la cara la mayor parte del video.
export const enfoqueEfectivo = (edicion: Edicion, width: number, height: number) => {
  const { enfoqueX, enfoqueY } = edicion.opciones;
  const caras = (edicion.caras?.cuadros ?? []).filter((c) => c !== null);
  const escala = Math.max(width / edicion.ancho, height / edicion.alto);
  const resolver = (
    valor: number | "auto",
    centroCara: number | null,
    tamano: number,
    total: number,
    objetivo: number,
  ) => {
    if (valor !== "auto") return valor;
    // Sin cara, o si en este eje no se recorta nada, se centra.
    if (centroCara === null || tamano - total < 1) return 0.5;
    return Math.min(1, Math.max(0, (objetivo - centroCara * tamano) / (total - tamano)));
  };
  return {
    x: resolver(
      enfoqueX,
      caras.length ? mediana(caras.map((c) => c[0] + c[2] / 2)) : null,
      edicion.ancho * escala,
      width,
      width / 2,
    ),
    y: resolver(
      enfoqueY,
      caras.length ? mediana(caras.map((c) => c[1] + c[3] / 2)) : null,
      edicion.alto * escala,
      height,
      height * 0.4,
    ),
  };
};

// El detector marca de la frente al mentón: se agrega espacio para el pelo, el cuello y los lados.
const AIRE_CARA = { arriba: 0.4, abajo: 0.2, lados: 0.15 };

// Caja que ocupa la cara entre los frames [desde, hasta) del video editado, o null si no se sabe.
export const caraEnSalida = (
  edicion: Edicion,
  tramos: Tramo[],
  fps: number,
  width: number,
  height: number,
  desde: number,
  hasta: number,
): Caja | null => {
  const { caras } = edicion;
  if (!caras || caras.cuadros.length === 0) return null;
  const enfoque = enfoqueEfectivo(edicion, width, height);
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  const frames: number[] = [];
  for (let f = desde; f < hasta; f += 3) frames.push(f);
  frames.push(Math.max(desde, hasta - 1));

  for (const f of frames) {
    const tramo = tramos.find((t) => f >= t.desdeFrame && f < t.desdeFrame + t.duracionFrames);
    if (!tramo) continue;
    const segundo = (tramo.trimBefore + f - tramo.desdeFrame) / fps;
    const i = Math.min(caras.cuadros.length - 1, Math.max(0, Math.round(segundo / caras.cada)));
    const c = caras.cuadros[i];
    if (!c) continue;
    const g = geometriaVideo({
      width,
      height,
      anchoOriginal: edicion.ancho,
      altoOriginal: edicion.alto,
      enfoqueX: enfoque.x,
      enfoqueY: enfoque.y,
      zoom:
        tramo.zoom *
        zoomDeEmpuje(tramo.empuje, tramo.trimBefore + f - tramo.desdeFrame, fps) *
        zoomEnfasisEn(segundo, edicion.enfasis),
    });
    const cx = g.left + c[0] * g.ancho;
    const cy = g.top + c[1] * g.alto;
    const cw = c[2] * g.ancho;
    const ch = c[3] * g.alto;
    x1 = Math.min(x1, cx - cw * AIRE_CARA.lados);
    x2 = Math.max(x2, cx + cw * (1 + AIRE_CARA.lados));
    y1 = Math.min(y1, cy - ch * AIRE_CARA.arriba);
    y2 = Math.max(y2, cy + ch * (1 + AIRE_CARA.abajo));
  }
  if (x1 === Infinity) return null;
  const x = Math.max(0, x1);
  const y = Math.max(0, y1);
  return { x, y, ancho: Math.min(width, x2) - x, alto: Math.min(height, y2) - y };
};

// Bordes donde no conviene poner textos (botones y textos de cada red social).
export const margenesSeguros = (width: number, height: number) => {
  const vertical = height / width > 1.5;
  return {
    arriba: height * (vertical ? 0.115 : 0.085),
    abajo: height * (vertical ? 0.2 : 0.085),
    lados: width * (width > height ? 0.052 : 0.083),
  };
};

// Media altura de la franja que ocupan los subtítulos.
export const mediaFranjaSubtitulos = (
  width: number,
  height: number,
  estilo: "palabra" | "frase" | "claves",
) => Math.min(width, height) * ({ palabra: 0.1, frase: 0.075, claves: 0.12 } as const)[estilo];

const seSolapan = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2;

// Espacio libre más grande que no toca la cara: arriba o abajo de ella en videos verticales y
// cuadrados, a la izquierda o a la derecha en horizontales. Sin cara, usa la zona de siempre.
export const elegirZona = (p: {
  width: number;
  height: number;
  cara: Caja | null;
  // Hasta dónde se puede bajar (por ejemplo, el borde de arriba de los subtítulos).
  limiteAbajo: number | null;
}): Zona => {
  const { width, height, cara } = p;
  const m = margenesSeguros(width, height);
  const aire = Math.min(width, height) * 0.03;
  const techo = m.arriba;
  const piso = Math.max(techo, p.limiteAbajo ?? height - m.abajo);
  const izq = m.lados;
  const der = width - m.lados;
  const horizontal = width > height;

  if (!cara) {
    return horizontal
      ? { x: izq, y: techo, ancho: width / 2 - izq, alto: piso - techo, lado: "izquierda" }
      : { x: izq, y: techo, ancho: der - izq, alto: piso - techo, lado: "libre" };
  }

  if (horizontal) {
    const finIzquierda = Math.min(der, cara.x - aire);
    const inicioDerecha = Math.max(izq, cara.x + cara.ancho + aire);
    const izquierda: Zona = {
      x: izq, y: techo, ancho: Math.max(0, finIzquierda - izq), alto: piso - techo, lado: "izquierda",
    };
    const derecha: Zona = {
      x: inicioDerecha, y: techo, ancho: Math.max(0, der - inicioDerecha), alto: piso - techo, lado: "derecha",
    };
    return izquierda.ancho >= derecha.ancho ? izquierda : derecha;
  }

  const finArriba = Math.min(piso, cara.y - aire);
  const inicioAbajo = Math.max(techo, cara.y + cara.alto + aire);
  const arriba: Zona = {
    x: izq, y: techo, ancho: der - izq, alto: Math.max(0, finArriba - techo), lado: "arriba",
  };
  const abajo: Zona = {
    x: izq, y: inicioAbajo, ancho: der - izq, alto: Math.max(0, piso - inicioAbajo), lado: "abajo",
  };
  return arriba.alto >= abajo.alto ? arriba : abajo;
};

// Altura aproximada que necesita cada elemento a tamaño completo.
export const ALTO_FILA_LISTA = 0.087;
export const ALTO_TITULO_LISTA = 0.11;
const altoNecesario = ({ elemento }: ElementoEnEditado, base: number) => {
  switch (elemento.tipo) {
    case "lista":
      return (
        base *
        ((elemento.titulo ? ALTO_TITULO_LISTA : 0) +
          elemento.puntos.length * ALTO_FILA_LISTA +
          (elemento.puntos.length - 1) * 0.022)
      );
    case "icono":
      return base * (0.2 + (elemento.texto ? 0.08 : 0));
    case "imagen":
      return base * 0.4;
    case "lettering":
      return base * 0.35;
    default:
      return 0;
  }
};

export type ElementoColocado = ElementoEnEditado & {
  zona: Zona;
  // true si los subtítulos se esconden mientras dura (no hay espacio para ambos).
  ocultaSubtitulos: boolean;
};

export const colocarElementos = (p: {
  items: ElementoEnEditado[];
  edicion: Edicion;
  width: number;
  height: number;
  caraEntre: (desde: number, hasta: number) => Caja | null;
}): ElementoColocado[] => {
  const { width, height, edicion } = p;
  const base = Math.min(width, height);
  const { opciones } = edicion;
  // Si el video trae sus propios subtítulos, los elementos tampoco los tapan.
  const topeSubtitulos = opciones.subtitulos
    ? opciones.posicionSubtitulos * height -
      mediaFranjaSubtitulos(width, height, opciones.estiloSubtitulos) -
      base * 0.03
    : edicion.subtitulosEnVideo
      ? edicion.subtitulosEnVideo.altura * height - base * 0.1
      : null;

  return p.items.map((item) => {
    const cara = p.caraEntre(item.desdeFrame, item.desdeFrame + item.duracionFrames);
    // El lettering ya oculta los subtítulos, así que puede usar toda la altura.
    const usaTodo = item.elemento.tipo === "lettering" || topeSubtitulos === null;
    let zona = elegirZona({ width, height, cara, limiteAbajo: usaTodo ? null : topeSubtitulos });
    let ocultaSubtitulos = item.elemento.tipo === "lettering";
    // Si no cabe entre la cara y los subtítulos, los subtítulos ceden su lugar (la cara nunca).
    if (!usaTodo && zona.alto < altoNecesario(item, base) * 0.8) {
      zona = elegirZona({ width, height, cara, limiteAbajo: null });
      ocultaSubtitulos = true;
    }
    return { ...item, zona, ocultaSubtitulos };
  });
};

// Centro vertical de los subtítulos para una página: el elegido en la edición, salvo que
// toque la cara; entonces se mueven debajo o encima de ella.
export const centroSubtitulos = (p: {
  preferido: number;
  media: number;
  cara: Caja | null;
  width: number;
  height: number;
}) => {
  const { preferido, media, cara, width, height } = p;
  if (!cara || !seSolapan(preferido - media, preferido + media, cara.y, cara.y + cara.alto)) {
    return preferido;
  }
  const m = margenesSeguros(width, height);
  const aire = Math.min(width, height) * 0.02;
  const debajo = cara.y + cara.alto + aire + media;
  if (debajo + media <= height - m.abajo * 0.6) return debajo;
  const encima = cara.y - aire - media;
  if (encima - media >= m.arriba) return encima;
  // La cara llena el cuadro: abajo del todo es lo que menos la tapa.
  return height - m.abajo * 0.6 - media;
};
