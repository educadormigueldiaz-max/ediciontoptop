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
import { margenesSeguros } from "../edicion/encuadre";
import type { ElementoApoyo } from "../edicion/esquema";
import { useMarca } from "../edicion/estilos";
import type { ElementoEnEditado } from "../edicion/linea-de-tiempo";
import type { Marca } from "../marca";
import { buscarIcono } from "./iconos";
import { EscenaIlustrada } from "./EscenaIlustrada";
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
  children?: React.ReactNode;
}> = ({ frame, semilla, children }) => {
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

// Entrada de cada pieza: llega desde atrás (profundidad), sin rebote.
const useEntrada = (desde: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
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
          const p = spring({
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
                  opacity: p,
                  translate: `0 ${interpolate(p, [0, 1], [tamano * 0.35, 0])}px`,
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
  const flota = Math.sin(((frame - desde) / fps) * 1.6) * tamano * 0.03;
  return (
    <div
      style={{
        position: "relative",
        width: tamano,
        height: tamano,
        translate: `0 ${flota}px`,
        scale: interpolate(p, [0, 1], [0.6, 1]),
        opacity: p,
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
        ...entradaDesdeAtras(p, base),
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
        ...entradaDesdeAtras(p, base),
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
  return (
    <div
      style={{
        ...entradaDesdeAtras(p, base),
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
          ...entradaDesdeAtras(p, base),
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
              ...entradaDesdeAtras(alEmpezar, base),
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
const Escena: React.FC<{
  item: ApoyoEnEditado;
  limiteAbajo: number | null;
  dibujos: Record<string, string>;
}> = ({ item, limiteAbajo, dibujos }) => {
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
  const abre = interpolate(frame, [0, 14], [0, 1], {
    ...LIMITE,
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const cierra = interpolate(
    frame,
    [duracionFrames - 9, duracionFrames],
    [0, 1],
    { ...LIMITE, easing: Easing.in(Easing.cubic) },
  );
  const radio = Math.hypot(width, height) * 0.5 * abre;
  const ilustrada =
    item.elemento.modo === "escena" ? item.elemento.escena : null;
  const video =
    item.elemento.modo === "video" && item.elemento.archivo
      ? item.elemento.archivo
      : null;

  return (
    <AbsoluteFill
      style={{
        clipPath: abre < 1 ? `circle(${radio}px at 50% 45%)` : undefined,
        opacity: 1 - cierra,
        scale: 1 + cierra * 0.06,
      }}
    >
      {ilustrada || video ? (
        <>
          {ilustrada && ilustrada.fondo === "marca" ? (
            <FondoEnCapas frame={frame} semilla={`${item.elemento.inicio}`} />
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
        <FondoEnCapas frame={frame} semilla={`${item.elemento.inicio}`}>
          <Capa z={0} perspectiva={perspectiva}>
            <Contenido item={item} area={area} />
          </Capa>
        </FondoEnCapas>
      )}
    </AbsoluteFill>
  );
};

export const Apoyos: React.FC<{
  items: ApoyoEnEditado[];
  limiteAbajo: number | null;
  dibujos: Record<string, string>;
}> = ({ items, limiteAbajo, dibujos }) => (
  <AbsoluteFill>
    {items.map((item, i) => (
      <Sequence
        key={i}
        from={item.desdeFrame}
        durationInFrames={item.duracionFrames}
        name={`Apoyo: ${item.elemento.modo}`}
      >
        <Escena item={item} limiteAbajo={limiteAbajo} dibujos={dibujos} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

// Fondo continuo de los proyectos de solo audio (debajo de las escenas de apoyo).
export const FondoSoloAudio: React.FC = () => {
  const frame = useCurrentFrame();
  return <FondoEnCapas frame={frame} semilla="solo-audio" />;
};
