import type { Caption } from "@remotion/captions";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { VideoEnEscena } from "../componentes/Escena3D";
import { Gancho } from "../componentes/Gancho";
import { IconoAnimado } from "../componentes/IconoAnimado";
import { ImagenInsertada } from "../componentes/ImagenInsertada";
import { Lettering } from "../componentes/Lettering";
import { ListaAnimada } from "../componentes/ListaAnimada";
import { EscenaRecorte } from "../componentes/Recorte";
import { Subtitulos } from "../componentes/Subtitulos";
import type { EscenaEnEditado } from "../edicion/escenas";
import type { Caja } from "../edicion/encuadre";
import { FPS, type ElementoRecorte } from "../edicion/esquema";
import { marca } from "../marca";

// Composiciones de prueba para ajustar la marca sin necesitar un video.

const FRASE_DE_MUESTRA =
  "Así se ven tus subtítulos. Cambia los colores y la fuente en src/marca.ts.";

const captionsDeMuestra = (msPorPalabra: number): Caption[] =>
  FRASE_DE_MUESTRA.split(" ").map((palabra, i) => ({
    text: (i === 0 ? "" : " ") + palabra,
    startMs: 600 + i * msPorPalabra,
    endMs: 600 + (i + 1) * msPorPalabra,
    timestampMs: null,
    confidence: null,
    pageBreakAfter: /[.!?]$/.test(palabra),
  }));

const FondoDeMuestra: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${interpolate(frame, [0, 300], [160, 220])}deg, ${marca.colores.fondo}, ${marca.colores.primario} 60%, ${marca.colores.secundario})`,
      }}
    />
  );
};

export const MuestraSubtitulos: React.FC<{ estilo: "palabra" | "frase" }> = ({
  estilo,
}) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <FondoDeMuestra />
      <Sequence durationInFrames={Math.round(2.5 * fps)} name="Gancho">
        <Gancho
          texto="Edita videos con IA"
          duracionFrames={Math.round(2.5 * fps)}
        />
      </Sequence>
      <Subtitulos
        captions={captionsDeMuestra(380)}
        estilo={estilo}
        posicion={0.7}
      />
    </AbsoluteFill>
  );
};

// Imagen de ejemplo dibujada en SVG (en un video real se usa un archivo de public/imagenes).
const IMAGEN_DE_MUESTRA = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${marca.colores.secundario}"/><stop offset="1" stop-color="${marca.colores.primario}"/>
    </linearGradient></defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <circle cx="600" cy="360" r="170" fill="white" opacity="0.9"/>
    <text x="600" y="660" font-family="sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">Tu imagen aquí</text>
  </svg>`,
)}`;

// Los 4 estilos de la fase 2, uno tras otro.
export const MuestraElementos: React.FC = () => {
  const { fps } = useVideoConfig();
  const s = (segundos: number) => Math.round(segundos * fps);
  return (
    <AbsoluteFill>
      <FondoDeMuestra />
      <Sequence durationInFrames={s(4.5)} name="Lista">
        <ListaAnimada
          titulo="3 claves para tu video"
          puntos={[
            { texto: "Engancha en 3 segundos", desdeFrame: s(0.5) },
            { texto: "Una idea por video", desdeFrame: s(1.5) },
            { texto: "Cierra con una acción", desdeFrame: s(2.5) },
          ]}
          duracionFrames={s(4.5)}
        />
      </Sequence>
      <Sequence from={s(4.5)} durationInFrames={s(2)} name="Ícono">
        <IconoAnimado
          icono="dinero"
          texto="Ahorra"
          posicion="arriba-derecha"
          duracionFrames={s(2)}
        />
      </Sequence>
      <Sequence from={s(6.5)} durationInFrames={s(2.5)} name="Lettering">
        <Lettering
          texto="La idea gana espacio"
          destacar="espacio"
          fondo="color"
          duracionFrames={s(2.5)}
        />
      </Sequence>
      <Sequence from={s(9)} durationInFrames={s(3)} name="Imagen">
        <ImagenInsertada
          archivo={IMAGEN_DE_MUESTRA}
          modo="tarjeta"
          texto="Así se ve una imagen insertada"
          duracionFrames={s(3)}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// --- Escenas 3D de la fase 3, con un "video" dibujado en lugar de una grabación. ---

const svg = (contenido: string, ancho: number, alto: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">${contenido}</svg>`,
  )}`;

const PANTALLA = (color: string, titulo: string) =>
  svg(
    `<rect width="540" height="1170" fill="#f4f4f5"/>
     <rect width="540" height="150" fill="${color}"/>
     <text x="40" y="105" font-family="sans-serif" font-size="46" font-weight="bold" fill="white">${titulo}</text>
     ${[0, 1, 2, 3]
       .map(
         (i) =>
           `<rect x="40" y="${200 + i * 230}" width="460" height="190" rx="28" fill="white" stroke="#e4e4e7" stroke-width="4"/>
            <rect x="70" y="${230 + i * 230}" width="120" height="120" rx="20" fill="${color}" opacity="0.25"/>
            <rect x="215" y="${245 + i * 230}" width="250" height="26" rx="13" fill="#a1a1aa"/>
            <rect x="215" y="${290 + i * 230}" width="180" height="22" rx="11" fill="#d4d4d8"/>`,
       )
       .join("")}`,
    540,
    1170,
  );

const OBJETO = svg(
  `<polygon points="300,60 540,190 300,320 60,190" fill="${marca.colores.secundario}"/>
   <polygon points="60,190 300,320 300,560 60,430" fill="${marca.colores.primario}"/>
   <polygon points="540,190 300,320 300,560 540,430" fill="#4c1d95"/>
   <rect x="120" y="300" width="70" height="90" fill="white" opacity="0.85" transform="skewY(28) translate(0,-60)"/>`,
  600,
  620,
);

const VideoDeMuestra: React.FC = () => (
  <AbsoluteFill>
    <FondoDeMuestra />
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", gap: 40 }}
    >
      <div
        style={{
          width: "42%",
          aspectRatio: "1",
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.85)",
        }}
      />
      <div
        style={{
          fontFamily: marca.fuente,
          fontWeight: 900,
          fontSize: 90,
          color: "white",
        }}
      >
        Tu video
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

const s = (segundos: number) => Math.round(segundos * FPS);

const ESCENAS_DE_MUESTRA: EscenaEnEditado[] = [
  {
    elemento: {
      tipo: "capas",
      inicio: 0,
      fin: 0,
      titulo: "Tu idea en capas",
      iconos: ["video", "idea", "rayo"],
    },
    desdeFrame: s(0.5),
    duracionFrames: s(3.5),
    momentos: [],
  },
  {
    elemento: {
      tipo: "perspectiva",
      inicio: 0,
      fin: 0,
      texto: "Más alcance cada día",
      destacar: "alcance",
      lado: "izquierda",
    },
    desdeFrame: s(4.5),
    duracionFrames: s(3.5),
    momentos: [],
  },
  {
    elemento: {
      tipo: "tutorial",
      inicio: 0,
      fin: 0,
      titulo: "Así se publica",
      marco: "celular",
      pasos: [
        {
          archivo: PANTALLA(marca.colores.primario, "Inicio"),
          texto: "Abre la app",
          en: 0,
        },
        {
          archivo: PANTALLA(marca.colores.secundario, "Subir"),
          texto: "Sube el video",
          en: 0,
        },
      ],
    },
    desdeFrame: s(8.5),
    duracionFrames: s(4),
    momentos: [0, s(2)],
  },
  {
    elemento: {
      tipo: "objeto3d",
      inicio: 0,
      fin: 0,
      archivo: OBJETO,
      titulo: "Así funciona",
      etiquetas: [
        { texto: "Entrada", en: 0 },
        { texto: "Salida", en: 0 },
      ],
    },
    desdeFrame: s(13),
    duracionFrames: s(4),
    momentos: [s(0.8), s(1.6)],
  },
];

export const MuestraEscenas3D: React.FC = () => (
  <VideoEnEscena escenas={ESCENAS_DE_MUESTRA} caraEntre={() => null}>
    <VideoDeMuestra />
  </VideoEnEscena>
);

// --- Recorte de fondo de la fase 4, con una silueta dibujada en lugar de una persona real. ---

// Silueta en un cuadro de 1080 x 1920, y dónde queda su cara (con el pelo).
const SILUETA = svg(
  `<g fill="#f4f4f5">
     <circle cx="540" cy="620" r="170"/>
     <rect x="470" y="760" width="140" height="120" rx="40"/>
     <path d="M 200 1920 L 200 1150 Q 200 860 540 860 Q 880 860 880 1150 L 880 1920 Z"/>
   </g>
   <g fill="#3f3f46">
     <circle cx="480" cy="610" r="18"/><circle cx="600" cy="610" r="18"/>
     <rect x="490" y="690" width="100" height="16" rx="8"/>
   </g>`,
  1080,
  1920,
);
const CARA_SILUETA: Caja = { x: 350, y: 420, ancho: 380, alto: 420 };

const Silueta: React.FC = () => (
  <AbsoluteFill>
    <Img src={SILUETA} style={{ width: "100%", height: "100%" }} />
  </AbsoluteFill>
);

const RECORTES_DE_MUESTRA: Array<{ elemento: ElementoRecorte; desde: number; duracion: number }> = [
  {
    elemento: { tipo: "detras", inicio: 0, fin: 0, texto: "Edita con IA", destacar: "IA", posicion: "arriba" },
    desde: 0,
    duracion: 3.5,
  },
  {
    elemento: { tipo: "fondo", inicio: 0, fin: 0, estilo: "degradado", archivo: null },
    desde: 4,
    duracion: 3.5,
  },
  {
    elemento: { tipo: "marco", inicio: 0, fin: 0, forma: "circulo", texto: "Tu marca", destacar: "marca" },
    desde: 8,
    duracion: 3.5,
  },
  {
    elemento: { tipo: "marco", inicio: 0, fin: 0, forma: "tarjeta", texto: null, destacar: null },
    desde: 12,
    duracion: 3.5,
  },
];

export const MuestraRecorte: React.FC = () => (
  <AbsoluteFill>
    <FondoDeMuestra />
    <Silueta />
    {RECORTES_DE_MUESTRA.map(({ elemento, desde, duracion }, i) => (
      <Sequence key={i} from={s(desde)} durationInFrames={s(duracion)} name={elemento.tipo}>
        <EscenaRecorte elemento={elemento} duracionFrames={s(duracion)} cara={CARA_SILUETA} persona={<Silueta />} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
