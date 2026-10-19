import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { marca } from "../marca";

// Frase llamativa arriba del video durante los primeros segundos.
export const Gancho: React.FC<{ texto: string; duracionFrames: number }> = ({
  texto,
  duracionFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const entrada = spring({ frame, fps, config: { damping: 13, mass: 0.6 } });

  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          marginTop: height * 0.12,
          maxWidth: width - Math.round(width * 0.083) * 2,
          padding: `${base * 0.022}px ${base * 0.04}px`,
          borderRadius: base * 0.03,
          backgroundColor: marca.colores.primario,
          boxShadow: `0 ${base * 0.015}px 0 ${marca.colores.contorno}`,
          color: marca.colores.texto,
          fontFamily: marca.fuente,
          fontWeight: 900,
          fontSize: base * 0.072,
          lineHeight: 1.1,
          textAlign: "center",
          textWrap: "balance",
          rotate: "-2deg",
          scale: entrada,
          opacity: interpolate(frame, [duracionFrames - 8, duracionFrames], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};
