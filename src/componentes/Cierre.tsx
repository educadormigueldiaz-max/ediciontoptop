import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useMarca } from "../edicion/estilos";

// Tarjeta final con una llamada a la acción (sin nombre ni logo de ByDzyne).
export const Cierre: React.FC<{ texto: string }> = ({ texto }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const entrada = spring({ frame, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        gap: base * 0.04,
        background: `radial-gradient(circle at 50% 40%, ${marca.colores.primario}, ${marca.colores.fondo} 70%)`,
        fontFamily: marca.fuente,
        color: marca.colores.texto,
        textAlign: "center",
        padding: width * 0.083,
      }}
    >
      <div
        style={{
          fontSize: base * 0.085,
          fontWeight: 900,
          lineHeight: 1.1,
          textWrap: "balance",
          opacity: entrada,
          scale: interpolate(entrada, [0, 1], [0.85, 1]),
        }}
      >
        {texto}
      </div>
      <div
        style={{
          width: interpolate(frame, [6, 20], [0, base * 0.25], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          height: base * 0.012,
          borderRadius: base * 0.01,
          backgroundColor: marca.colores.acento,
        }}
      />
    </AbsoluteFill>
  );
};
