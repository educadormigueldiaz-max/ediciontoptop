import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { marca } from "../marca";
import { buscarIcono } from "./iconos";

type Posicion = "arriba-derecha" | "arriba-izquierda" | "arriba" | "centro";

// Ícono que aparece con rebote, flota mientras está visible y se encoge al salir.
export const IconoAnimado: React.FC<{
  icono: string;
  texto: string | null;
  posicion: Posicion;
  duracionFrames: number;
}> = ({ icono, texto, posicion, duracionFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const margen = Math.round(width * 0.083);
  const Icono = buscarIcono(icono);
  if (!Icono) return null;

  const tamano = base * 0.19;
  const entrada = spring({ frame, fps, config: { damping: 9, mass: 0.7 } });
  const salida = interpolate(frame, [duracionFrames - 6, duracionFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flotar = Math.sin((frame / fps) * Math.PI * 1.2) * base * 0.008;

  const alineacion: React.CSSProperties =
    posicion === "centro"
      ? { justifyContent: "center", alignItems: "center" }
      : {
          justifyContent: "flex-start",
          paddingTop: height * 0.13,
          paddingLeft: margen,
          paddingRight: margen,
          alignItems:
            posicion === "arriba-derecha"
              ? "flex-end"
              : posicion === "arriba-izquierda"
                ? "flex-start"
                : "center",
        };

  return (
    <AbsoluteFill style={alineacion}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: base * 0.018,
          scale: entrada * salida,
          rotate: `${interpolate(entrada, [0, 1], [-25, 0])}deg`,
          translate: `0 ${flotar}px`,
        }}
      >
        <div
          style={{
            width: tamano,
            height: tamano,
            borderRadius: "50%",
            backgroundColor: marca.colores.primario,
            border: `${base * 0.007}px solid ${marca.colores.texto}`,
            boxShadow: `0 ${base * 0.012}px ${base * 0.03}px rgba(0,0,0,0.35)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Icono size={tamano * 0.52} color={marca.colores.texto} strokeWidth={2.4} />
        </div>
        {texto ? (
          <div
            style={{
              padding: `${base * 0.01}px ${base * 0.024}px`,
              borderRadius: base * 0.016,
              backgroundColor: marca.colores.acento,
              color: marca.colores.contorno,
              fontFamily: marca.fuente,
              fontWeight: 900,
              fontSize: base * 0.042,
              whiteSpace: "nowrap",
            }}
          >
            {texto}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
