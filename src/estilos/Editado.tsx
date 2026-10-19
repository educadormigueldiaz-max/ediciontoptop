import { useCallback, useMemo } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  Series,
  staticFile,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { Cierre } from "../componentes/Cierre";
import { Gancho } from "../componentes/Gancho";
import { Subtitulos } from "../componentes/Subtitulos";
import { VideoEncuadrado } from "../componentes/VideoEncuadrado";
import { DIMENSIONES, esquemaEdicion, FPS, type PropsEditado } from "../edicion/esquema";
import { Elementos } from "../componentes/Elementos";
import { caraEnSalida, colocarElementos } from "../edicion/encuadre";
import {
  ajustarLetterings,
  calcularTramos,
  elementosEnElEditado,
  framesDeVideo,
  framesTotales,
  palabrasEnElEditado,
} from "../edicion/linea-de-tiempo";
import { marca } from "../marca";

// Lee public/proyectos/<id>/edicion.json y ajusta duración y tamaño del video.
export const calcularMetadatos: CalculateMetadataFunction<PropsEditado> = async ({
  props,
  abortSignal,
}) => {
  const ruta = `proyectos/${props.proyecto}/edicion.json`;
  const respuesta = await fetch(staticFile(ruta), { signal: abortSignal, cache: "no-store" });
  if (!respuesta.ok) {
    throw new Error(`No encuentro public/${ruta}. Corre primero: npm run preparar -- <video>`);
  }
  const resultado = esquemaEdicion.safeParse(await respuesta.json());
  if (!resultado.success) {
    throw new Error(`public/${ruta} tiene un error:\n${z.prettifyError(resultado.error)}`);
  }
  const edicion = resultado.data;
  const formato = props.formato ?? edicion.opciones.formato;
  return {
    ...DIMENSIONES[formato],
    fps: FPS,
    durationInFrames: framesTotales(edicion, FPS),
    defaultOutName: `${props.proyecto}-${formato.replace(":", "x")}`,
    props: { ...props, edicion },
  };
};

// Estilo "Crudo → editado": tramos sin pausas, subtítulos, gancho y cierre opcionales.
export const Editado: React.FC<PropsEditado> = ({ edicion }) => {
  const { fps, width, height } = useVideoConfig();
  const tramos = useMemo(() => (edicion ? calcularTramos(edicion, fps) : []), [edicion, fps]);
  // Los lettering se alinean con las palabras que repiten, y esas palabras salen de los subtítulos.
  const letterings = useMemo(() => (edicion ? ajustarLetterings(edicion) : null), [edicion]);
  const captions = useMemo(
    () =>
      edicion && letterings
        ? palabrasEnElEditado(edicion, tramos, fps, letterings.palabrasOcultas)
        : [],
    [edicion, letterings, tramos, fps],
  );
  const caraEntre = useCallback(
    (desde: number, hasta: number) =>
      edicion ? caraEnSalida(edicion, tramos, fps, width, height, desde, hasta) : null,
    [edicion, tramos, fps, width, height],
  );
  // Cada elemento va en el espacio libre que deja la cara.
  const elementos = useMemo(
    () =>
      edicion && letterings
        ? colocarElementos({
            items: elementosEnElEditado({ ...edicion, elementos: letterings.elementos }, tramos, fps),
            edicion,
            width,
            height,
            caraEntre,
          })
        : [],
    [edicion, letterings, tramos, fps, width, height, caraEntre],
  );
  if (!edicion) return null;

  const { opciones } = edicion;
  const finVideo = framesDeVideo(tramos);
  // Sin subtítulos durante un lettering (la frase ya está en pantalla) o cuando un elemento
  // necesita su espacio.
  const sinSubtitulos = elementos
    .filter((e) => e.ocultaSubtitulos)
    .map((e) => [e.desdeFrame, e.desdeFrame + e.duracionFrames] as const);

  return (
    <AbsoluteFill style={{ backgroundColor: marca.colores.fondo }}>
      <Series>
        {tramos.map((tramo, i) => (
          <Series.Sequence key={i} durationInFrames={tramo.duracionFrames} name={`Tramo ${i + 1}`}>
            <VideoEncuadrado
              src={edicion.video}
              anchoOriginal={edicion.ancho}
              altoOriginal={edicion.alto}
              trimBefore={tramo.trimBefore}
              duracionFrames={tramo.duracionFrames}
              enfoqueX={opciones.enfoqueX}
              enfoqueY={opciones.enfoqueY}
              zoom={tramo.zoom}
              enfasis={edicion.enfasis}
            />
          </Series.Sequence>
        ))}
      </Series>

      {elementos.length > 0 ? (
        <Sequence durationInFrames={finVideo} name="Elementos">
          <Elementos items={elementos} />
        </Sequence>
      ) : null}

      {opciones.subtitulos && captions.length > 0 ? (
        <Sequence durationInFrames={finVideo} name="Subtítulos">
          <Subtitulos
            captions={captions}
            estilo={opciones.estiloSubtitulos}
            posicion={opciones.posicionSubtitulos}
            ocultarEn={sinSubtitulos}
            caraEntre={caraEntre}
          />
        </Sequence>
      ) : null}

      {opciones.gancho ? (
        <Sequence durationInFrames={Math.round(opciones.duracionGancho * fps)} name="Gancho">
          <Gancho
            texto={opciones.gancho}
            duracionFrames={Math.round(opciones.duracionGancho * fps)}
          />
        </Sequence>
      ) : null}

      {opciones.cierre ? (
        <Sequence
          from={finVideo}
          durationInFrames={Math.round(opciones.cierre.duracion * fps)}
          name="Cierre"
        >
          <Cierre texto={opciones.cierre.texto} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
