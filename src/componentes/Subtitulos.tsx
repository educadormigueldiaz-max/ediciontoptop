import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { marca } from "../marca";

type Estilo = "palabra" | "frase";

// Cuánto tiempo de habla se agrupa en cada "página" de subtítulos.
const AGRUPAR_MS: Record<Estilo, number> = { palabra: 900, frase: 2200 };
// La página se queda un poco más en pantalla si no hay otra inmediatamente después.
const PERMANENCIA_MS = 300;

export const Subtitulos: React.FC<{
  captions: Caption[];
  estilo: Estilo;
  posicion: number;
}> = ({ captions, estilo, posicion }) => {
  const { fps } = useVideoConfig();
  const { pages } = useMemo(
    () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: AGRUPAR_MS[estilo] }),
    [captions, estilo],
  );

  return (
    <AbsoluteFill>
      {pages.map((page, i) => {
        const siguiente = pages[i + 1];
        const finMs = Math.min(
          siguiente ? siguiente.startMs : Infinity,
          page.startMs + page.durationMs + PERMANENCIA_MS,
        );
        const desde = Math.round((page.startMs / 1000) * fps);
        const hasta = Math.round((finMs / 1000) * fps);
        if (hasta <= desde) return null;
        return (
          <Sequence key={i} from={desde} durationInFrames={hasta - desde} name={page.text.trim()}>
            <Pagina page={page} estilo={estilo} posicion={posicion} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Pagina: React.FC<{ page: TikTokPage; estilo: Estilo; posicion: number }> = ({
  page,
  estilo,
  posicion,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ahoraMs = page.startMs + (frame / fps) * 1000;
  const base = Math.min(width, height);
  const tamano = base * (estilo === "palabra" ? 0.078 : 0.056);
  const margen = Math.round(width * 0.083);

  return (
    <div
      style={{
        position: "absolute",
        left: margen,
        right: margen,
        top: height * posicion,
        translate: "0 -50%",
        textAlign: "center",
        fontFamily: marca.fuente,
        fontWeight: 900,
        fontSize: tamano,
        lineHeight: 1.15,
        color: marca.colores.texto,
        textTransform: estilo === "palabra" ? "uppercase" : "none",
        whiteSpace: "pre-wrap",
        textWrap: "balance",
        // El contorno grueso "come" el espacio entre palabras; esto lo compensa.
        wordSpacing: "0.18em",
        WebkitTextStroke: `${tamano * 0.14}px ${marca.colores.contorno}`,
        paintOrder: "stroke fill",
        textShadow: `0 ${tamano * 0.06}px ${tamano * 0.18}px rgba(0,0,0,0.45)`,
        opacity: interpolate(frame, [0, 3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(frame, [0, 6], [0.82, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        }),
      }}
    >
      {page.tokens.map((token, i) => {
        const activa = token.fromMs <= ahoraMs && token.toMs > ahoraMs;
        const texto = token.text.trim();
        return (
          <span key={`${token.fromMs}-${i}`}>
            {i === 0 ? "" : " "}
            <span
              style={{
                display: "inline-block",
                color: activa ? marca.colores.acento : marca.colores.texto,
                scale: activa && estilo === "palabra" ? 1.08 : 1,
              }}
            >
              {texto}
            </span>
          </span>
        );
      })}
    </div>
  );
};
