import { Video } from "@remotion/media";
import { getLength, getPointAtLength } from "@remotion/paths";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { createContext, useContext } from "react";
import { margenesSeguros } from "../edicion/encuadre";
import type { ElementoApoyo } from "../edicion/esquema";
import { useMarca } from "../edicion/estilos";
import { elegirVariantes, VARIANTE_BASE, type Entrada, type FondoEscena, type Variante } from "../edicion/variantes";
import type { ElementoEnEditado } from "../edicion/linea-de-tiempo";
import type { Marca } from "../marca";
import { buscarIcono } from "./iconos";
import { EscenaIlustrada } from "./EscenaIlustrada";
import { continuidadEscenarios, EscenarioAnimado, type Continuidad } from "./Escenario";
import { fuenteImagen } from "./ImagenInsertada";
import { normalizar, tamanoQueCabe } from "./Lettering";

const LIMITE = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type ApoyoEnEditado = ElementoEnEditado & { elemento: ElementoApoyo };

export const esApoyo = (item: ElementoEnEditado): item is ApoyoEnEditado =>
  item.elemento.tipo === "apoyo";

type Area = { x: number; y: number; ancho: number; alto: number };

// Una capa a `z` píxeles de profundidad (negativo = más lejos). Se agranda lo que la perspectiva
// la achica, así cada capa llena lo mismo pero se mueve distinto cuando gira la cámara.
const Capa: React.FC<{
  z: number;
  perspectiva: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ z, perspectiva, children, style }) => (
  <AbsoluteFill
    style={{
      transform: `translateZ(${z}px) scale(${(perspectiva - z) / perspectiva})`,
      transformStyle: "preserve-3d",
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

// Fondo en capas: degradado de los colores del estilo, anillos y puntos lejanos, manchas de luz
// y partículas cercanas. La cámara gira despacio y cada capa se mueve a su ritmo (paralaje).
// `frame` es el reloj del movimiento; `semilla` cambia el dibujo de una escena a otra.
export const FondoEnCapas: React.FC<{
  frame: number;
  semilla: string;
  tipo?: FondoEscena;
  children?: React.ReactNode;
}> = ({ frame, semilla, tipo = "capas", children }) => {
  const marca = useMarca();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const perspectiva = Math.max(width, height) * 1.4;
  const t = frame / fps;
  const giroY = Math.sin(t * 0.35 + random(`${semilla}-gy`) * 6) * 6;
  const giroX = 4 + Math.sin(t * 0.27 + random(`${semilla}-gx`) * 6) * 3;
  const luzX = 50 + Math.sin(t * 0.3 + random(`${semilla}-lx`) * 6) * 22;
  const luzY = 32 + Math.cos(t * 0.24) * 10;

  return (
    <AbsoluteFill
      style={{ backgroundColor: marca.colores.fondo, overflow: "hidden" }}
    >
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(circle at ${luzX}% ${luzY}%, ${marca.colores.primario}cc 0%, transparent 55%),` +
            `radial-gradient(circle at ${100 - luzX}% ${100 - luzY * 0.6}%, ${marca.colores.secundario}55 0%, transparent 50%)`,
        }}
      />
      <AbsoluteFill style={{ perspective: perspectiva }}>
        <AbsoluteFill
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${giroX}deg) rotateY(${giroY}deg)`,
          }}
        >
{tipo === "capas" ? (
            <>
          {/* Lejos: anillos que giran y una trama de puntos. */}
          <Capa z={-900} perspectiva={perspectiva}>
            <AbsoluteFill
              style={{
                backgroundImage: `radial-gradient(${marca.colores.texto}26 ${base * 0.0028}px, transparent ${base * 0.0034}px)`,
                backgroundSize: `${base * 0.05}px ${base * 0.05}px`,
                maskImage:
                  "radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)",
              }}
            />
            {[0.55, 0.8, 1.05].map((r, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: width / 2 - (base * r) / 2,
                  top: height * 0.42 - (base * r) / 2,
                  width: base * r,
                  height: base * r,
                  borderRadius: "50%",
                  border: `${base * 0.003}px ${i === 1 ? "dashed" : "solid"} ${marca.colores.secundario}${i === 1 ? "40" : "26"}`,
                  rotate: `${t * (i % 2 ? -8 : 6)}deg`,
                }}
              />
            ))}
          </Capa>
          {/* Medio: manchas de luz borrosas que flotan. */}
          <Capa z={-400} perspectiva={perspectiva}>
            {[0, 1, 2].map((i) => {
              const tam = base * (0.35 + random(`${semilla}-m${i}`) * 0.3);
              const x = random(`${semilla}-mx${i}`) * width;
              const y = random(`${semilla}-my${i}`) * height;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x - tam / 2 + Math.sin(t * 0.4 + i * 2) * base * 0.05,
                    top: y - tam / 2 + Math.cos(t * 0.33 + i) * base * 0.05,
                    width: tam,
                    height: tam,
                    borderRadius: "50%",
                    background:
                      i === 1
                        ? marca.colores.secundario
                        : marca.colores.primario,
                    opacity: 0.22,
                    filter: `blur(${base * 0.06}px)`,
                  }}
                />
              );
            })}
          </Capa>
            </>
          ) : (
            <FondoDistinto tipo={tipo} t={t} semilla={semilla} perspectiva={perspectiva} />
          )}
          {children}
          {/* Cerca: partículas que suben despacio. */}
          <Capa z={200} perspectiva={perspectiva}>
            {Array.from({ length: 16 }, (_, i) => {
              const tam = base * (0.004 + random(`${semilla}-p${i}`) * 0.008);
              const x = random(`${semilla}-px${i}`) * width;
              const recorrido = height * 1.2;
              const y =
                ((((random(`${semilla}-py${i}`) * recorrido -
                  t * base * (0.02 + random(`${semilla}-pv${i}`) * 0.04)) %
                  recorrido) +
                  recorrido) %
                  recorrido) -
                height * 0.1;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    width: tam,
                    height: tam,
                    borderRadius: "50%",
                    background:
                      i % 3 === 0 ? marca.colores.acento : marca.colores.texto,
                    opacity: 0.35 + random(`${semilla}-po${i}`) * 0.4,
                  }}
                />
              );
            })}
          </Capa>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Los otros fondos (el de capas está en FondoEnCapas). Todos usan los colores del estilo y se mueven
// despacio, para que el texto encima se lea.
const FondoDistinto: React.FC<{
  tipo: Exclude<FondoEscena, "capas">;
  t: number;
  semilla: string;
  perspectiva: number;
}> = ({ tipo, t, semilla, perspectiva }) => {
  const marca = useMarca();
  const { width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const { primario, secundario, acento, texto } = marca.colores;
  switch (tipo) {
    case "rejilla":
      // Piso de cuadrícula en perspectiva que avanza hacia la cámara, con un horizonte de luz.
      return (
        <Capa z={-300} perspectiva={perspectiva}>
          <AbsoluteFill style={{ background: `linear-gradient(transparent 38%, ${secundario}55 50%, transparent 62%)` }} />
          <div
            style={{
              position: "absolute",
              left: -width,
              width: width * 3,
              top: height * 0.5,
              height: height * 1.4,
              transformOrigin: "50% 0",
              transform: "rotateX(72deg)",
              backgroundImage: `linear-gradient(${texto}38 ${base * 0.003}px, transparent ${base * 0.003}px), linear-gradient(90deg, ${texto}38 ${base * 0.003}px, transparent ${base * 0.003}px)`,
              backgroundSize: `${base * 0.12}px ${base * 0.12}px`,
              backgroundPosition: `0 ${(t * base * 0.1) % (base * 0.12)}px`,
              maskImage: "linear-gradient(transparent, black 25%, black 70%, transparent)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -width,
              width: width * 3,
              bottom: height * 0.5,
              height: height * 1.4,
              transformOrigin: "50% 100%",
              transform: "rotateX(-72deg)",
              backgroundImage: `linear-gradient(${texto}1c ${base * 0.003}px, transparent ${base * 0.003}px), linear-gradient(90deg, ${texto}1c ${base * 0.003}px, transparent ${base * 0.003}px)`,
              backgroundSize: `${base * 0.12}px ${base * 0.12}px`,
              backgroundPosition: `0 ${-(t * base * 0.1) % (base * 0.12)}px`,
              maskImage: "linear-gradient(transparent, black 30%, black 75%, transparent)",
            }}
          />
        </Capa>
      );
    case "rayos":
      // Rayos de luz que giran detrás, desde el centro.
      return (
        <Capa z={-700} perspectiva={perspectiva}>
          <AbsoluteFill
            style={{
              background: `repeating-conic-gradient(from ${t * 8}deg at 50% 45%, ${primario}55 0deg 9deg, transparent 9deg 22.5deg)`,
              maskImage: "radial-gradient(circle at 50% 45%, black 10%, transparent 70%)",
              scale: 1.6,
            }}
          />
          <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${acento}40, transparent 35%)` }} />
        </Capa>
      );
    case "bokeh":
      // Luces grandes y borrosas de varios colores que flotan.
      return (
        <Capa z={-500} perspectiva={perspectiva}>
          {Array.from({ length: 9 }, (_, i) => {
            const tam = base * (0.12 + random(`${semilla}-b${i}`) * 0.32);
            const x = random(`${semilla}-bx${i}`) * width;
            const y = random(`${semilla}-by${i}`) * height;
            const color = [primario, secundario, acento][i % 3];
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x - tam / 2 + Math.sin(t * 0.5 + i) * base * 0.06,
                  top: y - tam / 2 + Math.cos(t * 0.4 + i * 1.7) * base * 0.06,
                  width: tam,
                  height: tam,
                  borderRadius: "50%",
                  background: color,
                  opacity: 0.18 + random(`${semilla}-bo${i}`) * 0.22,
                  filter: `blur(${base * (0.015 + random(`${semilla}-bb${i}`) * 0.05)}px)`,
                }}
              />
            );
          })}
        </Capa>
      );
    case "franjas":
      // Franjas diagonales que se deslizan y una luz grande que cruza.
      return (
        <Capa z={-600} perspectiva={perspectiva}>
          <AbsoluteFill
            style={{
              backgroundImage: `repeating-linear-gradient(-35deg, ${texto}12 0 ${base * 0.03}px, transparent ${base * 0.03}px ${base * 0.09}px)`,
              backgroundPosition: `${t * base * 0.05}px 0`,
              maskImage: "linear-gradient(100deg, transparent, black 30%, black 70%, transparent)",
              scale: 1.4,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: width * (0.5 + Math.sin(t * 0.3) * 0.35) - base * 0.4,
              top: height * 0.35 - base * 0.4,
              width: base * 0.8,
              height: base * 0.8,
              borderRadius: "50%",
              background: secundario,
              opacity: 0.25,
              filter: `blur(${base * 0.09}px)`,
            }}
          />
        </Capa>
      );
    case "formas": {
      // Figuras de línea (círculos, cuadrados, triángulos y cruces) que flotan y giran.
      const figuras = ["circulo", "cuadro", "triangulo", "cruz"] as const;
      return (
        <Capa z={-450} perspectiva={perspectiva}>
          {Array.from({ length: 12 }, (_, i) => {
            const forma = figuras[Math.floor(random(`${semilla}-ff${i}`) * figuras.length)];
            const tam = base * (0.04 + random(`${semilla}-fs${i}`) * 0.08);
            const x = random(`${semilla}-fx${i}`) * width;
            const y = ((random(`${semilla}-fy${i}`) * height * 1.2 - t * base * 0.03 * (1 + (i % 3))) % (height * 1.2) + height * 1.2) % (height * 1.2) - height * 0.1;
            const color = [primario, secundario, acento, texto][i % 4];
            const trazo = base * 0.005;
            return (
              <svg
                key={i}
                width={tam}
                height={tam}
                viewBox="0 0 10 10"
                style={{ position: "absolute", left: x, top: y, rotate: `${t * (20 + i * 7) * (i % 2 ? -1 : 1)}deg`, opacity: 0.5, overflow: "visible" }}
              >
                {forma === "circulo" ? <circle cx="5" cy="5" r="4" fill="none" stroke={color} strokeWidth={(trazo / tam) * 10} /> : null}
                {forma === "cuadro" ? <rect x="1" y="1" width="8" height="8" rx="1" fill="none" stroke={color} strokeWidth={(trazo / tam) * 10} /> : null}
                {forma === "triangulo" ? <path d="M5 1 L9 9 L1 9 Z" fill="none" stroke={color} strokeWidth={(trazo / tam) * 10} strokeLinejoin="round" /> : null}
                {forma === "cruz" ? <path d="M5 1 V9 M1 5 H9" stroke={color} strokeWidth={(trazo / tam) * 14} strokeLinecap="round" /> : null}
              </svg>
            );
          })}
        </Capa>
      );
    }
  }
};

// Entrada de cada pieza: llega desde atrás (profundidad), sin rebote.
// La variante de la escena en curso (la pone Escena para todo lo que va adentro).
const VarianteEscena = createContext<Variante>(VARIANTE_BASE);
const useVariante = () => useContext(VarianteEscena);
const REBOTA: ReadonlySet<Entrada> = new Set(["abajo", "escala"]);

// Según la variante, las piezas llegan suaves o con un pequeño rebote.
const useEntrada = (desde: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { entrada } = useVariante();
  return REBOTA.has(entrada)
    ? spring({ frame: frame - desde, fps, config: { damping: 13, mass: 0.7 } })
    : spring({
        frame: frame - desde,
        fps,
        config: { damping: 200 },
        durationInFrames: 18,
      });
};

const entradaDesdeAtras = (p: number, base: number): React.CSSProperties => ({
  opacity: p,
  transform: `translateZ(${interpolate(p, [0, 1], [-base * 0.5, 0])}px) translateY(${interpolate(p, [0, 1], [base * 0.04, 0])}px)`,
  filter: p < 0.99 ? `blur(${(1 - p) * base * 0.012}px)` : undefined,
});

// Cómo llega una pieza (tarjeta, cifra, texto) según la entrada de la escena. `p` va de 0 a 1.
const moverEntrada = (p: number, base: number, entrada: Entrada): React.CSSProperties => {
  const visible = Math.min(1, Math.max(0, p));
  switch (entrada) {
    case "atras":
      return entradaDesdeAtras(p, base);
    case "abajo":
      return { opacity: visible, transform: `translateY(${(1 - p) * base * 0.14}px)` };
    case "escala":
      return { opacity: Math.min(1, visible * 2), transform: `scale(${interpolate(p, [0, 1], [0.35, 1])})` };
    case "lado":
      return {
        opacity: visible,
        transform: `translateX(${(1 - p) * -base * 0.3}px) skewX(${(1 - p) * 12}deg)`,
        filter: p < 0.99 ? `blur(${(1 - visible) * base * 0.008}px)` : undefined,
      };
    case "giro":
      return { opacity: visible, transform: `perspective(${base * 2}px) rotateX(${(1 - p) * -75}deg)`, transformOrigin: "50% 100%" };
  }
};
const useMover = () => {
  const { entrada } = useVariante();
  return (p: number, base: number) => moverEntrada(p, base, entrada);
};

// Título en mayúsculas: las palabras aparecen una tras otra.
const Titulo: React.FC<{
  texto: string;
  destacar: string | null;
  ancho: number;
  alto: number;
  desde: number;
  maximo?: number;
}> = ({ texto, destacar, ancho, alto, desde, maximo = 0.13 }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const palabras = texto.trim().split(/\s+/);
  const destacadas = new Set(
    (destacar ?? "").split(/\s+/).map(normalizar).filter(Boolean),
  );
  const tamano = tamanoQueCabe(palabras, ancho, alto, base, maximo);
  const { entrada } = useVariante();
  // Cada palabra llega según la entrada de la escena.
  const palabraEntra = (p: number): React.CSSProperties => {
    const visible = Math.min(1, Math.max(0, p));
    switch (entrada) {
      case "escala":
        return { opacity: visible, scale: `${interpolate(p, [0, 1], [0.2, 1])}` };
      case "lado":
        return { opacity: visible, translate: `${interpolate(p, [0, 1], [-tamano * 0.6, 0])}px 0` };
      case "giro":
        return { opacity: visible, transform: `perspective(${tamano * 6}px) rotateX(${(1 - p) * 90}deg)`, transformOrigin: "50% 100%" };
      case "abajo":
        return { opacity: visible, translate: `0 ${interpolate(p, [0, 1], [tamano * 0.6, 0])}px` };
      case "atras":
        return {
          opacity: visible,
          translate: `0 ${interpolate(p, [0, 1], [tamano * 0.35, 0])}px`,
          filter: p < 0.99 ? `blur(${(1 - visible) * tamano * 0.08}px)` : undefined,
        };
    }
  };
  return (
    <div
      style={{
        fontFamily: marca.fuente,
        fontWeight: 900,
        fontSize: tamano,
        lineHeight: 1.04,
        letterSpacing: "-0.01em",
        textTransform: "uppercase",
        textAlign: "center",
        color: marca.colores.texto,
        textShadow: `0 ${tamano * 0.06}px ${tamano * 0.25}px rgba(0,0,0,0.45)`,
        maxWidth: ancho,
      }}
    >
      <div style={{ textWrap: "balance" }}>
        {palabras.map((palabra, i) => {
          const p = REBOTA.has(entrada)
            ? spring({ frame: frame - desde - i * 3, fps, config: { damping: 11, mass: 0.6 } })
            : spring({
                frame: frame - desde - i * 3,
                fps,
                config: { damping: 200 },
                durationInFrames: 14,
              });
          return (
            <span key={i}>
              {i === 0 ? "" : " "}
              <span
                style={{
                  display: "inline-block",
                  ...palabraEntra(p),
                  color: destacadas.has(normalizar(palabra))
                    ? marca.colores.acento
                    : undefined,
                }}
              >
                {palabra}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// Ícono dentro de un círculo de color con brillo y ondas que salen.
const Insignia: React.FC<{ icono: string; tamano: number; desde: number }> = ({
  icono,
  tamano,
  desde,
}) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Icono = buscarIcono(icono);
  const p = useEntrada(desde);
  const mover = useMover();
  const flota = Math.sin(((frame - desde) / fps) * 1.6) * tamano * 0.03;
  return (
    <div
      style={{
        ...mover(p, tamano * 2),
        position: "relative",
        width: tamano,
        height: tamano,
        translate: `0 ${flota}px`,
        scale: interpolate(p, [0, 1], [0.6, 1]),
      }}
    >
      {[0, 1].map((i) => {
        const ciclo = (((frame - desde) / fps + i * 0.9) % 1.8) / 1.8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `${tamano * 0.02}px solid ${marca.colores.secundario}`,
              scale: 1 + ciclo * 0.6,
              opacity: (1 - ciclo) * 0.5,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `linear-gradient(145deg, ${marca.colores.secundario}, ${marca.colores.primario})`,
          boxShadow: `0 ${tamano * 0.08}px ${tamano * 0.3}px ${marca.colores.primario}aa, inset 0 ${tamano * 0.03}px ${tamano * 0.05}px rgba(255,255,255,0.35)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Icono ? (
          <Icono
            size={tamano * 0.48}
            color={marca.colores.texto}
            strokeWidth={2.2}
          />
        ) : null}
      </div>
    </div>
  );
};

// Tarjeta de vidrio con ícono (o número) y texto, para pasos y comparaciones.
const Tarjeta: React.FC<{
  texto: string;
  icono: string | null;
  numero: number | null;
  ancho: number;
  alto: number;
  desde: number;
  apagada?: boolean;
  marca: Marca;
}> = ({ texto, icono, numero, ancho, alto, desde, apagada = false, marca }) => {
  const { width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const p = useEntrada(desde);
  const mover = useMover();
  const Icono = icono ? buscarIcono(icono) : null;
  const chip = alto * 0.62;
  const tamanoTexto = tamanoQueCabe(
    texto.split(/\s+/),
    ancho - chip - alto * 0.6,
    alto * 0.72,
    base,
    0.062,
  );
  const color = apagada ? `${marca.colores.texto}66` : marca.colores.acento;
  return (
    <div
      style={{
        ...mover(p, base),
        width: ancho,
        height: alto,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: alto * 0.22,
        padding: `0 ${alto * 0.22}px`,
        borderRadius: alto * 0.24,
        background: apagada
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.1)",
        border: `${base * 0.0025}px solid ${apagada ? "rgba(255,255,255,0.14)" : `${marca.colores.acento}88`}`,
        boxShadow: apagada
          ? "none"
          : `0 ${base * 0.02}px ${base * 0.06}px rgba(0,0,0,0.35)`,
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          flex: "none",
          width: chip,
          height: chip,
          borderRadius: "50%",
          background: apagada ? "rgba(255,255,255,0.08)" : color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: marca.fuente,
          fontWeight: 900,
          fontSize: chip * 0.5,
          color: apagada
            ? `${marca.colores.texto}99`
            : marca.colores.textoSobreAcento,
        }}
      >
        {Icono ? (
          <Icono
            size={chip * 0.55}
            color={
              apagada
                ? `${marca.colores.texto}99`
                : marca.colores.textoSobreAcento
            }
            strokeWidth={2.4}
          />
        ) : (
          numero
        )}
      </div>
      <div
        style={{
          fontFamily: marca.fuente,
          fontWeight: 800,
          fontSize: tamanoTexto,
          lineHeight: 1.1,
          color: apagada ? `${marca.colores.texto}aa` : marca.colores.texto,
          textDecoration: apagada
            ? `line-through ${marca.colores.texto}55`
            : undefined,
          textWrap: "balance",
        }}
      >
        {texto}
      </div>
    </div>
  );
};

// Cifra grande; si es un número entero simple ("300", "3 de cada 10", "90%"), cuenta hacia arriba.
const Cifra: React.FC<{ cifra: string; tamano: number; desde: number }> = ({
  cifra,
  tamano,
  desde,
}) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const p = useEntrada(desde);
  const mover = useMover();
  const partes = cifra.match(/^(\D*)(\d{1,6})(\D.*)?$/);
  const cuenta = interpolate(frame - desde, [0, 26], [0, 1], {
    ...LIMITE,
    easing: Easing.out(Easing.cubic),
  });
  const mostrado = partes
    ? `${partes[1]}${Math.round(Number(partes[2]) * cuenta)}${partes[3] ?? ""}`
    : cifra;
  return (
    <div
      style={{
        ...mover(p, base),
        fontFamily: marca.fuente,
        fontWeight: 900,
        fontSize: tamano,
        lineHeight: 1,
        letterSpacing: "-0.03em",
        color: marca.colores.acento,
        textShadow: `0 ${tamano * 0.04}px ${tamano * 0.2}px ${marca.colores.acento}55`,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      {mostrado}
    </div>
  );
};

const Subtexto: React.FC<{
  texto: string;
  ancho: number;
  alto: number;
  desde: number;
}> = ({ texto, ancho, alto, desde }) => {
  const marca = useMarca();
  const { width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const p = useEntrada(desde);
  const mover = useMover();
  return (
    <div
      style={{
        ...mover(p, base),
        fontFamily: marca.fuente,
        fontWeight: 700,
        fontSize: tamanoQueCabe(texto.split(/\s+/), ancho, alto, base, 0.055),
        lineHeight: 1.2,
        textAlign: "center",
        color: `${marca.colores.texto}dd`,
        textWrap: "balance",
        maxWidth: ancho,
      }}
    >
      {texto}
    </div>
  );
};

// Una parada del camino: círculo con número (o ícono) que aparece al llegar el trazo, y su texto
// al lado.
const Parada: React.FC<{
  x: number;
  y: number;
  tamano: number;
  numero: number;
  icono: string | null;
  texto: string;
  caja: Area;
  alinear: "left" | "right" | "center";
  desde: number;
}> = ({ x, y, tamano, numero, icono, texto, caja, alinear, desde }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const Icono = icono ? buscarIcono(icono) : null;
  const llega = spring({
    frame: frame - desde,
    fps,
    config: { damping: 12, stiffness: 180 },
    durationInFrames: 16,
  });
  const p = useEntrada(desde + 4);
  const mover = useMover();
  const onda = interpolate(frame - desde, [0, 20], [0, 1], LIMITE);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - tamano / 2,
          top: y - tamano / 2,
          width: tamano,
          height: tamano,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `${tamano * 0.04}px solid ${marca.colores.acento}`,
            scale: 1 + onda * 0.8,
            opacity: frame < desde ? 0 : (1 - onda) * 0.8,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: marca.colores.acento,
            boxShadow: `0 ${tamano * 0.08}px ${tamano * 0.3}px ${marca.colores.acento}88`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: marca.fuente,
            fontWeight: 900,
            fontSize: tamano * 0.46,
            color: marca.colores.textoSobreAcento,
            scale: Math.max(0, llega),
          }}
        >
          {Icono ? (
            <Icono
              size={tamano * 0.5}
              color={marca.colores.textoSobreAcento}
              strokeWidth={2.4}
            />
          ) : (
            numero
          )}
        </div>
      </div>
      <div
        style={{
          ...mover(p, base),
          position: "absolute",
          left: caja.x,
          top: caja.y,
          width: caja.ancho,
          height: caja.alto,
          display: "flex",
          alignItems: "center",
          justifyContent:
            alinear === "left"
              ? "flex-start"
              : alinear === "right"
                ? "flex-end"
                : "center",
        }}
      >
        <div
          style={{
            fontFamily: marca.fuente,
            fontWeight: 800,
            fontSize: tamanoQueCabe(
              texto.split(/\s+/),
              caja.ancho,
              caja.alto,
              base,
              0.07,
            ),
            lineHeight: 1.1,
            textAlign: alinear,
            color: marca.colores.texto,
            textShadow: `0 ${base * 0.004}px ${base * 0.02}px rgba(0,0,0,0.5)`,
            textWrap: "balance",
          }}
        >
          {texto}
        </div>
      </div>
    </>
  );
};

// Pasos sobre un camino punteado: el trazo avanza de una parada a la siguiente (llega justo
// cuando se dice cada paso) con una luz en la punta; el camino que falta se ve apenas.
const Camino: React.FC<{ item: ApoyoEnEditado; area: Area }> = ({
  item,
  area,
}) => {
  const frame = useCurrentFrame();
  const marca = useMarca();
  const { width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const { elemento: e, momentos } = item;
  const n = e.puntos.length;
  const horizontal = width > height;
  const altoTitulo = e.titulo ? area.alto * 0.18 : 0;
  const arriba = altoTitulo + (e.titulo ? base * 0.04 : base * 0.02);
  const alto = area.alto - arriba - base * 0.02;
  const ancho = area.ancho;
  const tramo = horizontal ? ancho / n : alto / n;
  const tamano = Math.min(base * 0.15, tramo * (horizontal ? 0.4 : 0.5));
  // Paradas en zigzag: en vertical bajan de un lado al otro; en horizontal avanzan subiendo y
  // bajando, con el texto debajo de cada una.
  const paradas = e.puntos.map((_, i) =>
    horizontal
      ? { x: tramo * (i + 0.5), y: arriba + alto * (i % 2 === 0 ? 0.25 : 0.5) }
      : { x: ancho * (i % 2 === 0 ? 0.2 : 0.8), y: arriba + tramo * (i + 0.5) },
  );
  const tramos = paradas.slice(1).map((b, i) => {
    const a = paradas[i];
    const d = horizontal
      ? `M ${a.x} ${a.y} C ${a.x + tramo * 0.6} ${a.y} ${b.x - tramo * 0.6} ${b.y} ${b.x} ${b.y}`
      : `M ${a.x} ${a.y} C ${a.x} ${a.y + tramo * 0.65} ${b.x} ${b.y - tramo * 0.65} ${b.x} ${b.y}`;
    // El trazo sale un poco después de la parada y llega cuando aparece la siguiente.
    const llega = momentos[i + 1] ?? 0;
    const sale = Math.min((momentos[i] ?? 0) + 8, llega - 6);
    return { d, largo: getLength(d), sale, llega };
  });
  const separacion = base * 0.032;
  const punto = base * 0.009;
  return (
    <div
      style={{
        position: "absolute",
        left: area.x,
        top: area.y,
        width: area.ancho,
        height: area.alto,
      }}
    >
      {e.titulo ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: area.ancho,
            height: altoTitulo,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Titulo
            texto={e.titulo}
            destacar={e.destacar}
            ancho={area.ancho}
            alto={altoTitulo}
            desde={0}
            maximo={0.09}
          />
        </div>
      ) : null}
      <svg
        width={area.ancho}
        height={area.alto}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
      >
        {tramos.map((t, i) => {
          const avance = interpolate(frame, [t.sale, t.llega], [0, 1], {
            ...LIMITE,
            easing: Easing.inOut(Easing.quad),
          });
          const cuantos = Math.max(2, Math.floor(t.largo / separacion));
          const hecho = avance * t.largo;
          const punta = getPointAtLength(t.d, hecho) ?? paradas[i];
          return (
            <g key={i}>
              {Array.from({ length: cuantos + 1 }, (_, k) => {
                const en = (k / cuantos) * t.largo;
                const q = getPointAtLength(t.d, en) ?? paradas[i];
                const visto = interpolate(hecho - en, [0, separacion * 1.5], [0, 1], LIMITE);
                return (
                  <circle
                    key={k}
                    cx={q.x}
                    cy={q.y}
                    r={punto * (0.6 + 0.4 * visto)}
                    fill={marca.colores.texto}
                    opacity={0.16 + 0.84 * visto}
                  />
                );
              })}
              {avance > 0 && avance < 1 ? (
                <circle
                  cx={punta.x}
                  cy={punta.y}
                  r={punto * 2.2}
                  fill={marca.colores.acento}
                  style={{
                    filter: `drop-shadow(0 0 ${punto * 2}px ${marca.colores.acento})`,
                  }}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      {e.puntos.map((p, i) => {
        const { x, y } = paradas[i];
        const lejos = tamano * 0.5 + base * 0.03;
        const caja: Area = horizontal
          ? {
              x: x - tramo * 0.48,
              y: y + lejos,
              ancho: tramo * 0.96,
              alto: alto * 0.24,
            }
          : i % 2 === 0
            ? { x: x + lejos, y: y - tramo * 0.26, ancho: ancho - x - lejos, alto: tramo * 0.52 }
            : { x: 0, y: y - tramo * 0.26, ancho: x - lejos, alto: tramo * 0.52 };
        return (
          <Parada
            key={i}
            x={x}
            y={y}
            tamano={tamano}
            numero={i + 1}
            icono={p.icono}
            texto={p.texto}
            caja={caja}
            alinear={horizontal ? "center" : i % 2 === 0 ? "left" : "right"}
            desde={momentos[i] ?? 0}
          />
        );
      })}
    </div>
  );
};

// Contenido principal de la escena según su modo, dentro de `area`.
const Contenido: React.FC<{ item: ApoyoEnEditado; area: Area }> = ({
  item,
  area,
}) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const { elemento: e, momentos, duracionFrames } = item;
  const horizontal = width > height;
  const columna: React.CSSProperties = {
    position: "absolute",
    left: area.x,
    top: area.y,
    width: area.ancho,
    height: area.alto,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: base * 0.04,
    transformStyle: "preserve-3d",
  };
  // Entrada de lo que aparece al empezar la escena (comillas e imagen).
  const alEmpezar = useEntrada(0);
  const mover = useMover();
  const subtexto = (texto: string, alto: number, desde: number) => (
    <Subtexto
      texto={texto}
      ancho={area.ancho * 0.9}
      alto={alto}
      desde={desde}
    />
  );

  switch (e.modo) {
    case "concepto": {
      const insignia = e.icono
        ? Math.min(area.alto * 0.36, area.ancho * 0.42)
        : 0;
      const altoTexto = area.alto - insignia - base * 0.08;
      return (
        <div style={columna}>
          {e.icono ? (
            <Insignia icono={e.icono} tamano={insignia} desde={2} />
          ) : null}
          {e.titulo ? (
            <Titulo
              texto={e.titulo}
              destacar={e.destacar}
              ancho={area.ancho}
              alto={altoTexto * (e.texto ? 0.6 : 1)}
              desde={8}
            />
          ) : null}
          {e.texto
            ? subtexto(e.texto, altoTexto * (e.titulo ? 0.35 : 0.9), 16)
            : null}
        </div>
      );
    }
    case "dato": {
      const cifra = e.cifra ?? "";
      const tamano = tamanoQueCabe(
        [cifra],
        area.ancho,
        area.alto * (e.texto ? 0.42 : 0.6),
        base,
        0.34,
      );
      return (
        <div style={columna}>
          {e.titulo ? (
            <Titulo
              texto={e.titulo}
              destacar={e.destacar}
              ancho={area.ancho}
              alto={area.alto * 0.16}
              desde={0}
              maximo={0.07}
            />
          ) : null}
          <Cifra cifra={cifra} tamano={tamano} desde={4} />
          {e.texto ? subtexto(e.texto, area.alto * 0.26, 14) : null}
        </div>
      );
    }
    case "pasos":
    case "comparar": {
      const n = e.puntos.length;
      const comparar = e.modo === "comparar";
      const lado = comparar && horizontal;
      const altoTitulo = e.titulo ? area.alto * 0.2 : 0;
      const espacio = area.alto - altoTitulo - (e.titulo ? base * 0.04 : 0);
      const separacion = base * (comparar ? 0.09 : 0.03);
      const alto = lado
        ? Math.min(base * 0.2, espacio * 0.5)
        : Math.min(base * 0.19, (espacio - separacion * (n - 1)) / n);
      const ancho = lado ? (area.ancho - separacion) / 2 : area.ancho;
      return (
        <div style={columna}>
          {e.titulo ? (
            <Titulo
              texto={e.titulo}
              destacar={e.destacar}
              ancho={area.ancho}
              alto={altoTitulo}
              desde={0}
              maximo={0.09}
            />
          ) : null}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: lado ? "row" : "column",
              alignItems: "center",
              gap: separacion,
              transformStyle: "preserve-3d",
            }}
          >
            {e.puntos.map((punto, i) => (
              <Tarjeta
                key={i}
                texto={punto.texto}
                icono={punto.icono}
                numero={comparar ? null : i + 1}
                ancho={ancho}
                alto={alto}
                desde={momentos[i] ?? 0}
                apagada={comparar && i === 0}
                marca={marca}
              />
            ))}
            {comparar ? (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  translate: "-50% -50%",
                  width: separacion * 0.95,
                  height: separacion * 0.95,
                  borderRadius: "50%",
                  background: marca.colores.primario,
                  border: `${base * 0.004}px solid ${marca.colores.texto}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: marca.fuente,
                  fontWeight: 900,
                  fontSize: separacion * 0.34,
                  color: marca.colores.texto,
                  opacity: spring({
                    frame: frame - (momentos[1] ?? 0),
                    fps,
                    config: { damping: 200 },
                    durationInFrames: 12,
                  }),
                }}
              >
                VS
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    case "camino":
      return <Camino item={item} area={area} />;
    case "frase": {
      const texto = e.texto ?? "";
      const palabras = texto.trim().split(/\s+/);
      const destacadas = new Set(
        (e.destacar ?? "").split(/\s+/).map(normalizar).filter(Boolean),
      );
      const tamano = tamanoQueCabe(
        palabras,
        area.ancho * 0.92,
        area.alto * 0.78,
        base,
        0.11,
      );
      // Las palabras se reparten en la primera mitad de la escena, como si se fueran diciendo.
      const cada = Math.max(
        2,
        Math.min(7, (duracionFrames * 0.5) / palabras.length),
      );
      return (
        <div style={columna}>
          <div
            style={{
              fontFamily: marca.fuenteAlterna,
              fontStyle: "italic",
              fontSize: tamano * 2.4,
              lineHeight: 0.5,
              height: tamano * 0.9,
              color: marca.colores.acento,
              opacity: alEmpezar,
            }}
          >
            “
          </div>
          <div
            style={{
              fontFamily: marca.fuente,
              fontWeight: 800,
              fontSize: tamano,
              lineHeight: 1.12,
              textAlign: "center",
              color: marca.colores.texto,
              maxWidth: area.ancho * 0.92,
            }}
          >
            <div style={{ textWrap: "balance" }}>
              {palabras.map((palabra, i) => {
                const p = spring({
                  frame: frame - 6 - i * cada,
                  fps,
                  config: { damping: 200 },
                  durationInFrames: 12,
                });
                const resaltada = destacadas.has(normalizar(palabra));
                return (
                  <span key={i}>
                    {i === 0 ? "" : " "}
                    <span
                      style={{
                        display: "inline-block",
                        opacity: interpolate(p, [0, 1], [0.12, 1]),
                        filter:
                          p < 0.99
                            ? `blur(${(1 - p) * tamano * 0.08}px)`
                            : undefined,
                        color: resaltada ? marca.colores.acento : undefined,
                        fontFamily: resaltada ? marca.fuenteAlterna : undefined,
                        fontStyle: resaltada ? "italic" : undefined,
                        fontWeight: resaltada ? 700 : undefined,
                      }}
                    >
                      {palabra}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    case "escena":
    case "video":
      // Se dibujan aparte (EscenaIlustrada y VideoDeApoyo), a pantalla completa.
      return null;
    case "imagen": {
      const altoTitulo = e.titulo ? area.alto * 0.22 : 0;
      const alto = (area.alto - altoTitulo) * 0.92;
      const ancho = Math.min(
        area.ancho * 0.9,
        alto * (horizontal ? 1.5 : 0.85),
      );
      const avance = frame / Math.max(1, duracionFrames);
      return (
        <div style={columna}>
          <div
            style={{
              ...mover(alEmpezar, base),
              width: ancho,
              height: Math.min(alto, ancho * 1.25),
              borderRadius: base * 0.035,
              overflow: "hidden",
              border: `${base * 0.004}px solid rgba(255,255,255,0.85)`,
              boxShadow: `0 ${base * 0.04}px ${base * 0.1}px rgba(0,0,0,0.55)`,
              rotate: `y ${interpolate(avance, [0, 1], [-14, 10])}deg`,
            }}
          >
            <Img
              src={fuenteImagen(e.archivo ?? "")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                scale: interpolate(avance, [0, 1], [1.05, 1.18]),
              }}
            />
          </div>
          {e.titulo ? (
            <Titulo
              texto={e.titulo}
              destacar={e.destacar}
              ancho={area.ancho}
              alto={altoTitulo}
              desde={10}
              maximo={0.08}
            />
          ) : null}
        </div>
      );
    }
  }
};

// Un trozo de un video de apoyo a pantalla completa (recortado al formato), con un acercamiento
// lento para que no se sienta quieto. Sin sonido salvo que tenga `volumen`.
const VideoDeApoyo: React.FC<{
  archivo: string;
  desde: number;
  volumen: number;
  duracionFrames: number;
}> = ({ archivo, desde, volumen, duracionFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const acercar = interpolate(frame, [0, duracionFrames], [1.03, 1.1], LIMITE);
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <Video
        src={staticFile(archivo)}
        trimBefore={Math.round(desde * fps)}
        objectFit="cover"
        muted={volumen === 0}
        volume={volumen}
        style={{ width: "100%", height: "100%", scale: acercar }}
      />
    </AbsoluteFill>
  );
};

// Una escena de apoyo: el fondo en capas se abre en círculo sobre el video, el contenido llega
// desde atrás, y al final todo avanza hacia la cámara y se desvanece.
// Cómo se abre y se cierra la escena sobre el video, según su transición.
// `abre` y `cierra` van de 0 a 1 (al empezar y al terminar).
const estiloTransicion = (
  transicion: Variante["transicion"],
  abre: number,
  cierra: number,
  width: number,
  height: number,
  lado: 1 | -1,
): React.CSSProperties => {
  const base = Math.min(width, height);
  switch (transicion) {
    case "circulo":
      return {
        clipPath: abre < 1 ? `circle(${Math.hypot(width, height) * 0.5 * abre}px at 50% 45%)` : undefined,
        opacity: 1 - cierra,
        scale: 1 + cierra * 0.06,
      };
    case "barrido": {
      // Entra barriendo de un lado y sale barriendo hacia el otro, con el borde inclinado.
      const a = (1 - abre) * 120;
      const c = cierra * 160;
      const borde = (x: number) => `${x}%`;
      return lado === 1
        ? { clipPath: `polygon(${borde(-20 + c)} 0, ${borde(120 - a)} 0, ${borde(100 - a)} 100%, ${borde(-20 + c - 20)} 100%)` }
        : { clipPath: `polygon(${borde(a - 20)} 0, ${borde(120 - c)} 0, ${borde(100 - c)} 100%, ${borde(a - 40)} 100%)` };
    }
    case "persiana": {
      // Franjas horizontales que se llenan al entrar y se vacían al salir.
      const lleno = Math.min(abre, 1 - cierra) * 100;
      if (lleno >= 100) return {};
      const mascara = `repeating-linear-gradient(${lado === 1 ? "180deg" : "90deg"}, black 0 ${lleno / 7}%, transparent ${lleno / 7}% ${100 / 7}%)`;
      return { maskImage: mascara, WebkitMaskImage: mascara };
    }
    case "zoom":
      // Llega desde cerca de la cámara, desenfocada, y al salir se aleja.
      return {
        opacity: Math.min(abre * 1.5, 1) * (1 - cierra),
        scale: interpolate(abre, [0, 1], [1.35, 1]) * interpolate(cierra, [0, 1], [1, 0.82]),
        filter: abre < 1 || cierra > 0 ? `blur(${((1 - abre) + cierra) * base * 0.02}px)` : undefined,
      };
    case "deslizar":
      // Entra deslizándose de lado (o de abajo) y sale hacia el lado contrario.
      return lado === 1
        ? { translate: `${(1 - abre) * width - cierra * width}px 0`, borderRadius: (1 - abre + cierra) * base * 0.06, overflow: "hidden" }
        : { translate: `0 ${(1 - abre) * height - cierra * height}px`, borderRadius: (1 - abre + cierra) * base * 0.06, overflow: "hidden" };
    case "giro":
      // Llega girando un poco y desenfocada; al salir se desenfoca y se apaga.
      return {
        opacity: Math.min(abre * 1.4, 1) * (1 - cierra),
        rotate: `${(1 - abre) * -6 * lado}deg`,
        scale: (1.1 - 0.1 * abre) * (1 + cierra * 0.04),
        filter: abre < 1 || cierra > 0 ? `blur(${((1 - abre) * 1.2 + cierra) * base * 0.009}px)` : undefined,
      };
    case "diamante": {
      // Un rombo que crece desde el centro y, al salir, se cierra.
      const t = Math.min(abre, 1 - cierra);
      if (t >= 1) return {};
      const r = t * 110;
      return { clipPath: `polygon(50% ${45 - r}%, ${50 + r}% 45%, 50% ${45 + r}%, ${50 - r}% 45%)` };
    }
  }
};

const Escena: React.FC<{
  item: ApoyoEnEditado;
  limiteAbajo: number | null;
  dibujos: Record<string, string>;
  variante: Variante;
  continuidad: Continuidad;
}> = ({ item, limiteAbajo, dibujos, variante, continuidad }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { duracionFrames } = item;
  const m = margenesSeguros(width, height);
  const piso = Math.max(
    m.arriba + height * 0.3,
    limiteAbajo ?? height - m.abajo,
  );
  const area: Area = {
    x: m.lados,
    y: m.arriba,
    ancho: width - m.lados * 2,
    alto: piso - m.arriba,
  };
  const perspectiva = Math.max(width, height) * 1.4;
  // Un escenario que sigue en el mismo mundo que el anterior (o el siguiente) no se abre ni se
  // cierra: es el mismo lugar.
  const abre = continuidad.entra
    ? 1
    : interpolate(frame, [0, 14], [0, 1], {
        ...LIMITE,
        easing: Easing.bezier(0.65, 0, 0.35, 1),
      });
  const cierra = continuidad.sale
    ? 0
    : interpolate(frame, [duracionFrames - 9, duracionFrames], [0, 1], {
        ...LIMITE,
        easing: Easing.in(Easing.cubic),
      });
  const lado = random(`lado-${item.elemento.inicio}`) < 0.5 ? 1 : -1;
  const ilustrada =
    item.elemento.modo === "escena" ? item.elemento.escena : null;
  const video =
    item.elemento.modo === "video" && item.elemento.archivo
      ? item.elemento.archivo
      : null;

  return (
    <VarianteEscena.Provider value={variante}>
    <AbsoluteFill style={estiloTransicion(variante.transicion, abre, cierra, width, height, lado)}>
      {item.elemento.modo === "escenario" ? (
        <EscenarioAnimado item={item} area={area} continuidad={continuidad} />
      ) : ilustrada || video ? (
        <>
          {ilustrada && ilustrada.fondo === "marca" ? (
            <FondoEnCapas frame={frame} semilla={`${item.elemento.inicio}`} tipo={variante.fondo} />
          ) : null}
          {ilustrada ? (
            <EscenaIlustrada
              escena={ilustrada}
              dibujos={dibujos}
              duracionFrames={duracionFrames}
            />
          ) : null}
          {video ? (
            <VideoDeApoyo
              archivo={video}
              desde={item.elemento.desde}
              volumen={item.elemento.volumen}
              duracionFrames={duracionFrames}
            />
          ) : null}
          {item.elemento.titulo ? (
            // Sombra arriba para que el título se lea sobre cualquier dibujo.
            <AbsoluteFill
              style={{
                background: `linear-gradient(rgba(0,0,0,0.5), transparent ${((area.y + area.alto * 0.3) / height) * 100}%)`,
              }}
            />
          ) : null}
          {item.elemento.titulo ? (
            <div
              style={{
                position: "absolute",
                left: area.x,
                top: area.y,
                width: area.ancho,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Titulo
                texto={item.elemento.titulo}
                destacar={item.elemento.destacar}
                ancho={area.ancho}
                alto={area.alto * 0.2}
                desde={6}
                maximo={0.075}
              />
            </div>
          ) : null}
        </>
      ) : (
        <FondoEnCapas frame={frame} semilla={`${item.elemento.inicio}`} tipo={variante.fondo}>
          <Capa z={0} perspectiva={perspectiva}>
            <Contenido item={item} area={area} />
          </Capa>
        </FondoEnCapas>
      )}
    </AbsoluteFill>
    </VarianteEscena.Provider>
  );
};

export const Apoyos: React.FC<{
  items: ApoyoEnEditado[];
  limiteAbajo: number | null;
  dibujos: Record<string, string>;
}> = ({ items, limiteAbajo, dibujos }) => {
  const variantes = elegirVariantes(items.map((x) => x.elemento));
  const continuidades = continuidadEscenarios(items);
  return (
    <AbsoluteFill>
      {items.map((item, i) => (
        <Sequence
          key={i}
          from={item.desdeFrame}
          durationInFrames={item.duracionFrames}
          name={
            item.elemento.modo === "escenario"
              ? `Apoyo: escenario · ${item.elemento.escenario?.mundo} · ${item.elemento.escenario?.pantalla}`
              : `Apoyo: ${item.elemento.modo} · ${variantes[i].transicion} · ${variantes[i].fondo}`
          }
        >
          <Escena
            item={item}
            limiteAbajo={limiteAbajo}
            dibujos={dibujos}
            variante={variantes[i]}
            continuidad={continuidades[i]}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Fondo continuo de los proyectos de solo audio (debajo de las escenas de apoyo).
export const FondoSoloAudio: React.FC = () => {
  const frame = useCurrentFrame();
  return <FondoEnCapas frame={frame} semilla="solo-audio" />;
};
