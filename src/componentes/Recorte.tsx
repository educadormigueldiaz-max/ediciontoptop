import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { margenesSeguros, type Caja } from "../edicion/encuadre";
import { progresoEscena } from "../edicion/escenas";
import type { Edicion, ElementoRecorte } from "../edicion/esquema";
import type { Tramo } from "../edicion/linea-de-tiempo";
import {
  caraSupuesta,
  geometriaMarco,
  mascaraDe,
  tramosDentro,
  type RecorteEnEditado,
} from "../edicion/recortes";
import { useMarca } from "../edicion/estilos";
import { fuenteImagen } from "./ImagenInsertada";
import { normalizar, tamanoQueCabe } from "./Lettering";
import { VideoEncuadrado } from "./VideoEncuadrado";

// Recorte de fondo: la persona (recortada con `npm run recortar`) va siempre encima de todo,
// así que lo que se pone "detrás" nunca le tapa la cara.

// Frase grande detrás de la persona: las palabras suben una tras otra.
const TextoDetras: React.FC<{
  texto: string;
  destacar: string | null;
  zona: Caja;
  // Dónde se apoya el texto dentro de la zona.
  alinear: "abajo" | "centro";
  duracionFrames: number;
}> = ({ texto, destacar, zona, alinear, duracionFrames }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const palabras = texto.trim().split(/\s+/);
  const destacadas = new Set((destacar ?? "").split(/\s+/).map(normalizar).filter(Boolean));
  const tamano = tamanoQueCabe(palabras, zona.ancho, zona.alto, base, 0.3);
  const salida = interpolate(frame, [duracionFrames - 6, duracionFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: zona.x,
        top: zona.y,
        width: zona.ancho,
        height: zona.alto,
        display: "flex",
        justifyContent: "center",
        alignItems: alinear === "abajo" ? "flex-end" : "center",
        opacity: salida,
      }}
    >
      <div
        style={{
          fontFamily: marca.fuente,
          fontWeight: 900,
          fontSize: tamano,
          lineHeight: 0.95,
          letterSpacing: "-0.03em",
          textTransform: "uppercase",
          textAlign: "center",
          textWrap: "balance",
          color: marca.colores.texto,
          textShadow: `0 ${tamano * 0.04}px ${tamano * 0.12}px rgba(0,0,0,0.35)`,
          scale: interpolate(frame, [0, duracionFrames], [1, 1.05]),
        }}
      >
        {palabras.map((palabra, i) => {
          const entrada = spring({ frame: frame - i * 3, fps, config: { damping: 14, mass: 0.7 } });
          return (
            <span key={i}>
              {i === 0 ? "" : " "}
              <span
                style={{
                  display: "inline-block",
                  color: destacadas.has(normalizar(palabra)) ? marca.colores.acento : marca.colores.texto,
                  opacity: Math.min(1, entrada * 1.5),
                  translate: `0 ${interpolate(entrada, [0, 1], [tamano * 0.6, 0])}px`,
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

// Fondo nuevo: color o degradado de src/marca.ts, o una imagen con un zoom lento.
const FondoNuevo: React.FC<{
  estilo: "color" | "degradado" | "imagen";
  archivo: string | null;
  duracionFrames: number;
}> = ({ estilo, archivo, duracionFrames }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  if (estilo === "imagen" && archivo) {
    return (
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: marca.colores.fondo }}>
        <Img
          src={fuenteImagen(archivo)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: interpolate(frame, [0, duracionFrames], [1, 1.08]),
          }}
        />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill
      style={{
        background:
          estilo === "color"
            ? marca.colores.primario
            : `radial-gradient(circle at 50% 30%, ${marca.colores.secundario} 0%, ${marca.colores.primario} 45%, ${marca.colores.fondo} 100%)`,
      }}
    />
  );
};

// Silueta de recorte del marco: todo lo que está arriba de la mitad de la forma, más la mitad de
// abajo de la forma. Así la persona queda "dentro" abajo y la cabeza sale por arriba.
const recorteDelMarco = (forma: "circulo" | "tarjeta", c: Caja & { radio: number }, width: number) => {
  const medio = c.y + c.alto / 2;
  const x2 = c.x + c.ancho;
  const y2 = c.y + c.alto;
  if (forma === "circulo") {
    const r = c.ancho / 2;
    return `path("M 0 0 H ${width} V ${medio} H ${x2} A ${r} ${r} 0 0 1 ${c.x} ${medio} H 0 Z")`;
  }
  const r = c.radio;
  return `path("M 0 0 H ${width} V ${medio} H ${x2} V ${y2 - r} A ${r} ${r} 0 0 1 ${x2 - r} ${y2} H ${c.x + r} A ${r} ${r} 0 0 1 ${c.x} ${y2 - r} V ${medio} H 0 Z")`;
};

// Una escena de recorte. `persona` es la persona recortada, del tamaño del cuadro completo;
// `cara`, dónde está su cara en ese cuadro.
export const EscenaRecorte: React.FC<{
  elemento: ElementoRecorte;
  duracionFrames: number;
  cara: Caja | null;
  persona: React.ReactNode;
}> = ({ elemento, duracionFrames, cara: caraDada, persona }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const m = margenesSeguros(width, height);
  const cara = caraDada ?? caraSupuesta(width, height);
  const aparicion = interpolate(frame, [0, 8, duracionFrames - 6, duracionFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (elemento.tipo === "fondo") {
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ opacity: aparicion }}>
          <FondoNuevo estilo={elemento.estilo} archivo={elemento.archivo} duracionFrames={duracionFrames} />
        </AbsoluteFill>
        {persona}
      </AbsoluteFill>
    );
  }

  if (elemento.tipo === "detras") {
    // "arriba": de la zona segura de arriba hasta el pelo, para que la cabeza tape solo la parte
    // de abajo de las letras (como en las portadas). "centro": detrás del pecho.
    // (`cara` ya incluye el pelo: su borde de arriba es la coronilla.) Puede subir hasta la mitad
    // de la zona segura de arriba: si la cara está alta, así la cabeza no tapa la palabra entera.
    const techo = m.arriba * 0.5;
    const zona: Caja =
      elemento.posicion === "arriba"
        ? {
            x: m.lados * 0.5,
            y: techo,
            ancho: width - m.lados,
            alto: Math.max(height * 0.14, cara.y + cara.alto * 0.12 - techo),
          }
        : {
            x: m.lados * 0.5,
            y: Math.min(height - m.abajo - height * 0.3, cara.y + cara.alto * 1.2),
            ancho: width - m.lados,
            alto: height * 0.3,
          };
    return (
      <AbsoluteFill>
        <TextoDetras
          texto={elemento.texto}
          destacar={elemento.destacar}
          zona={zona}
          alinear={elemento.posicion === "arriba" ? "abajo" : "centro"}
          duracionFrames={duracionFrames}
        />
        {persona}
      </AbsoluteFill>
    );
  }

  // Marco: primero aparece el fondo, después la forma y la persona se acomoda saliendo de ella.
  const p = progresoEscena(frame, duracionFrames);
  const fondo = interpolate(p, [0, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mover = interpolate(p, [0.3, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const g = geometriaMarco({ forma: elemento.forma, width, height, cara });
  const crecer = spring({ frame: frame - 4, fps, config: { damping: 13 } });
  const escalaForma = interpolate(crecer, [0, 1], [0.6, 1]) * interpolate(p, [0, 0.3], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const forma = {
    ...g.forma,
    x: g.forma.x + (g.forma.ancho * (1 - escalaForma)) / 2,
    y: g.forma.y + (g.forma.alto * (1 - escalaForma)) / 2,
    ancho: g.forma.ancho * escalaForma,
    alto: g.forma.alto * escalaForma,
  };
  const escala = 1 + (g.escala - 1) * mover;
  // El texto se apoya un poco más abajo de la coronilla: la cabeza tapa solo la parte de abajo
  // de las letras, como en las portadas.
  const zonaTexto: Caja = {
    x: m.lados * 0.5,
    y: m.arriba * 0.5,
    ancho: width - m.lados,
    alto: Math.max(height * 0.14, g.cabeza + cara.alto * g.escala * 0.12 - m.arriba * 0.5),
  };

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: fondo,
          background: `radial-gradient(circle at 50% 45%, ${marca.colores.fondo}, #000 120%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: forma.x,
          top: forma.y,
          width: forma.ancho,
          height: forma.alto,
          borderRadius: elemento.forma === "circulo" ? "50%" : forma.radio,
          background: `linear-gradient(160deg, ${marca.colores.secundario}, ${marca.colores.primario} 70%)`,
          boxShadow: `0 ${forma.alto * 0.04}px ${forma.alto * 0.12}px rgba(0,0,0,0.45)`,
          opacity: fondo,
        }}
      />
      {elemento.texto && mover > 0 ? (
        <Sequence from={Math.round(duracionFrames * 0.1)} layout="none">
          <TextoDetras
            texto={elemento.texto}
            destacar={elemento.destacar}
            zona={zonaTexto}
            alinear="abajo"
            duracionFrames={duracionFrames - Math.round(duracionFrames * 0.1)}
          />
        </Sequence>
      ) : null}
      <AbsoluteFill style={{ clipPath: fondo > 0 ? recorteDelMarco(elemento.forma, forma, width) : undefined }}>
        <AbsoluteFill
          style={{
            transformOrigin: "0 0",
            translate: `${g.x * mover}px ${g.y * mover}px`,
            scale: String(escala),
          }}
        >
          {persona}
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// La persona recortada del video, en los tramos que caen dentro del elemento.
const PersonaDelVideo: React.FC<{
  edicion: Edicion;
  tramos: Tramo[];
  item: RecorteEnEditado;
  enfoque: { x: number; y: number };
}> = ({ edicion, tramos, item, enfoque }) => (
  <AbsoluteFill>
    {tramosDentro(tramos, item.desdeFrame, item.desdeFrame + item.duracionFrames).map((t, i) => (
      <Sequence key={i} from={t.desdeFrame} durationInFrames={t.duracionFrames} name="Persona recortada">
        <VideoEncuadrado
          src={edicion.video}
          anchoOriginal={edicion.ancho}
          altoOriginal={edicion.alto}
          trimBefore={t.trimBefore}
          duracionFrames={t.duracionFrames}
          enfoqueX={enfoque.x}
          enfoqueY={enfoque.y}
          zoom={t.zoom}
          enfasis={edicion.enfasis}
          mascara={(cuadro) => mascaraDe(edicion.recorte, cuadro)}
        />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const NOMBRES: Record<ElementoRecorte["tipo"], string> = {
  detras: "Texto detrás",
  fondo: "Fondo nuevo",
  marco: "Marco",
};

// El texto detrás usa todo el espacio que ocupa la cara mientras dura (para quedar siempre por
// encima de ella). El marco mueve a la persona una sola vez: usa la cara del momento central,
// porque si la persona camina, el espacio total es mucho más grande que su cabeza.
const caraDe = (item: RecorteEnEditado, caraEntre: (desde: number, hasta: number) => Caja | null) => {
  if (item.elemento.tipo !== "marco") {
    return caraEntre(item.desdeFrame, item.desdeFrame + item.duracionFrames);
  }
  const mitad = item.desdeFrame + Math.floor(item.duracionFrames / 2);
  return caraEntre(mitad, mitad + 1) ?? caraEntre(item.desdeFrame, item.desdeFrame + item.duracionFrames);
};

// Todos los elementos de recorte del video, encima del video normal.
export const Recortes: React.FC<{
  items: RecorteEnEditado[];
  edicion: Edicion;
  tramos: Tramo[];
  enfoque: { x: number; y: number };
  caraEntre: (desde: number, hasta: number) => Caja | null;
}> = ({ items, edicion, tramos, enfoque, caraEntre }) => (
  <AbsoluteFill>
    {items.map((item, i) => (
        <Sequence
          key={i}
          from={item.desdeFrame}
          durationInFrames={item.duracionFrames}
          name={NOMBRES[item.elemento.tipo]}
        >
          <EscenaRecorte
            elemento={item.elemento}
            duracionFrames={item.duracionFrames}
            cara={caraDe(item, caraEntre)}
            persona={<PersonaDelVideo edicion={edicion} tramos={tramos} item={item} enfoque={enfoque} />}
          />
        </Sequence>
      ))}
  </AbsoluteFill>
);
