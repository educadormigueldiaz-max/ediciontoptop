import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { marca } from "../marca";

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

// Frase grande a pantalla completa: las palabras "caen" una tras otra.
export const Lettering: React.FC<{
  texto: string;
  destacar: string | null;
  fondo: "marca" | "video";
  duracionFrames: number;
}> = ({ texto, destacar, fondo, duracionFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const margen = Math.round(width * 0.083);
  const palabras = texto.trim().split(/\s+/);
  const destacadas = new Set((destacar ?? "").split(/\s+/).map(normalizar).filter(Boolean));

  // Tamaño para que la palabra más larga quepa en una línea.
  const masLarga = Math.max(...palabras.map((p) => p.length));
  const tamano = Math.min(base * 0.17, (width - margen * 2) / (masLarga * 0.8));

  const visible = interpolate(frame, [0, 4, duracionFrames - 6, duracionFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: visible,
        background:
          fondo === "marca"
            ? `radial-gradient(circle at 50% 45%, ${marca.colores.primario}, ${marca.colores.fondo} 75%)`
            : `${marca.colores.fondo}C7`,
        justifyContent: "center",
        alignItems: "center",
        padding: margen,
      }}
    >
      <div
        style={{
          fontFamily: marca.fuente,
          fontWeight: 900,
          fontSize: tamano,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          textAlign: "center",
          textWrap: "balance",
          color: marca.colores.texto,
          scale: interpolate(frame, [0, duracionFrames], [1, 1.06]),
        }}
      >
        {palabras.map((palabra, i) => {
          const entrada = spring({ frame: frame - i * 3, fps, config: { damping: 12, mass: 0.6 } });
          const resaltada = destacadas.has(normalizar(palabra));
          return (
            <span key={i}>
              {i === 0 ? "" : " "}
              <span
                style={{
                  display: "inline-block",
                  color: resaltada ? marca.colores.acento : marca.colores.texto,
                  opacity: Math.min(1, entrada * 2),
                  scale: interpolate(entrada, [0, 1], [1.5, 1]),
                }}
              >
                {palabra}
              </span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
