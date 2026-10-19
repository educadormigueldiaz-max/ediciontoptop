import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { marca } from "../marca";

// Motion explicativo: un título y puntos numerados que aparecen al ritmo de lo que se dice.
export const ListaAnimada: React.FC<{
  titulo: string | null;
  puntos: { texto: string; desdeFrame: number }[];
  duracionFrames: number;
}> = ({ titulo, puntos, duracionFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const horizontal = width > height;
  const margen = Math.round(width * 0.083);
  const salida = interpolate(frame, [duracionFrames - 8, duracionFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entradaTitulo = spring({ frame, fps, config: { damping: 14 } });
  // El punto más reciente que ya apareció se resalta.
  const actual = puntos.reduce((ultimo, p, i) => (frame >= p.desdeFrame ? i : ultimo), -1);

  return (
    <AbsoluteFill
      style={{
        paddingTop: height * (horizontal ? 0.1 : 0.12),
        paddingLeft: margen,
        paddingRight: horizontal ? width * 0.5 : margen,
        flexDirection: "column",
        alignItems: "flex-start",
        gap: base * 0.022,
        fontFamily: marca.fuente,
        opacity: salida,
        translate: `0 ${interpolate(salida, [0, 1], [-base * 0.03, 0])}px`,
      }}
    >
      {titulo ? (
        <div
          style={{
            padding: `${base * 0.016}px ${base * 0.032}px`,
            borderRadius: base * 0.022,
            backgroundColor: marca.colores.primario,
            color: marca.colores.texto,
            fontWeight: 900,
            fontSize: base * 0.058,
            lineHeight: 1.1,
            marginBottom: base * 0.01,
            boxShadow: `0 ${base * 0.012}px 0 ${marca.colores.contorno}`,
            scale: entradaTitulo,
            transformOrigin: "left center",
          }}
        >
          {titulo}
        </div>
      ) : null}
      {puntos.map((punto, i) => {
        const local = frame - punto.desdeFrame;
        if (local < 0) return null;
        const entrada = spring({ frame: local, fps, config: { damping: 15, mass: 0.7 } });
        const esActual = i === actual;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: base * 0.022,
              maxWidth: "100%",
              opacity: entrada,
              translate: `${interpolate(entrada, [0, 1], [-base * 0.06, 0])}px 0`,
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: base * 0.085,
                height: base * 0.085,
                borderRadius: "50%",
                backgroundColor: marca.colores.acento,
                color: marca.colores.contorno,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: 900,
                fontSize: base * 0.048,
                scale: spring({ frame: local - 2, fps, config: { damping: 9 } }),
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                padding: `${base * 0.016}px ${base * 0.026}px`,
                borderRadius: base * 0.02,
                backgroundColor: `${marca.colores.fondo}E6`,
                border: `${base * 0.004}px solid ${esActual ? marca.colores.acento : "transparent"}`,
                color: marca.colores.texto,
                fontWeight: 800,
                fontSize: base * 0.048,
                lineHeight: 1.15,
                opacity: esActual ? 1 : 0.8,
              }}
            >
              {punto.texto}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
