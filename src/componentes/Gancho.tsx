import {
  AbsoluteFill,
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

// Frase llamativa de los primeros segundos (ver colocarGancho).
export const Gancho: React.FC<{
  texto: string;
  duracionFrames: number;
  cara?: Caja | null;
}> = ({ texto, duracionFrames, cara = null }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const entrada = spring({ frame, fps, config: { damping: 13, mass: 0.6 } });
  const { arriba, tamano, anchoMax, rellenoAlto, rellenoLados } = colocarGancho(
    { texto, width, height, cara },
  );

  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          marginTop: arriba,
          maxWidth: anchoMax,
          padding: `${rellenoAlto}px ${rellenoLados}px`,
          borderRadius: base * 0.03,
          backgroundColor: marca.colores.primario,
          boxShadow: `0 ${base * 0.015}px 0 ${marca.colores.contorno}`,
          color: marca.colores.texto,
          fontFamily: marca.fuente,
          fontWeight: 900,
          fontSize: tamano,
          lineHeight: INTERLINEA,
          textAlign: "center",
          textWrap: "balance",
          rotate: "-2deg",
          scale: entrada,
          opacity: interpolate(
            frame,
            [duracionFrames - 8, duracionFrames],
            [1, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          ),
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};
