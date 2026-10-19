import { AbsoluteFill, Sequence } from "remotion";
import type { ElementoEnEditado } from "../edicion/linea-de-tiempo";
import { IconoAnimado } from "./IconoAnimado";
import { ImagenInsertada } from "./ImagenInsertada";
import { Lettering } from "./Lettering";
import { ListaAnimada } from "./ListaAnimada";

// Orden de capas: lo que tapa toda la pantalla va primero (abajo), el lettering al final (arriba).
const capa = ({ elemento }: ElementoEnEditado) =>
  elemento.tipo === "imagen" && elemento.modo === "pantalla-completa"
    ? 0
    : elemento.tipo === "lettering"
      ? 2
      : 1;

const Elemento: React.FC<{ item: ElementoEnEditado }> = ({ item }) => {
  const { elemento, duracionFrames, momentos } = item;
  switch (elemento.tipo) {
    case "lista":
      return (
        <ListaAnimada
          titulo={elemento.titulo}
          puntos={elemento.puntos.map((p, i) => ({ texto: p.texto, desdeFrame: momentos[i] }))}
          duracionFrames={duracionFrames}
        />
      );
    case "lettering":
      return (
        <Lettering
          texto={elemento.texto}
          destacar={elemento.destacar}
          fondo={elemento.fondo}
          duracionFrames={duracionFrames}
        />
      );
    case "icono":
      return (
        <IconoAnimado
          icono={elemento.icono}
          texto={elemento.texto}
          posicion={elemento.posicion}
          duracionFrames={duracionFrames}
        />
      );
    case "imagen":
      return (
        <ImagenInsertada
          archivo={elemento.archivo}
          modo={elemento.modo}
          texto={elemento.texto}
          duracionFrames={duracionFrames}
        />
      );
  }
};

const NOMBRES = { lista: "Lista", lettering: "Lettering", icono: "Ícono", imagen: "Imagen" };

export const Elementos: React.FC<{ items: ElementoEnEditado[] }> = ({ items }) => (
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
