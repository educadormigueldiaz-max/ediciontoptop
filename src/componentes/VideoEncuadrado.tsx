import { Video } from "@remotion/media";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { geometriaVideo, zoomEnfasisEn } from "../edicion/encuadre";
import type { Edicion } from "../edicion/esquema";
import { zoomDeEmpuje, type Tramo } from "../edicion/linea-de-tiempo";

// Retoque de color: un poco más de contraste y color, como un video grabado con buena luz.
const FILTRO_COLOR: Record<Edicion["opciones"]["color"], string | undefined> = {
  natural: "contrast(1.06) saturate(1.1)",
  vivo: "contrast(1.1) saturate(1.25) brightness(1.02)",
  ninguno: undefined,
};

// Muestra un tramo del video original llenando el formato de salida (recorta lo que sobra).
// Con `mascara`, muestra solo a la persona (sin fondo y sin sonido): la máscara de cada cuadro
// del original sale de `npm run recortar`; si un cuadro no tiene, no se muestra nada.
export const VideoEncuadrado: React.FC<{
  src: string;
  anchoOriginal: number;
  altoOriginal: number;
  trimBefore: number;
  duracionFrames: number;
  enfoqueX: number;
  enfoqueY: number;
  zoom: number;
  enfasis: Edicion["enfasis"];
  empuje?: Tramo["empuje"];
  color?: Edicion["opciones"]["color"];
  mascara?: (cuadroOriginal: number) => string | null;
  // Filtro extra (el color de un momento) que se suma al retoque de color.
  filtro?: string;
}> = ({
  src,
  anchoOriginal,
  altoOriginal,
  trimBefore,
  duracionFrames,
  enfoqueX,
  enfoqueY,
  zoom,
  enfasis,
  empuje = null,
  color = "ninguno",
  mascara,
  filtro,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Segundo del video original que se ve en este frame.
  const segundo = (trimBefore + frame) / fps;
  const g = geometriaVideo({
    width,
    height,
    anchoOriginal,
    altoOriginal,
    enfoqueX,
    enfoqueY,
    zoom: zoom * zoomDeEmpuje(empuje, trimBefore + frame, fps) * zoomEnfasisEn(segundo, enfasis),
  });
  const archivoMascara = mascara ? mascara(trimBefore + frame) : null;
  if (mascara && !archivoMascara) return null;
  const urlMascara = archivoMascara ? staticFile(archivoMascara) : null;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: urlMascara ? undefined : "black" }}>
      {urlMascara ? (
        // Se carga con <Img> para que el render espere a la máscara antes de tomar el cuadro.
        <Img src={urlMascara} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
      ) : null}
      <Video
        src={staticFile(src)}
        trimBefore={trimBefore}
        objectFit="fill"
        muted={urlMascara !== null}
        // Fundido de un frame en cada corte para que no se escuchen "clics".
        volume={(f) =>
          duracionFrames < 4
            ? 1
            : interpolate(f, [0, 1, duracionFrames - 1, duracionFrames], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
        }
        style={{
          position: "absolute",
          left: g.left,
          top: g.top,
          width: g.ancho,
          height: g.alto,
          filter: [FILTRO_COLOR[color], filtro].filter(Boolean).join(" ") || undefined,
          // Blanco = persona, negro = fondo.
          ...(urlMascara
            ? {
                maskImage: `url("${urlMascara}")`,
                maskSize: "100% 100%",
                // Sin repetir: si no, una franja del borde de abajo asoma arriba.
                maskRepeat: "no-repeat",
                maskMode: "luminance",
              }
            : {}),
        }}
      />
    </AbsoluteFill>
  );
};
