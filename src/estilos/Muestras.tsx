import type { Caption } from "@remotion/captions";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Gancho } from "../componentes/Gancho";
import { Subtitulos } from "../componentes/Subtitulos";
import { marca } from "../marca";

// Composiciones de prueba para ajustar la marca sin necesitar un video.

const FRASE_DE_MUESTRA =
  "Así se ven tus subtítulos con la marca de TopTop Lab. Cambia colores y fuente en src/marca.ts.";

const captionsDeMuestra = (msPorPalabra: number): Caption[] =>
  FRASE_DE_MUESTRA.split(" ").map((palabra, i) => ({
    text: (i === 0 ? "" : " ") + palabra,
    startMs: 600 + i * msPorPalabra,
    endMs: 600 + (i + 1) * msPorPalabra,
    timestampMs: null,
    confidence: null,
    pageBreakAfter: /[.!?]$/.test(palabra),
  }));

const FondoDeMuestra: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${interpolate(frame, [0, 300], [160, 220])}deg, ${marca.colores.fondo}, ${marca.colores.primario} 60%, ${marca.colores.secundario})`,
      }}
    />
  );
};

export const MuestraSubtitulos: React.FC<{ estilo: "palabra" | "frase" }> = ({ estilo }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <FondoDeMuestra />
      <Sequence durationInFrames={Math.round(2.5 * fps)} name="Gancho">
        <Gancho texto="Edita videos con IA" duracionFrames={Math.round(2.5 * fps)} />
      </Sequence>
      <Subtitulos captions={captionsDeMuestra(380)} estilo={estilo} posicion={0.7} />
    </AbsoluteFill>
  );
};
