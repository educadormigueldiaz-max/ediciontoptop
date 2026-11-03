import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { elegirZona, type Zona } from "../edicion/encuadre";
import { useMarca } from "../edicion/estilos";

export const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

// Ancho medio de una letra mayúscula de la fuente, en proporción a su tamaño.
const ANCHO_LETRA = 0.78;

// Tamaño de letra más grande con el que la frase cabe en el espacio disponible.
// Formas en que llegan las palabras de un lettering.
const ANIMACIONES = ["golpe", "sube", "cae", "gira", "maquina", "enfoque"] as const;
type Animacion = (typeof ANIMACIONES)[number];
const CONFIG: Record<Animacion, { damping: number; mass?: number; stiffness?: number }> = {
  golpe: { damping: 12, mass: 0.6 },
  sube: { damping: 14, mass: 0.7 },
  cae: { damping: 10, mass: 0.8, stiffness: 160 },
  gira: { damping: 15 },
  maquina: { damping: 200 },
  enfoque: { damping: 200 },
};
const entradaPalabra = (animacion: Animacion, p: number, tamano: number): React.CSSProperties => {
  const visible = Math.min(1, Math.max(0, p));
  switch (animacion) {
    case "golpe":
      return { opacity: Math.min(1, p * 2), scale: `${interpolate(p, [0, 1], [1.5, 1])}` };
    case "sube":
      return { opacity: visible, translate: `0 ${(1 - p) * tamano * 0.8}px` };
    case "cae":
      return { opacity: visible, translate: `0 ${(1 - p) * -tamano * 1.2}px`, rotate: `${(1 - p) * -8}deg` };
    case "gira":
      return { opacity: visible, transform: `perspective(${tamano * 6}px) rotateY(${(1 - p) * 90}deg)` };
    case "enfoque":
      return {
        opacity: visible,
        scale: `${interpolate(p, [0, 1], [0.85, 1])}`,
        filter: p < 0.99 ? `blur(${(1 - visible) * tamano * 0.25}px)` : undefined,
        letterSpacing: `${(1 - visible) * 0.3}em`,
      };
    case "maquina":
      return {};
  }
};

export const tamanoQueCabe = (
  palabras: string[],
  ancho: number,
  alto: number,
  base: number,
  maximo = 0.17,
) => {
  let tamano = base * maximo;
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
// fondo "color": tarjeta de color a pantalla completa (solo si se pide explícitamente).
export const Lettering: React.FC<{
  texto: string;
  destacar: string | null;
  fondo: "color" | "video";
  duracionFrames: number;
  zona?: Zona;
}> = ({ texto, destacar, fondo, duracionFrames, zona: zonaDada }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const margen = Math.round(width * 0.083);
  const palabras = texto.trim().split(/\s+/);
  const destacadas = new Set((destacar ?? "").split(/\s+/).map(normalizar).filter(Boolean));

  const pantallaCompleta = fondo === "color";
  const zona: Zona = pantallaCompleta
    ? { x: margen, y: margen, ancho: width - margen * 2, alto: height - margen * 2, lado: "libre" }
    : (zonaDada ?? elegirZona({ width, height, cara: null, limiteAbajo: null }));
  const tamano = tamanoQueCabe(palabras, zona.ancho, zona.alto, base);

  // Cómo llegan las palabras: cambia de un lettering a otro (según su texto), para que no se repita.
  const animacion = ANIMACIONES[Math.floor(random(`lettering-${texto}`) * ANIMACIONES.length)];
  const letras = palabras.join(" ").length;

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
            const resaltada = destacadas.has(normalizar(palabra));
            const color = resaltada ? marca.colores.acento : marca.colores.texto;
            if (animacion === "maquina") {
              // Letra por letra, como si se escribiera (todo el texto en unos 0,8 s).
              const antes = palabras.slice(0, i).join(" ").length + (i ? 1 : 0);
              const cada = Math.max(0.6, Math.min(2, 24 / letras));
              const hechas = Math.max(0, Math.floor(frame / cada) - antes);
              return (
                <span key={i}>
                  {i === 0 ? "" : " "}
                  <span style={{ display: "inline-block", color }}>
                    {[...palabra].map((l, k) => (
                      <span key={k} style={{ opacity: k < hechas ? 1 : 0 }}>{l}</span>
                    ))}
                  </span>
                </span>
              );
            }
            const entrada = spring({ frame: frame - i * 3, fps, config: CONFIG[animacion] });
            return (
              <span key={i}>
                {i === 0 ? "" : " "}
                <span style={{ display: "inline-block", color, ...entradaPalabra(animacion, entrada, tamano) }}>
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
