import { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { prepararSvg, proporcionDe } from "../edicion/dibujos";
import type { esquemaEscenaIlustrada } from "../edicion/esquema";
import { useMarca } from "../edicion/estilos";
import type { z } from "zod";

type Ilustracion = z.infer<typeof esquemaEscenaIlustrada>;
type Capa = Ilustracion["capas"][number];

const LIMITE = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SUAVE = Easing.inOut(Easing.cubic);

// Valor de una lista de momentos { t, ...valores } en el segundo `t`, con paso suave entre uno y otro.
const recorrer = <K extends string>(
  puntos: Array<{ t: number } & Record<K, number>>,
  t: number,
  clave: K,
) => {
  if (puntos.length === 1) return puntos[0][clave];
  return interpolate(
    t,
    puntos.map((p) => p.t),
    puntos.map((p) => p[clave]),
    { ...LIMITE, easing: SUAVE },
  );
};

// Ordena por tiempo y quita momentos repetidos (interpolate necesita tiempos que crecen).
const ordenar = <T extends { t: number }>(puntos: T[]) =>
  [...puntos]
    .sort((a, b) => a.t - b.t)
    .filter((p, i, todos) => i === 0 || p.t > todos[i - 1].t);

// Fondos de las escenas ilustradas que no usan el fondo en capas de la marca.
const Fondo: React.FC<{ fondo: Exclude<Ilustracion["fondo"], "marca"> }> = ({
  fondo,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const fondos = {
    cielo:
      "radial-gradient(circle at 80% 12%, #FFF6C9 0%, transparent 22%), linear-gradient(#5FB8F0, #BFE8FF 70%, #E8F7FF)",
    atardecer:
      "radial-gradient(circle at 50% 70%, #FFE3A1 0%, transparent 35%), linear-gradient(#4B3B8F, #E8618C 45%, #FFB36B 75%, #FFE0A3)",
    noche:
      "radial-gradient(circle at 78% 18%, #2B3F8C 0%, transparent 40%), linear-gradient(#060A1F, #121B47 70%, #1C2A63)",
    claro:
      "radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F1ECE2 70%, #E6DFD2)",
  } as const;
  return (
    <AbsoluteFill style={{ background: fondos[fondo] }}>
      {fondo === "noche"
        ? Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: random(`estrella-x${i}`) * width,
                top: random(`estrella-y${i}`) * height * 0.75,
                width: base * (0.002 + random(`estrella-t${i}`) * 0.004),
                height: base * (0.002 + random(`estrella-t${i}`) * 0.004),
                borderRadius: "50%",
                background: "#FFFFFF",
                opacity: 0.4 + 0.6 * Math.abs(Math.sin(frame / 20 + i)),
              }}
            />
          ))
        : null}
    </AbsoluteFill>
  );
};

// Transformación de una parte del dibujo en este cuadro.
const transformarParte = (
  efecto: Capa["partes"][number]["efecto"],
  velocidad: number,
  segundos: number,
) => {
  const fase = segundos * velocidad * Math.PI * 2;
  switch (efecto) {
    case "girar":
      return { transform: `rotate(${segundos * velocidad * 360}deg)` };
    case "latir":
      return { transform: `scale(${1 + 0.08 * Math.sin(fase)})` };
    case "balanceo":
      return { transform: `rotate(${10 * Math.sin(fase)}deg)` };
    case "vibrar":
      return {
        transform: `translate(${Math.sin(fase * 7) * 1.5}%, ${Math.cos(fase * 5) * 1.5}%)`,
      };
    case "parpadear":
      return { opacity: 0.35 + 0.65 * Math.abs(Math.sin(fase / 2)) };
  }
};

const CapaDibujo: React.FC<{
  capa: Capa;
  indice: number;
  svg: string;
  camara: { x: number; y: number; zoom: number };
}> = ({ capa, indice, svg, camara }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const segundos = frame / fps;
  const prefijo = `c${indice}-`;
  const listo = useMemo(() => prepararSvg(svg, prefijo), [svg, prefijo]);
  const proporcion = useMemo(() => proporcionDe(svg), [svg]);

  // Recorrido de la capa: empieza en x/y y sigue los puntos de `recorrido`.
  const puntos = ordenar([
    capa.cubrir
      ? { t: 0, x: 0.5, y: 0.5, escala: 1, giro: 0 }
      : { t: 0, x: capa.x, y: capa.y, escala: 1, giro: 0 },
    ...(capa.cubrir ? [] : capa.recorrido),
  ]);
  const x = recorrer(puntos, segundos, "x");
  const y = recorrer(puntos, segundos, "y");
  const escala = recorrer(puntos, segundos, "escala");
  const giro = recorrer(puntos, segundos, "giro");

  // Paralaje: lo del fondo se mueve menos con la cámara; lo de adelante, más.
  const f = 1 + 0.35 * capa.profundidad;
  const zoom = 1 + (camara.zoom - 1) * f;
  const centroX = width / 2 + (camara.x * width - width / 2) * f;
  const centroY = height / 2 + (camara.y * height - height / 2) * f;
  const pantallaX = width / 2 + (x * width - centroX) * zoom;
  const pantallaY = height / 2 + (y * height - centroY) * zoom;
  // Un fondo que cubre: llena todo el cuadro (con aire para que la cámara se mueva), sin bordes.
  const anchoBase = capa.cubrir
    ? Math.max(1.15, 1.15 * (height / width) * proporcion)
    : capa.ancho;
  const ancho = anchoBase * width * zoom * escala;

  const inicio = Math.round((capa.en ?? indice * 0.25) * fps);
  const p =
    capa.entrada === "ninguna"
      ? 1
      : spring({
          frame: frame - inicio,
          fps,
          config: { damping: 200 },
          durationInFrames: 22,
        });
  const lejos = 1 - p;
  const desplazamiento = {
    abajo: [0, height * 0.7],
    arriba: [0, -height * 0.7],
    izquierda: [-width * 0.9, 0],
    derecha: [width * 0.9, 0],
  } as Record<string, [number, number]>;
  const [dx, dy] = desplazamiento[capa.entrada] ?? [0, 0];
  const escalaEntrada =
    capa.entrada === "zoom"
      ? interpolate(p, [0, 1], [0.15, 1])
      : capa.entrada === "aparece"
        ? interpolate(p, [0, 1], [0.85, 1])
        : 1;
  const opacidad =
    capa.entrada === "aparece" || capa.entrada === "zoom"
      ? p
      : Math.min(1, p * 3);

  const fase = segundos * Math.PI * 2;
  const efectos = {
    flotar: `translateY(${Math.sin(fase * 0.5) * ancho * 0.02}px)`,
    vibrar: `translate(${Math.sin(fase * 9) * ancho * 0.004}px, ${Math.cos(fase * 7) * ancho * 0.004}px)`,
    latir: `scale(${1 + 0.04 * Math.sin(fase)})`,
    balanceo: `rotate(${4 * Math.sin(fase * 0.6)}deg)`,
  };
  const efecto = capa.efecto ? efectos[capa.efecto] : "";

  const estiloPartes = capa.partes
    .map((parte) => {
      const t = transformarParte(parte.efecto, parte.velocidad, segundos);
      const reglas = [
        "transform-box:fill-box",
        "transform-origin:center",
        "transform" in t ? `transform:${t.transform}` : "",
        "opacity" in t ? `opacity:${t.opacity}` : "",
      ].filter(Boolean);
      return `#${prefijo}${CSS.escape(parte.id)}{${reglas.join(";")}}`;
    })
    .join("");

  return (
    <div
      style={{
        position: "absolute",
        left: pantallaX + dx * lejos,
        top: pantallaY + dy * lejos,
        width: ancho,
        height: ancho / proporcion,
        transform: `translate(-50%, -50%) rotate(${giro}deg) scale(${escalaEntrada}) ${capa.voltear ? "scaleX(-1)" : ""} ${efecto}`,
        opacity: opacidad,
        filter:
          capa.profundidad <= -0.6
            ? `blur(${Math.min(width, height) * 0.0025}px)`
            : undefined,
      }}
    >
      {estiloPartes ? <style>{estiloPartes}</style> : null}
      <div
        style={{ width: "100%", height: "100%" }}
        dangerouslySetInnerHTML={{ __html: listo }}
      />
    </div>
  );
};

// Escena ilustrada: fondo, dibujos por capas a distintas profundidades y una cámara que la recorre.
export const EscenaIlustrada: React.FC<{
  escena: Ilustracion;
  dibujos: Record<string, string>;
  duracionFrames: number;
}> = ({ escena, dibujos, duracionFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const segundos = frame / fps;
  const puntos = ordenar(
    escena.camara.length ? escena.camara : [{ t: 0, x: 0.5, y: 0.5, zoom: 1 }],
  );
  // Además del recorrido, la cámara siempre avanza un poco (la escena nunca queda quieta).
  const avance = interpolate(frame, [0, duracionFrames], [1, 1.05]);
  const camara = {
    x: recorrer(puntos, segundos, "x"),
    y: recorrer(puntos, segundos, "y"),
    zoom: recorrer(puntos, segundos, "zoom") * avance,
  };
  const marca = useMarca();
  const capas = escena.capas
    .map((capa, indice) => ({ capa, indice }))
    .sort((a, b) => a.capa.profundidad - b.capa.profundidad);

  return (
    <AbsoluteFill style={{ overflow: "hidden", color: marca.colores.texto }}>
      {escena.fondo !== "marca" ? <Fondo fondo={escena.fondo} /> : null}
      {capas.map(({ capa, indice }) =>
        dibujos[capa.dibujo] ? (
          <CapaDibujo
            key={indice}
            capa={capa}
            indice={indice}
            svg={dibujos[capa.dibujo]}
            camara={camara}
          />
        ) : null,
      )}
    </AbsoluteFill>
  );
};
