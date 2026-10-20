import { Composition, Folder } from "remotion";
import { z } from "zod";
import { FPS, esquemaProps } from "./edicion/esquema";
import { nombresDeEstilos, PREDETERMINADO } from "./edicion/estilos";
import { calcularMetadatos, Editado } from "./estilos/Editado";
import {
  MuestraCierre,
  MuestraElementos,
  MuestraEscenas3D,
  MuestraRecorte,
  MuestraSubtitulos,
} from "./estilos/Muestras";
import { proyectos } from "./proyectos";

// En las muestras se elige el estilo: el predeterminado o el de un cliente (estilos/<cliente>.json).
const conEstilo = z.object({ estilo: z.enum(nombresDeEstilos) });
const estiloInicial = { estilo: PREDETERMINADO };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Un video por cada proyecto creado con `npm run preparar`. */}
      <Folder name="Proyectos">
        {proyectos.map((id) => (
          <Composition
            key={id}
            id={id}
            component={Editado}
            schema={esquemaProps}
            defaultProps={{ proyecto: id, formato: null }}
            calculateMetadata={calcularMetadatos}
            fps={FPS}
            width={1080}
            height={1920}
            durationInFrames={FPS}
          />
        ))}
      </Folder>

      <Folder name="Muestras">
        <Composition
          id="Muestra-Subtitulos"
          component={MuestraSubtitulos}
          schema={conEstilo.extend({
            subtitulos: z.enum(["palabra", "frase"]),
          })}
          defaultProps={{ ...estiloInicial, subtitulos: "palabra" as const }}
          fps={FPS}
          width={1080}
          height={1920}
          durationInFrames={8 * FPS}
        />
        <Composition
          id="Muestra-Elementos"
          component={MuestraElementos}
          schema={conEstilo}
          defaultProps={estiloInicial}
          fps={FPS}
          width={1080}
          height={1920}
          durationInFrames={12 * FPS}
        />
        <Composition
          id="Muestra-3D"
          component={MuestraEscenas3D}
          schema={conEstilo}
          defaultProps={estiloInicial}
          fps={FPS}
          width={1080}
          height={1920}
          durationInFrames={17 * FPS}
        />
        <Composition
          id="Muestra-Recorte"
          component={MuestraRecorte}
          schema={conEstilo}
          defaultProps={estiloInicial}
          fps={FPS}
          width={1080}
          height={1920}
          durationInFrames={16 * FPS}
        />
        <Composition
          id="Muestra-Cierre"
          component={MuestraCierre}
          schema={conEstilo.extend({ texto: z.string() })}
          defaultProps={{ ...estiloInicial, texto: "Síguenos para más" }}
          fps={FPS}
          width={1080}
          height={1920}
          durationInFrames={3 * FPS}
        />
      </Folder>
    </>
  );
};
