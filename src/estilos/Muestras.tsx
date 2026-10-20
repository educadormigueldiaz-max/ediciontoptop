import type { Caption } from "@remotion/captions";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Gancho } from "../componentes/Gancho";
import { IconoAnimado } from "../componentes/IconoAnimado";
import { ImagenInsertada } from "../componentes/ImagenInsertada";
import { Lettering } from "../componentes/Lettering";
import { ListaAnimada } from "../componentes/ListaAnimada";
import { Subtitulos } from "../componentes/Subtitulos";
import { marca } from "../marca";

// Composiciones de prueba para ajustar la marca sin necesitar un video.

const FRASE_DE_MUESTRA =
  "Así se ven tus subtítulos. Cambia los colores y la fuente en src/marca.ts.";

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

// Imagen de ejemplo dibujada en SVG (en un video real se usa un archivo de public/imagenes).
const IMAGEN_DE_MUESTRA = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${marca.colores.secundario}"/><stop offset="1" stop-color="${marca.colores.primario}"/>
    </linearGradient></defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <circle cx="600" cy="360" r="170" fill="white" opacity="0.9"/>
    <text x="600" y="660" font-family="sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">Tu imagen aquí</text>
  </svg>`,
)}`;

// Los 4 estilos de la fase 2, uno tras otro.
export const MuestraElementos: React.FC = () => {
  const { fps } = useVideoConfig();
  const s = (segundos: number) => Math.round(segundos * fps);
  return (
    <AbsoluteFill>
      <FondoDeMuestra />
      <Sequence durationInFrames={s(4.5)} name="Lista">
        <ListaAnimada
          titulo="3 claves para tu video"
          puntos={[
            { texto: "Engancha en 3 segundos", desdeFrame: s(0.5) },
            { texto: "Una idea por video", desdeFrame: s(1.5) },
            { texto: "Cierra con una acción", desdeFrame: s(2.5) },
          ]}
          duracionFrames={s(4.5)}
        />
      </Sequence>
      <Sequence from={s(4.5)} durationInFrames={s(2)} name="Ícono">
        <IconoAnimado icono="dinero" texto="Ahorra" posicion="arriba-derecha" duracionFrames={s(2)} />
      </Sequence>
      <Sequence from={s(6.5)} durationInFrames={s(2.5)} name="Lettering">
        <Lettering texto="La idea gana espacio" destacar="espacio" fondo="color" duracionFrames={s(2.5)} />
      </Sequence>
      <Sequence from={s(9)} durationInFrames={s(3)} name="Imagen">
        <ImagenInsertada
          archivo={IMAGEN_DE_MUESTRA}
          modo="tarjeta"
          texto="Así se ve una imagen insertada"
          duracionFrames={s(3)}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
