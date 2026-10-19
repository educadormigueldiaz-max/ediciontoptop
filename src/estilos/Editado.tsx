import { useMemo } from "react";
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
import {
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
  const { fps } = useVideoConfig();
  const tramos = useMemo(() => (edicion ? calcularTramos(edicion, fps) : []), [edicion, fps]);
  const captions = useMemo(
    () => (edicion ? palabrasEnElEditado(edicion, tramos, fps) : []),
    [edicion, tramos, fps],
  );
  const elementos = useMemo(
    () => (edicion ? elementosEnElEditado(edicion, tramos, fps) : []),
    [edicion, tramos, fps],
  );
  if (!edicion) return null;

  const { opciones } = edicion;
  const finVideo = framesDeVideo(tramos);
  // Durante un lettering no se muestran subtítulos: la frase ya está en pantalla.
  const sinSubtitulos = elementos
    .filter((e) => e.elemento.tipo === "lettering")
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
