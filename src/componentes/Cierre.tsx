import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { marca } from "../marca";

// Tarjeta final con la marca y una llamada a la acción.
export const Cierre: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const entrada = spring({ frame, fps, config: { damping: 15 } });
  const entradaTexto = spring({ frame: frame - 8, fps, config: { damping: 15 } });

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
      {marca.logo ? (
        <Img
          src={staticFile(marca.logo)}
          style={{ width: base * 0.45, objectFit: "contain", scale: entrada }}
        />
      ) : (
        <div style={{ fontSize: base * 0.11, fontWeight: 900, letterSpacing: "-0.03em", scale: entrada }}>
          {marca.nombre}
        </div>
      )}
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
      <div
        style={{
          fontSize: base * 0.055,
          fontWeight: 800,
          opacity: entradaTexto,
          translate: `0 ${interpolate(entradaTexto, [0, 1], [base * 0.03, 0])}px`,
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};
