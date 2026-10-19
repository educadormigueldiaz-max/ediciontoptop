import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Edicion } from "../edicion/esquema";

// Tiempo que tarda en entrar y salir un acercamiento de énfasis.
const RAMPA_ENFASIS = 0.15;

// Muestra un tramo del video original llenando el formato de salida (recorta lo que sobra).
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
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Segundo del video original que se ve en este frame.
  const segundo = (trimBefore + frame) / fps;
  const zoomEnfasis = enfasis.reduce(
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

  const escala = Math.max(width / anchoOriginal, height / altoOriginal) * zoom * zoomEnfasis;
  const ancho = anchoOriginal * escala;
  const alto = altoOriginal * escala;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <Video
        src={staticFile(src)}
        trimBefore={trimBefore}
        objectFit="fill"
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
          left: (width - ancho) * enfoqueX,
          top: (height - alto) * enfoqueY,
          width: ancho,
          height: alto,
        }}
      />
    </AbsoluteFill>
  );
};
