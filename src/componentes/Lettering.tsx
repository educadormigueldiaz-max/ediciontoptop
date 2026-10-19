import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { elegirZona, type Zona } from "../edicion/encuadre";
import { marca } from "../marca";

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

// Ancho medio de una letra mayúscula de la fuente, en proporción a su tamaño.
const ANCHO_LETRA = 0.78;

// Tamaño de letra más grande con el que la frase cabe en el espacio disponible.
const tamanoQueCabe = (palabras: string[], ancho: number, alto: number, base: number) => {
  let tamano = base * 0.17;
  while (tamano > base * 0.05) {
    let lineas = 1;
    let actual = 0;
    for (const palabra of palabras) {
      const largo = palabra.length * ANCHO_LETRA * tamano;
      if (largo > ancho) {
        lineas = Infinity;
        break;
      }
      const conEspacio = actual === 0 ? largo : actual + 0.3 * tamano + largo;
      if (conEspacio <= ancho) {
        actual = conEspacio;
      } else {
        lineas++;
        actual = largo;
      }
    }
    if (lineas * tamano * 1.05 <= alto) return tamano;
    tamano *= 0.93;
  }
  return tamano;
};

// Frase grande: las palabras "caen" una tras otra.
// fondo "video": sobre el video, en el espacio libre que deja la cara (nunca la tapa).
// fondo "marca": tarjeta de color a pantalla completa (solo si se pide explícitamente).
export const Lettering: React.FC<{
  texto: string;
  destacar: string | null;
  fondo: "marca" | "video";
  duracionFrames: number;
  zona?: Zona;
}> = ({ texto, destacar, fondo, duracionFrames, zona: zonaDada }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const margen = Math.round(width * 0.083);
  const palabras = texto.trim().split(/\s+/);
  const destacadas = new Set((destacar ?? "").split(/\s+/).map(normalizar).filter(Boolean));

  const pantallaCompleta = fondo === "marca";
  const zona: Zona = pantallaCompleta
    ? { x: margen, y: margen, ancho: width - margen * 2, alto: height - margen * 2, lado: "libre" }
    : (zonaDada ?? elegirZona({ width, height, cara: null, limiteAbajo: null }));
  const tamano = tamanoQueCabe(palabras, zona.ancho, zona.alto, base);

  const visible = interpolate(frame, [0, 4, duracionFrames - 6, duracionFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: visible,
        background: pantallaCompleta
          ? `radial-gradient(circle at 50% 45%, ${marca.colores.primario}, ${marca.colores.fondo} 75%)`
          : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: zona.x,
          top: zona.y,
          width: zona.ancho,
          height: zona.alto,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          // Sombra suave detrás del texto para que se lea sobre cualquier imagen.
          background: pantallaCompleta
            ? undefined
            : `radial-gradient(ellipse at center, ${marca.colores.fondo}99 0%, transparent 70%)`,
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
            WebkitTextStroke: pantallaCompleta ? undefined : `${tamano * 0.09}px ${marca.colores.contorno}`,
            paintOrder: "stroke fill",
            textShadow: `0 ${tamano * 0.05}px ${tamano * 0.15}px rgba(0,0,0,0.45)`,
            scale: interpolate(frame, [0, duracionFrames], [1, 1.04]),
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
      </div>
    </AbsoluteFill>
  );
};
