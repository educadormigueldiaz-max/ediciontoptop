import { Video } from "@remotion/media";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { geometriaVideo, zoomEnfasisEn } from "../edicion/encuadre";
import type { Edicion } from "../edicion/esquema";

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
  const g = geometriaVideo({
    width,
    height,
    anchoOriginal,
    altoOriginal,
    enfoqueX,
    enfoqueY,
    zoom: zoom * zoomEnfasisEn(segundo, enfasis),
  });

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
          left: g.left,
          top: g.top,
          width: g.ancho,
          height: g.alto,
        }}
      />
    </AbsoluteFill>
  );
};
