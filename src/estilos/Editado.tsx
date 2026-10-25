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
import { Gancho, colocarGancho } from "../componentes/Gancho";
import { Subtitulos } from "../componentes/Subtitulos";
import { VideoEncuadrado } from "../componentes/VideoEncuadrado";
import {
  DIMENSIONES,
  esquemaEdicion,
  FPS,
  type PropsEditado,
} from "../edicion/esquema";
import { Elementos } from "../componentes/Elementos";
import { Apoyos, esApoyo, FondoSoloAudio } from "../componentes/Apoyo";
import { VideoEnEscena } from "../componentes/Escena3D";
import { esEscena } from "../edicion/escenas";
import { esRecorte, recorteCompleto } from "../edicion/recortes";
import { Recortes } from "../componentes/Recorte";
import {
  caraEnSalida,
  colocarElementos,
  enfoqueEfectivo,
  mediaFranjaSubtitulos,
} from "../edicion/encuadre";
import {
  ajustarLetterings,
  calcularTramos,
  elementosEnElEditado,
  framesDeVideo,
  framesTotales,
  momentosConVoz,
  palabrasEnElEditado,
} from "../edicion/linea-de-tiempo";
import { buscarEstilo, ConEstilo } from "../edicion/estilos";
import { Musica } from "../componentes/Musica";
import { golpesDe, Sonidos } from "../componentes/Sonidos";

// Lee public/proyectos/<id>/edicion.json y ajusta duración y tamaño del video.
export const calcularMetadatos: CalculateMetadataFunction<
  PropsEditado
> = async ({ props, abortSignal }) => {
  const ruta = `proyectos/${props.proyecto}/edicion.json`;
  const respuesta = await fetch(staticFile(ruta), {
    signal: abortSignal,
    cache: "no-store",
  });
  if (!respuesta.ok) {
    throw new Error(
      `No encuentro public/${ruta}. Corre primero: npm run preparar -- <video>`,
    );
  }
  const resultado = esquemaEdicion.safeParse(await respuesta.json());
  if (!resultado.success) {
    throw new Error(
      `public/${ruta} tiene un error:\n${z.prettifyError(resultado.error)}`,
    );
  }
  const edicion = resultado.data;
  // Un estilo que no existe o tiene un error se avisa aquí, con su nombre.
  buscarEstilo(edicion.estilo);
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
  const tramos = useMemo(
    () => (edicion ? calcularTramos(edicion, fps) : []),
    [edicion, fps],
  );
  // Los lettering se alinean con las palabras que repiten, y esas palabras salen de los subtítulos.
  const letterings = useMemo(
    () => (edicion ? ajustarLetterings(edicion) : null),
    [edicion],
  );
  const captions = useMemo(
    () =>
      edicion && letterings
        ? palabrasEnElEditado(edicion, tramos, fps, letterings.palabrasOcultas)
        : [],
    [edicion, letterings, tramos, fps],
  );
  const caraEntre = useCallback(
    (desde: number, hasta: number) =>
      edicion
        ? caraEnSalida(edicion, tramos, fps, width, height, desde, hasta)
        : null,
    [edicion, tramos, fps, width, height],
  );
  const todos = useMemo(
    () =>
      edicion && letterings
        ? elementosEnElEditado(
            { ...edicion, elementos: letterings.elementos },
            tramos,
            fps,
          )
        : [],
    [edicion, letterings, tramos, fps],
  );
  // Las escenas 3D transforman el video entero; el resto va encima, en el espacio libre que
  // deja la cara.
  const escenas = useMemo(() => todos.filter(esEscena), [todos]);
  // Las escenas de apoyo tapan el video entero con una animación propia.
  const apoyos = useMemo(() => todos.filter(esApoyo), [todos]);
  // Los recortes van encima del video, con la persona recortada adelante. Uno sin recorte
  // completo (falta `npm run recortar`) no se dibuja: sin la persona encima, taparía la cara.
  const recortes = useMemo(
    () =>
      edicion
        ? todos
            .filter(esRecorte)
            .filter((item) => recorteCompleto(edicion.recorte, item, tramos))
        : [],
    [edicion, todos, tramos],
  );
  const elementos = useMemo(
    () =>
      edicion
        ? colocarElementos({
            items: todos.filter(
              (item) => !esEscena(item) && !esRecorte(item) && !esApoyo(item),
            ),
            edicion,
            width,
            height,
            caraEntre,
          })
        : [],
    [edicion, todos, width, height, caraEntre],
  );
  // Efectos de sonido de lo que de verdad se ve (un recorte incompleto no se dibuja ni suena).
  const golpes = useMemo(
    () => golpesDe([...escenas, ...recortes, ...apoyos, ...elementos]),
    [escenas, recortes, apoyos, elementos],
  );
  const conVoz = useMemo(
    () => (edicion ? momentosConVoz(edicion, tramos, fps) : []),
    [edicion, tramos, fps],
  );
  // Durante una escena de apoyo no se ve la cara: los subtítulos no tienen que esquivarla.
  const caraParaSubtitulos = useCallback(
    (desde: number, hasta: number) =>
      apoyos.some(
        (a) =>
          desde >= a.desdeFrame && hasta <= a.desdeFrame + a.duracionFrames,
      )
        ? null
        : caraEntre(desde, hasta),
    [apoyos, caraEntre],
  );
  if (!edicion) return null;

  const { opciones } = edicion;
  const base = Math.min(width, height);
  // Si el video ya trae sus subtítulos, los nuestros salen solo durante las escenas de apoyo
  // (que tapan los del video).
  const subtitulosSoloEnApoyos =
    !opciones.subtitulos &&
    edicion.subtitulosEnVideo !== null &&
    apoyos.length > 0;
  const conSubtitulos =
    (opciones.subtitulos || subtitulosSoloEnApoyos) && captions.length > 0;
  // Las escenas de apoyo dejan libre la franja de los subtítulos.
  const limiteApoyos = conSubtitulos
    ? opciones.posicionSubtitulos * height -
      mediaFranjaSubtitulos(width, height, opciones.estiloSubtitulos) -
      base * 0.03
    : null;
  const finVideo = framesDeVideo(tramos);
  const enfoque = enfoqueEfectivo(edicion, width, height);
  // Sin subtítulos durante un lettering (la frase ya está en pantalla), una escena 3D (tiene
  // sus propios textos), un texto detrás o un marco, o cuando un elemento necesita su espacio.
  const sinSubtitulos: Array<readonly [number, number]> = [
    ...elementos.filter((e) => e.ocultaSubtitulos),
    ...escenas,
    ...recortes.filter((r) => r.elemento.tipo !== "fondo"),
  ].map((e) => [e.desdeFrame, e.desdeFrame + e.duracionFrames] as const);
  // Gancho y cara de los primeros segundos: si el gancho no cabe encima de la cara, va debajo y
  // los subtítulos se ocultan mientras dura.
  const framesGancho = Math.round(opciones.duracionGancho * fps);
  const caraGancho = opciones.gancho ? caraEntre(0, framesGancho) : null;
  if (
    opciones.gancho &&
    colocarGancho({ texto: opciones.gancho, width, height, cara: caraGancho })
      .debajo
  ) {
    sinSubtitulos.push([0, framesGancho]);
  }
  // Una escena de frase ya muestra lo que se dice.
  for (const a of apoyos) {
    if (a.elemento.modo === "frase") sinSubtitulos.push([a.desdeFrame, a.desdeFrame + a.duracionFrames]);
  }
  if (subtitulosSoloEnApoyos) {
    let desde = 0;
    for (const a of [...apoyos].sort((x, y) => x.desdeFrame - y.desdeFrame)) {
      sinSubtitulos.push([desde, a.desdeFrame]);
      desde = a.desdeFrame + a.duracionFrames;
    }
    sinSubtitulos.push([desde, finVideo]);
  }

  const { marca } = buscarEstilo(edicion.estilo);

  return (
    <ConEstilo estilo={edicion.estilo}>
      <AbsoluteFill style={{ backgroundColor: marca.colores.fondo }}>
        {opciones.soloAudio ? (
          <Sequence durationInFrames={finVideo} name="Fondo animado">
            <FondoSoloAudio />
          </Sequence>
        ) : null}
        {/* En los proyectos de solo audio el "video" es una imagen vacía: se oye pero no se ve. */}
        <AbsoluteFill style={{ opacity: opciones.soloAudio ? 0 : 1 }}>
          <VideoEnEscena escenas={escenas} caraEntre={caraEntre}>
            <Series>
              {tramos.map((tramo, i) => (
                <Series.Sequence
                  key={i}
                  durationInFrames={tramo.duracionFrames}
                  name={`Tramo ${i + 1}`}
                >
                  <VideoEncuadrado
                    src={edicion.video}
                    anchoOriginal={edicion.ancho}
                    altoOriginal={edicion.alto}
                    trimBefore={tramo.trimBefore}
                    duracionFrames={tramo.duracionFrames}
                    enfoqueX={enfoque.x}
                    enfoqueY={enfoque.y}
                    zoom={tramo.zoom}
                    empuje={tramo.empuje}
                    color={edicion.opciones.color}
                    enfasis={edicion.enfasis}
                  />
                </Series.Sequence>
              ))}
            </Series>
          </VideoEnEscena>
        </AbsoluteFill>

        {recortes.length > 0 ? (
          <Sequence durationInFrames={finVideo} name="Recortes">
            <Recortes
              items={recortes}
              edicion={edicion}
              tramos={tramos}
              enfoque={enfoque}
              caraEntre={caraEntre}
            />
          </Sequence>
        ) : null}

        {apoyos.length > 0 ? (
          <Sequence durationInFrames={finVideo} name="Escenas de apoyo">
            <Apoyos items={apoyos} limiteAbajo={limiteApoyos} />
          </Sequence>
        ) : null}

        {elementos.length > 0 ? (
          <Sequence durationInFrames={finVideo} name="Elementos">
            <Elementos items={elementos} />
          </Sequence>
        ) : null}

        {conSubtitulos ? (
          <Sequence durationInFrames={finVideo} name="Subtítulos">
            <Subtitulos
              captions={captions}
              estilo={opciones.estiloSubtitulos}
              posicion={opciones.posicionSubtitulos}
              ocultarEn={sinSubtitulos}
              caraEntre={caraParaSubtitulos}
            />
          </Sequence>
        ) : null}

        {opciones.gancho ? (
          <Sequence durationInFrames={framesGancho} name="Gancho">
            <Gancho
              texto={opciones.gancho}
              duracionFrames={framesGancho}
              cara={caraGancho}
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

        {edicion.musica ? (
          <Sequence name="Música">
            <Musica
              musica={edicion.musica}
              conVoz={conVoz}
              duracionFrames={framesTotales(edicion, fps)}
            />
          </Sequence>
        ) : null}

        {opciones.sonidos &&
        opciones.volumenSonidos > 0 &&
        golpes.length > 0 ? (
          <Sequence name="Efectos de sonido">
            <Sonidos
              golpes={golpes}
              volumen={opciones.volumenSonidos}
              fps={fps}
            />
          </Sequence>
        ) : null}
      </AbsoluteFill>
    </ConEstilo>
  );
};
