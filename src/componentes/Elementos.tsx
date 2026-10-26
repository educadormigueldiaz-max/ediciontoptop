import { AbsoluteFill, Sequence } from "remotion";
import type { ElementoColocado } from "../edicion/encuadre";
import { IconoAnimado } from "./IconoAnimado";
import { ImagenInsertada } from "./ImagenInsertada";
import { Lettering } from "./Lettering";
import { ListaAnimada } from "./ListaAnimada";

// Orden de capas: lo que tapa toda la pantalla va primero (abajo), el lettering al final (arriba).
const capa = ({ elemento }: ElementoColocado) =>
  elemento.tipo === "imagen" && elemento.modo === "pantalla-completa"
    ? 0
    : elemento.tipo === "lettering"
      ? 2
      : 1;

const Elemento: React.FC<{ item: ElementoColocado }> = ({ item }) => {
  const { elemento, duracionFrames, momentos, zona } = item;
  switch (elemento.tipo) {
    case "lista":
      return (
        <ListaAnimada
          titulo={elemento.titulo}
          puntos={elemento.puntos.map((p, i) => ({ texto: p.texto, desdeFrame: momentos[i] }))}
          duracionFrames={duracionFrames}
          zona={zona}
        />
      );
    case "lettering":
      return (
        <Lettering
          texto={elemento.texto}
          destacar={elemento.destacar}
          fondo={elemento.fondo}
          duracionFrames={duracionFrames}
          zona={zona}
        />
      );
    case "icono":
      return (
        <IconoAnimado
          icono={elemento.icono}
          texto={elemento.texto}
          posicion={elemento.posicion}
          duracionFrames={duracionFrames}
          zona={zona}
        />
      );
    case "imagen":
      return (
        <ImagenInsertada
          archivo={elemento.archivo}
          modo={elemento.modo}
          texto={elemento.texto}
          duracionFrames={duracionFrames}
          zona={zona}
        />
      );
    default:
      // Las escenas 3D y los recortes se dibujan con el video (Escena3D.tsx y Recorte.tsx).
      return null;
  }
};

const NOMBRES: Record<ElementoColocado["elemento"]["tipo"], string> = {
  lista: "Lista",
  lettering: "Lettering",
  icono: "Ícono",
  imagen: "Imagen",
  capas: "Capas 3D",
  perspectiva: "Perspectiva 3D",
  tutorial: "Tutorial 3D",
  objeto3d: "Objeto 3D",
  detras: "Texto detrás",
  fondo: "Fondo nuevo",
  marco: "Marco",
  efecto: "Efecto detrás",
  apoyo: "Escena de apoyo",
  color: "Color",
};

export const Elementos: React.FC<{ items: ElementoColocado[] }> = ({ items }) => (
  <AbsoluteFill>
    {[...items]
      .sort((a, b) => capa(a) - capa(b))
      .map((item, i) => (
        <Sequence
          key={i}
          from={item.desdeFrame}
          durationInFrames={item.duracionFrames}
          name={NOMBRES[item.elemento.tipo]}
        >
          <Elemento item={item} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
