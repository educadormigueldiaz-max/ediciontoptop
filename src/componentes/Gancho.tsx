import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { margenesSeguros, type Caja } from "../edicion/encuadre";
import { useMarca } from "../edicion/estilos";

// Ancho medio de una letra (mayúsculas y minúsculas) en proporción a su tamaño.
const ANCHO_LETRA = 0.62;
const INTERLINEA = 1.1;

// Cuántas líneas ocupa la frase con ese tamaño de letra.
const contarLineas = (palabras: string[], ancho: number, tamano: number) => {
  let lineas = 1;
  let actual = 0;
  for (const palabra of palabras) {
    const largo = palabra.length * ANCHO_LETRA * tamano;
    const conEspacio = actual === 0 ? largo : actual + 0.3 * tamano + largo;
    if (actual === 0 || conEspacio <= ancho) {
      actual = conEspacio;
    } else {
      lineas++;
      actual = largo;
    }
  }
  return lineas;
};

// Dónde va la tarjeta del gancho y con qué tamaño de letra. Si se sabe dónde está la cara, la
// frase se achica para caber encima de ella; si no cabe, va justo debajo (`debajo: true`: ahí
// estorbaría a los subtítulos, que se ocultan mientras dura). Nunca la tapa.
export const colocarGancho = (p: {
  texto: string;
  width: number;
  height: number;
  cara: Caja | null;
}) => {
  const { width, height, cara } = p;
  const base = Math.min(width, height);
  const seguros = margenesSeguros(width, height);
  const anchoMax = width - Math.round(width * 0.083) * 2;
  const rellenoAlto = base * 0.022;
  const rellenoLados = base * 0.04;
  const separacion = base * 0.035;
  const palabras = p.texto.trim().split(/\s+/);
  const altoTarjeta = (t: number) =>
    contarLineas(palabras, anchoMax - rellenoLados * 2, t) * t * INTERLINEA +
    rellenoAlto * 2;
  // Letra más grande (hasta la de siempre) con la que la tarjeta cabe en ese alto.
  const ajustar = (alto: number) => {
    let t = base * 0.072;
    while (t > base * 0.04 && altoTarjeta(t) > alto) t *= 0.93;
    return t;
  };
  const comun = { anchoMax, rellenoAlto, rellenoLados };
  if (!cara)
    return {
      ...comun,
      arriba: height * 0.12,
      tamano: base * 0.072,
      debajo: false,
    };
  const libreEncima = cara.y - separacion - seguros.arriba;
  const t = ajustar(libreEncima);
  if (t >= base * 0.05 && altoTarjeta(t) <= libreEncima) {
    const arriba = Math.max(
      seguros.arriba,
      Math.min(height * 0.12, cara.y - separacion - altoTarjeta(t)),
    );
    return { ...comun, arriba, tamano: t, debajo: false };
  }
  const arriba = cara.y + cara.alto + separacion;
  return {
    ...comun,
    arriba,
    tamano: ajustar(height - seguros.abajo - arriba),
    debajo: true,
  };
};

// Frase llamativa de los primeros segundos (ver colocarGancho): tarjeta oscura translúcida que
// entra suave y palabras que aparecen una tras otra, con una línea de color que se dibuja abajo.
export const Gancho: React.FC<{
  texto: string;
  duracionFrames: number;
  cara?: Caja | null;
}> = ({ texto, duracionFrames, cara = null }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const { arriba, tamano, anchoMax, rellenoAlto, rellenoLados } = colocarGancho(
    { texto, width, height, cara },
  );
  const entrada = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 14,
  });
  const salida = interpolate(
    frame,
    [duracionFrames - 8, duracionFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    },
  );
  const palabras = texto.trim().split(/\s+/);
  // Las palabras entran en el primer medio segundo, más juntas si la frase es larga.
  const paso = Math.min(
    3,
    Math.floor(fps * 0.5) / Math.max(1, palabras.length),
  );

  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          marginTop: arriba,
          maxWidth: anchoMax,
          padding: `${rellenoAlto}px ${rellenoLados}px`,
          borderRadius: base * 0.028,
          backgroundColor: "rgba(12, 12, 14, 0.62)",
          backdropFilter: `blur(${base * 0.012}px)`,
          border: `${Math.max(1, base * 0.0015)}px solid rgba(255, 255, 255, 0.14)`,
          boxShadow: `0 ${base * 0.02}px ${base * 0.06}px rgba(0, 0, 0, 0.35)`,
          color: marca.colores.texto,
          fontFamily: marca.fuente,
          fontWeight: 800,
          fontSize: tamano,
          opacity: entrada * (1 - salida),
          scale: interpolate(entrada, [0, 1], [0.94, 1]),
          translate: `0 ${interpolate(entrada, [0, 1], [base * 0.02, 0]) - salida * base * 0.02}px`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* El texto va en su propio bloque: con la línea de color (absoluta) en el mismo renglón,
            Chrome se cae al equilibrar las líneas. */}
        <div
          style={{
            lineHeight: INTERLINEA,
            letterSpacing: "-0.01em",
            textAlign: "center",
            textWrap: "balance",
          }}
        >
          {palabras.map((palabra, i) => {
            const aparece = spring({
              frame: frame - 3 - i * paso,
              fps,
              config: { damping: 200 },
              durationInFrames: 10,
            });
            return (
              <span key={i}>
                {i === 0 ? "" : " "}
                <span
                  style={{
                    display: "inline-block",
                    opacity: aparece,
                    translate: `0 ${(1 - aparece) * tamano * 0.35}px`,
                    filter: `blur(${(1 - aparece) * tamano * 0.08}px)`,
                  }}
                >
                  {palabra}
                </span>
              </span>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: Math.max(2, base * 0.006),
            width: `${interpolate(frame, [6, 22], [0, 100], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })}%`,
            backgroundColor: marca.colores.acento,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
