import { createTikTokStyleCaptions, type TikTokPage } from "@remotion/captions";
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
import type { Subtitulo } from "../edicion/linea-de-tiempo";
import { useMarca } from "../edicion/estilos";

type Estilo = "palabra" | "frase" | "claves";

// Cuánto tiempo de habla se agrupa en cada "página" de subtítulos.
const AGRUPAR_MS: Record<Estilo, number> = { palabra: 900, frase: 2200, claves: 1200 };
// La página se queda un poco más en pantalla si no hay otra inmediatamente después.
// Las palabras clave van sueltas, así que se quedan más para que se alcancen a leer.
const PERMANENCIA_MS: Record<Estilo, number> = { palabra: 300, frase: 300, claves: 700 };
// Si entre dos palabras pasa más que esto (por ejemplo, palabras quitadas), empieza otra página.
const CORTAR_EN_SILENCIO_MS = 500;

export const Subtitulos: React.FC<{
  captions: Subtitulo[];
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
  // Momentos (ms) en que empieza una palabra que va con la segunda letra.
  const alternas = useMemo(
    () => new Set(captions.filter((c) => c.alterna).map((c) => c.startMs)),
    [captions],
  );
  const oculto = ocultarEn.some(([desde, hasta]) => frame >= desde && frame < hasta);

  return (
    <AbsoluteFill style={{ opacity: oculto ? 0 : 1 }}>
      {pages.map((page, i) => {
        const siguiente = pages[i + 1];
        const finMs = Math.min(
          siguiente ? siguiente.startMs : Infinity,
          // Con palabras sueltas la página dura hasta la siguiente clave; se corta al terminar la última.
          (estilo === "claves" ? page.tokens[page.tokens.length - 1].toMs : page.startMs + page.durationMs) +
            PERMANENCIA_MS[estilo],
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
            <Pagina
              page={page}
              estilo={estilo}
              centro={centro}
              alterna={page.tokens.some((t) => alternas.has(t.fromMs))}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Pagina: React.FC<{ page: TikTokPage; estilo: Estilo; centro: number; alterna: boolean }> = ({
  page,
  estilo,
  centro,
  alterna,
}) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ahoraMs = page.startMs + (frame / fps) * 1000;
  const base = Math.min(width, height);
  const tamano =
    base * ({ palabra: 0.078, frase: 0.056, claves: 0.1 } as const)[estilo] * (alterna ? 1.15 : 1);
  const mayusculas = estilo !== "frase" && !alterna;
  const margen = Math.round(width * 0.083);
  // La palabra pintada es la última que empezó: el color pasa a la siguiente y nunca vuelve a
  // blanco (ni en las pausas entre palabras ni mientras la página se queda al final).
  const activa = page.tokens.filter((t) => t.fromMs <= ahoraMs).length - 1;

  return (
    <div
      style={{
        position: "absolute",
        left: margen,
        right: margen,
        top: centro,
        textAlign: "center",
        fontFamily: alterna ? marca.fuenteAlterna : marca.fuente,
        fontStyle: alterna ? "italic" : "normal",
        fontWeight: 900,
        fontSize: tamano,
        lineHeight: 1.15,
        color: marca.colores.texto,
        textTransform: mayusculas ? "uppercase" : "none",
        whiteSpace: "pre-wrap",
        textWrap: "balance",
        // El contorno grueso "come" el espacio entre palabras; esto lo compensa.
        wordSpacing: "0.18em",
        // Contorno fino y sombra suave: se lee sobre cualquier fondo sin verse "de caricatura".
        // La letra alterna es más fina: con menos contorno se ve más elegante.
        WebkitTextStroke: `${tamano * (alterna ? 0.06 : 0.09)}px ${marca.colores.contorno}`,
        paintOrder: "stroke fill",
        textShadow: `0 ${tamano * 0.05}px ${tamano * 0.25}px rgba(0,0,0,0.55)`,
        opacity: interpolate(frame, [0, 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        // Entra subiendo apenas, sin rebote.
        translate: `0 calc(-50% + ${interpolate(frame, [0, 6], [tamano * 0.18, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}px)`,
      }}
    >
      {page.tokens.map((token, i) => {
        const texto = token.text.trim();
        return (
          <span key={`${token.fromMs}-${i}`}>
            {i === 0 ? "" : " "}
            <span
              style={{
                display: "inline-block",
                color: i === activa ? marca.colores.acento : marca.colores.texto,
                scale: i === activa && estilo !== "frase" ? 1.05 : 1,
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
