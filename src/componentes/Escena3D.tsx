import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { margenesSeguros, type Caja } from "../edicion/encuadre";
import {
  distribucionConVentana,
  mezclarPoses,
  poseDeEscena,
  poseNeutra,
  progresoEscena,
  type EscenaEnEditado,
  type Pose,
} from "../edicion/escenas";
import { useMarca } from "../edicion/estilos";
import type { Marca } from "../marca";
import { buscarIcono } from "./iconos";
import { fuenteImagen } from "./ImagenInsertada";

const LIMITE = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

// Texto blanco con contorno, como los subtítulos: se lee sobre cualquier fondo.
const textoConContorno = (tamano: number, marca: Marca): React.CSSProperties => ({
  fontFamily: marca.fuente,
  fontWeight: 900,
  fontSize: tamano,
  lineHeight: 1.08,
  color: marca.colores.texto,
  WebkitTextStroke: `${tamano * 0.08}px ${marca.colores.contorno}`,
  paintOrder: "stroke fill",
  textShadow: `0 ${tamano * 0.05}px ${tamano * 0.15}px rgba(0,0,0,0.45)`,
  textWrap: "balance",
});

// El video siempre está montado aquí adentro; durante una escena 3D se transforma (gira, se
// pliega o se vuelve una ventana con la cara) y aparecen las capas de esa escena alrededor.
export const VideoEnEscena: React.FC<{
  escenas: EscenaEnEditado[];
  caraEntre: (desde: number, hasta: number) => Caja | null;
  children: React.ReactNode;
}> = ({ escenas, caraEntre, children }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const activa =
    escenas.find((e) => frame >= e.desdeFrame && frame < e.desdeFrame + e.duracionFrames) ?? null;
  const local = activa ? frame - activa.desdeFrame : 0;
  const p = activa ? progresoEscena(local, activa.duracionFrames) : 0;
  const cara = activa ? caraEntre(activa.desdeFrame, activa.desdeFrame + activa.duracionFrames) : null;
  const pose = activa
    ? mezclarPoses(
        poseNeutra(width, height),
        poseDeEscena({ escena: activa, width, height, cara, local, fps }),
        p,
      )
    : poseNeutra(width, height);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: activa ? 1 : 0,
          background: `radial-gradient(circle at 50% 35%, ${marca.colores.primario}, ${marca.colores.fondo} 75%)`,
        }}
      />
      <AbsoluteFill style={{ perspective: Math.max(width, height) * 1.6 }}>
        <AbsoluteFill
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${pose.giroX}deg) rotateY(${pose.giroY}deg)`,
          }}
        >
          {activa ? <CapasDetras escena={activa} pose={pose} p={p} /> : null}
          <div
            style={{
              position: "absolute",
              left: pose.x,
              top: pose.y,
              width: pose.ancho,
              height: pose.alto,
              borderRadius: pose.radio,
              overflow: "hidden",
              boxSizing: "border-box",
              border: activa ? `${base * 0.006 * p}px solid rgba(255,255,255,${0.9 * p})` : "none",
              boxShadow: activa ? `0 ${base * 0.03}px ${base * 0.08}px rgba(0,0,0,${0.55 * p})` : "none",
              transform: `rotateY(${pose.giroVentana}deg)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width,
                height,
                transformOrigin: "0 0",
                transform: `translate(${pose.dentroX}px, ${pose.dentroY}px) scale(${pose.dentroEscala})`,
              }}
            >
              {children}
            </div>
          </div>
          {activa ? (
            <CapasDelante escena={activa} pose={pose} p={p} local={local} cara={cara} />
          ) : null}
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Montaje en capas: tarjetas de color apiladas detrás del video.
const CapasDetras: React.FC<{ escena: EscenaEnEditado; pose: Pose; p: number }> = ({
  escena,
  pose,
  p,
}) => {
  const marca = useMarca();
  const { width, height } = useVideoConfig();
  if (escena.elemento.tipo !== "capas") return null;
  const paso = Math.min(width, height) * 0.055;
  return (
    <>
      {[2, 1].map((n) => (
        <div
          key={n}
          style={{
            position: "absolute",
            left: pose.x - n * paso,
            top: pose.y - n * paso,
            width: pose.ancho,
            height: pose.alto,
            borderRadius: pose.radio,
            backgroundColor: n === 1 ? marca.colores.primario : marca.colores.secundario,
            border: `${paso * 0.12}px solid rgba(255,255,255,0.35)`,
            opacity: (n === 1 ? 0.9 : 0.6) * p,
            transform: `translateZ(${-n * 90 * p}px)`,
          }}
        />
      ))}
    </>
  );
};

const CapasDelante: React.FC<{
  escena: EscenaEnEditado;
  pose: Pose;
  p: number;
  local: number;
  cara: Caja | null;
}> = ({ escena, pose, p, local, cara }) => {
  const e = escena.elemento;
  switch (e.tipo) {
    case "capas":
      return <TituloEIconos titulo={e.titulo} iconos={e.iconos} pose={pose} p={p} local={local} cara={cara} />;
    case "perspectiva":
      return <TextoEnPerspectiva texto={e.texto} destacar={e.destacar} lado={e.lado} pose={pose} p={p} local={local} />;
    case "tutorial":
      return (
        <>
          <TituloArriba titulo={e.titulo} p={p} local={local} />
          <Dispositivo marco={e.marco} pasos={e.pasos} momentos={escena.momentos} p={p} local={local} />
        </>
      );
    case "objeto3d":
      return (
        <>
          <TituloArriba titulo={e.titulo} p={p} local={local} />
          <Objeto archivo={e.archivo} etiquetas={e.etiquetas} momentos={escena.momentos} p={p} local={local} />
        </>
      );
  }
};

// Capas: título sobre la tarjeta del video e íconos flotando al costado contrario a la cara.
const TituloEIconos: React.FC<{
  titulo: string;
  iconos: string[];
  pose: Pose;
  p: number;
  local: number;
  cara: Caja | null;
}> = ({ titulo, iconos, pose, p, local, cara }) => {
  const marca = useMarca();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const techo = margenesSeguros(width, height).arriba * 0.8;
  const entradaTitulo = spring({ frame: local - 6, fps, config: { damping: 14 } });
  const tamanoIcono = base * 0.12;
  const iconosALaDerecha = cara ? cara.x + cara.ancho / 2 < width / 2 : false;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: pose.x,
          width: pose.ancho,
          top: techo,
          height: Math.max(base * 0.1, pose.y - techo - base * 0.02),
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          textAlign: "center",
          transform: `translateZ(${60 * p}px)`,
          opacity: p * entradaTitulo,
        }}
      >
        <div style={{ ...textoConContorno(base * 0.075, marca), scale: interpolate(entradaTitulo, [0, 1], [0.8, 1]) }}>
          {titulo}
        </div>
      </div>
      {iconos.map((nombre, i) => {
        const Icono = buscarIcono(nombre);
        if (!Icono) return null;
        const entrada = spring({ frame: local - 10 - i * 6, fps, config: { damping: 10 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: iconosALaDerecha
                ? pose.x + pose.ancho - tamanoIcono * 0.55
                : pose.x - tamanoIcono * 0.45,
              top: pose.y + pose.alto * (0.18 + i * 0.24),
              width: tamanoIcono,
              height: tamanoIcono,
              borderRadius: "50%",
              backgroundColor: marca.colores.primario,
              border: `${base * 0.006}px solid ${marca.colores.texto}`,
              boxShadow: `0 ${base * 0.015}px ${base * 0.03}px rgba(0,0,0,0.4)`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transform: `translateZ(${150 * p}px) scale(${entrada * p})`,
            }}
          >
            <Icono size={tamanoIcono * 0.52} color={marca.colores.texto} strokeWidth={2.4} />
          </div>
        );
      })}
    </>
  );
};

// Perspectiva: frase grande "con volumen" en un plano inclinado, al lado del video plegado.
const TextoEnPerspectiva: React.FC<{
  texto: string;
  destacar: string | null;
  lado: "izquierda" | "derecha";
  pose: Pose;
  p: number;
  local: number;
}> = ({ texto, destacar, lado, pose, p, local }) => {
  const marca = useMarca();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const margen = width * 0.05;
  const separacion = width * 0.03;
  const x = lado === "izquierda" ? margen : pose.x + pose.ancho + separacion;
  const ancho = lado === "izquierda" ? pose.x - separacion - margen : width - margen - x;
  const palabras = texto.trim().split(/\s+/);
  const destacadas = new Set((destacar ?? "").split(/\s+/).map(normalizar).filter(Boolean));
  const masLarga = Math.max(...palabras.map((w) => w.length));
  const tamano = Math.min(base * 0.2, ancho / (masLarga * 0.78), pose.alto / (palabras.length * 1.08));
  const volumen = Array.from(
    { length: 8 },
    (_, i) => `${(i + 1) * tamano * 0.012}px ${(i + 1) * tamano * 0.012}px 0 ${marca.colores.primario}`,
  ).join(", ");

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: pose.y,
        width: Math.max(0, ancho),
        height: pose.alto,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: lado === "izquierda" ? "flex-end" : "flex-start",
        transform: `rotateY(${(lado === "izquierda" ? 20 : -20) * p}deg)`,
        opacity: p,
      }}
    >
      {palabras.map((palabra, i) => {
        const entrada = spring({ frame: local - 8 - i * 4, fps, config: { damping: 12, mass: 0.6 } });
        const resaltada = destacadas.has(normalizar(palabra));
        return (
          <div
            key={i}
            style={{
              fontFamily: marca.fuente,
              fontWeight: 900,
              fontSize: tamano,
              lineHeight: 1.04,
              textTransform: "uppercase",
              color: resaltada ? marca.colores.acento : marca.colores.texto,
              textShadow: `${volumen}, 0 ${tamano * 0.15}px ${tamano * 0.25}px rgba(0,0,0,0.45)`,
              opacity: Math.min(1, entrada * 2),
              scale: interpolate(entrada, [0, 1], [1.4, 1]),
            }}
          >
            {palabra}
          </div>
        );
      })}
    </div>
  );
};

// Título de las escenas con la persona en una ventana (tutorial y objeto 3D).
const TituloArriba: React.FC<{ titulo: string | null; p: number; local: number }> = ({
  titulo,
  p,
  local,
}) => {
  const marca = useMarca();
  const { fps, width, height } = useVideoConfig();
  if (!titulo) return null;
  const base = Math.min(width, height);
  const { titulo: area } = distribucionConVentana(width, height);
  const entrada = spring({ frame: local - 6, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        position: "absolute",
        left: area.x,
        top: area.y,
        width: area.ancho,
        height: area.alto,
        display: "flex",
        alignItems: "center",
        opacity: p * entrada,
        translate: `${interpolate(entrada, [0, 1], [-base * 0.04, 0])}px 0`,
      }}
    >
      <div style={textoConContorno(base * 0.068, marca)}>{titulo}</div>
    </div>
  );
};

// Tutorial: capturas dentro de un celular o una ventana de navegador que flota en 3D.
const Dispositivo: React.FC<{
  marco: "celular" | "navegador";
  pasos: { archivo: string; texto: string | null }[];
  momentos: number[];
  p: number;
  local: number;
}> = ({ marco, pasos, momentos, p, local }) => {
  const marca = useMarca();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const { banda } = distribucionConVentana(width, height);
  const actual = momentos.reduce((ultimo, m, i) => (local >= m ? i : ultimo), 0);
  const paso = pasos[actual];
  const desdePaso = local - (momentos[actual] ?? 0);
  const giroPantalla = interpolate(desdePaso, [0, 10], [75, 0], {
    ...LIMITE,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const flotar = Math.sin((local / fps) * 1.1) * 4;

  const esCelular = marco === "celular";
  const alto = esCelular ? banda.alto * 0.9 : Math.min(banda.alto * 0.85, (banda.ancho * 0.95) * 0.64);
  const ancho = esCelular ? alto * 0.48 : alto / 0.64;
  const x = banda.x + (banda.ancho - ancho) / 2;
  const y = banda.y + (banda.alto - alto) / 2 - (paso?.texto ? base * 0.02 : 0);
  const entradaEtiqueta = spring({ frame: desdePaso - 4, fps, config: { damping: 13 } });

  const pantalla = (
    <Img
      src={fuenteImagen(paso.archivo)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `perspective(${base * 2}px) rotateY(${giroPantalla}deg)`,
        opacity: interpolate(giroPantalla, [0, 75], [1, 0.3]),
      }}
    />
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: ancho,
          height: alto,
          opacity: p,
          transform: `rotateY(${(-14 + flotar) * p}deg) rotateX(${6 * p}deg)`,
          ...(esCelular
            ? {
                padding: ancho * 0.035,
                borderRadius: ancho * 0.14,
                backgroundColor: "#0b0b0f",
                boxSizing: "border-box",
              }
            : {
                borderRadius: ancho * 0.02,
                backgroundColor: "#e4e4e7",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }),
          boxShadow: `0 ${base * 0.04}px ${base * 0.08}px rgba(0,0,0,0.5)`,
        }}
      >
        {esCelular ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: ancho * 0.11,
              overflow: "hidden",
              backgroundColor: "#000",
            }}
          >
            {pantalla}
            <div
              style={{
                position: "absolute",
                top: ancho * 0.04,
                left: "35%",
                width: "30%",
                height: ancho * 0.06,
                borderRadius: ancho * 0.03,
                backgroundColor: "#0b0b0f",
              }}
            />
          </div>
        ) : (
          <>
            <div
              style={{
                height: ancho * 0.045,
                display: "flex",
                alignItems: "center",
                gap: ancho * 0.012,
                paddingLeft: ancho * 0.02,
                flexShrink: 0,
              }}
            >
              {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                <div key={c} style={{ width: ancho * 0.015, height: ancho * 0.015, borderRadius: "50%", backgroundColor: c }} />
              ))}
            </div>
            <div style={{ flex: 1, overflow: "hidden", backgroundColor: "#fff" }}>{pantalla}</div>
          </>
        )}
      </div>
      {paso?.texto ? (
        <div
          style={{
            position: "absolute",
            left: banda.x,
            width: banda.ancho,
            top: y + alto - base * 0.03,
            display: "flex",
            justifyContent: "center",
            opacity: p * entradaEtiqueta,
            // Delante del celular, que gira hacia la cámara.
            transform: `translateZ(${base * 0.2}px) translateY(${interpolate(entradaEtiqueta, [0, 1], [base * 0.03, 0])}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: base * 0.02,
              padding: `${base * 0.016}px ${base * 0.03}px`,
              borderRadius: base * 0.03,
              backgroundColor: marca.colores.primario,
              boxShadow: `0 ${base * 0.012}px 0 ${marca.colores.contorno}`,
              fontFamily: marca.fuente,
              fontWeight: 900,
              fontSize: base * 0.046,
              color: marca.colores.texto,
              maxWidth: banda.ancho,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: base * 0.065,
                height: base * 0.065,
                borderRadius: "50%",
                backgroundColor: marca.colores.acento,
                color: marca.colores.textoSobreAcento,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: base * 0.04,
              }}
            >
              {actual + 1}
            </span>
            {paso.texto}
          </div>
        </div>
      ) : null}
    </>
  );
};

// 3D explicativo: la imagen gira suavemente sobre su sombra y aparecen etiquetas.
const Objeto: React.FC<{
  archivo: string;
  etiquetas: { texto: string }[];
  momentos: number[];
  p: number;
  local: number;
}> = ({ archivo, etiquetas, momentos, p, local }) => {
  const marca = useMarca();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const { banda } = distribucionConVentana(width, height);
  const entrada = spring({ frame: local - 4, fps, config: { damping: 14 } });
  const giro = Math.sin((local / fps) * 0.9) * 18;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: banda.x + banda.ancho * 0.25,
          width: banda.ancho * 0.5,
          top: banda.y + banda.alto * 0.86,
          height: base * 0.05,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.5), transparent 70%)",
          opacity: p,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: banda.x,
          top: banda.y,
          width: banda.ancho,
          height: banda.alto * 0.9,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: p,
        }}
      >
        <Img
          src={fuenteImagen(archivo)}
          style={{
            maxWidth: banda.ancho * 0.84,
            maxHeight: banda.alto * 0.8,
            transform: `rotateX(10deg) rotateY(${giro}deg) scale(${interpolate(entrada, [0, 1], [0.7, 1])})`,
            filter: `drop-shadow(0 ${base * 0.03}px ${base * 0.04}px rgba(0,0,0,0.45))`,
          }}
        />
      </div>
      {etiquetas.map((etiqueta, i) => {
        const aparicion = spring({ frame: local - (momentos[i] ?? 0), fps, config: { damping: 13 } });
        if (local < (momentos[i] ?? 0)) return null;
        const izquierda = i % 2 === 0;
        const fila = Math.floor(i / 2);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: banda.y + banda.alto * (0.1 + fila * 0.28),
              ...(izquierda ? { left: banda.x } : { right: width - (banda.x + banda.ancho) }),
              display: "flex",
              alignItems: "center",
              gap: base * 0.015,
              flexDirection: izquierda ? "row" : "row-reverse",
              padding: `${base * 0.012}px ${base * 0.022}px`,
              borderRadius: base * 0.025,
              backgroundColor: `${marca.colores.fondo}E6`,
              border: `${base * 0.004}px solid ${marca.colores.acento}`,
              fontFamily: marca.fuente,
              fontWeight: 800,
              fontSize: base * 0.042,
              color: marca.colores.texto,
              opacity: p * aparicion,
              translate: `${interpolate(aparicion, [0, 1], [izquierda ? -base * 0.05 : base * 0.05, 0])}px 0`,
            }}
          >
            <span
              style={{
                width: base * 0.022,
                height: base * 0.022,
                borderRadius: "50%",
                backgroundColor: marca.colores.acento,
                flexShrink: 0,
              }}
            />
            {etiqueta.texto}
          </div>
        );
      })}
    </>
  );
};
