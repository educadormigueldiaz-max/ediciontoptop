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
import { centroSubtitulos, mediaFranjaSubtitulos, type Caja } from "../edicion/encuadre";
import { marca } from "../marca";

type Estilo = "palabra" | "frase";

// Cuánto tiempo de habla se agrupa en cada "página" de subtítulos.
const AGRUPAR_MS: Record<Estilo, number> = { palabra: 900, frase: 2200 };
// La página se queda un poco más en pantalla si no hay otra inmediatamente después.
const PERMANENCIA_MS = 300;
// Si entre dos palabras pasa más que esto (por ejemplo, palabras quitadas), empieza otra página.
const CORTAR_EN_SILENCIO_MS = 500;

export const Subtitulos: React.FC<{
  captions: Caption[];
  estilo: Estilo;
  posicion: number;
  // Rangos de frames [desde, hasta) en los que no se muestran.
  ocultarEn?: ReadonlyArray<readonly [number, number]>;
  // Dónde está la cara entre dos frames, para no taparla.
  caraEntre?: (desde: number, hasta: number) => Caja | null;
}> = ({ captions, estilo, posicion, ocultarEn = [], caraEntre }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const media = mediaFranjaSubtitulos(width, height, estilo);
  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: AGRUPAR_MS[estilo],
        breakOnSilenceAfterMilliseconds: CORTAR_EN_SILENCIO_MS,
      }),
    [captions, estilo],
  );
  const oculto = ocultarEn.some(([desde, hasta]) => frame >= desde && frame < hasta);

  return (
    <AbsoluteFill style={{ opacity: oculto ? 0 : 1 }}>
      {pages.map((page, i) => {
        const siguiente = pages[i + 1];
        const finMs = Math.min(
          siguiente ? siguiente.startMs : Infinity,
          page.startMs + page.durationMs + PERMANENCIA_MS,
        );
        const desde = Math.round((page.startMs / 1000) * fps);
        const hasta = Math.round((finMs / 1000) * fps);
        if (hasta <= desde) return null;
        const centro = centroSubtitulos({
          preferido: posicion * height,
          media,
          cara: caraEntre?.(desde, hasta) ?? null,
          width,
          height,
        });
        return (
          <Sequence key={i} from={desde} durationInFrames={hasta - desde} name={page.text.trim()}>
            <Pagina page={page} estilo={estilo} centro={centro} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Pagina: React.FC<{ page: TikTokPage; estilo: Estilo; centro: number }> = ({
  page,
  estilo,
  centro,
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
        top: centro,
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
