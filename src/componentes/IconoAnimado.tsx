import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { elegirZona, type Zona } from "../edicion/encuadre";
import { marca } from "../marca";
import { buscarIcono } from "./iconos";

type Posicion = "arriba-derecha" | "arriba-izquierda" | "arriba" | "centro";

// Ícono que aparece con rebote, flota mientras está visible y se encoge al salir.
// Se coloca dentro de `zona` (el espacio libre que deja la cara); `posicion` elige el costado.
export const IconoAnimado: React.FC<{
  icono: string;
  texto: string | null;
  posicion: Posicion;
  duracionFrames: number;
  zona?: Zona;
}> = ({ icono, texto, posicion, duracionFrames, zona: zonaDada }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const Icono = buscarIcono(icono);
  if (!Icono) return null;
  const zona = zonaDada ?? elegirZona({ width, height, cara: null, limiteAbajo: null });

  const tamano = base * 0.19;
  const altoCompleto = base * (0.2 + (texto ? 0.08 : 0));
  const escala = Math.max(0.5, Math.min(1, zona.alto / altoCompleto));
  const entrada = spring({ frame, fps, config: { damping: 9, mass: 0.7 } });
  const salida = interpolate(frame, [duracionFrames - 6, duracionFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flotar = Math.sin((frame / fps) * Math.PI * 1.2) * base * 0.008;

  const alinearX =
    posicion === "arriba-derecha" ? "flex-end" : posicion === "arriba-izquierda" ? "flex-start" : "center";
  const alinearY = posicion === "centro" || zona.lado === "abajo" ? "center" : "flex-start";

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: zona.x,
          top: zona.y,
          width: zona.ancho,
          height: zona.alto,
          display: "flex",
          justifyContent: alinearX,
          alignItems: alinearY,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: base * 0.018,
            scale: entrada * salida * escala,
            transformOrigin: alinearY === "center" ? "center" : "top center",
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
      </div>
    </AbsoluteFill>
  );
};
