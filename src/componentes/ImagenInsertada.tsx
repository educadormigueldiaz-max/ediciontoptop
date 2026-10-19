import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { marca } from "../marca";

// Acepta rutas de public/ ("imagenes/foto.jpg") o direcciones completas (https://, data:).
const fuente = (archivo: string) => (/^(https?:|data:)/.test(archivo) ? archivo : staticFile(archivo));

// Imagen de apoyo: como tarjeta flotante arriba, o a pantalla completa con un zoom lento.
export const ImagenInsertada: React.FC<{
  archivo: string;
  modo: "tarjeta" | "pantalla-completa";
  texto: string | null;
  duracionFrames: number;
}> = ({ archivo, modo, texto, duracionFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const margen = Math.round(width * 0.083);

  const leyenda = texto ? (
    <div
      style={{
        padding: `${base * 0.012}px ${base * 0.028}px`,
        borderRadius: base * 0.018,
        backgroundColor: marca.colores.primario,
        color: marca.colores.texto,
        fontFamily: marca.fuente,
        fontWeight: 900,
        fontSize: base * 0.045,
        textAlign: "center",
        maxWidth: width - margen * 2,
      }}
    >
      {texto}
    </div>
  ) : null;

  if (modo === "pantalla-completa") {
    return (
      <AbsoluteFill
        style={{
          opacity: interpolate(frame, [0, 4, duracionFrames - 4, duracionFrames], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          backgroundColor: marca.colores.fondo,
        }}
      >
        <Img
          src={fuente(archivo)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: interpolate(frame, [0, duracionFrames], [1, 1.08]),
          }}
        />
        <AbsoluteFill style={{ alignItems: "center", paddingTop: height * 0.12 }}>
          {leyenda}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const entrada = spring({ frame, fps, config: { damping: 13 } });
  const salida = interpolate(frame, [duracionFrames - 7, duracionFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        paddingTop: height * 0.12,
        gap: base * 0.02,
        opacity: salida,
      }}
    >
      <Img
        src={fuente(archivo)}
        style={{
          maxWidth: width - margen * 2,
          maxHeight: height * (width > height ? 0.6 : 0.4),
          borderRadius: base * 0.03,
          border: `${base * 0.008}px solid ${marca.colores.texto}`,
          boxShadow: `0 ${base * 0.02}px ${base * 0.05}px rgba(0,0,0,0.45)`,
          scale: interpolate(entrada, [0, 1], [0.6, 1]),
          rotate: `${interpolate(entrada, [0, 1], [-6, -1.5])}deg`,
          opacity: entrada,
        }}
      />
      {leyenda}
    </AbsoluteFill>
  );
};
