import { Composition, Folder } from "remotion";
import { z } from "zod";
import { Cierre } from "./componentes/Cierre";
import { FPS, esquemaProps } from "./edicion/esquema";
import { calcularMetadatos, Editado } from "./estilos/Editado";
import { MuestraSubtitulos } from "./estilos/Muestras";
import { proyectos } from "./proyectos";

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
          schema={z.object({ estilo: z.enum(["palabra", "frase"]) })}
          defaultProps={{ estilo: "palabra" as const }}
          fps={FPS}
          width={1080}
          height={1920}
          durationInFrames={8 * FPS}
        />
        <Composition
          id="Muestra-Cierre"
          component={Cierre}
          schema={z.object({ texto: z.string() })}
          defaultProps={{ texto: "Síguenos para más" }}
          fps={FPS}
          width={1080}
          height={1920}
          durationInFrames={3 * FPS}
        />
      </Folder>
    </>
  );
};
