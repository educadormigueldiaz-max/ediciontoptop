import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { staticFile, useVideoConfig } from "remotion";
import type { Edicion } from "../edicion/esquema";

// Rampas, en segundos: la música baja rápido antes de que la persona hable y vuelve a subir
// despacio cuando se calla. Entra y sale suave al principio y al final del video.
const BAJADA = 0.25;
const SUBIDA = 0.6;
const ENTRADA = 1;
const SALIDA = 1.5;

const suave = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

// Volumen de la música en cada frame del video.
export const volumenesDeMusica = (p: {
  musica: NonNullable<Edicion["musica"]>;
  // Tramos [desde, hasta) del video editado en los que la persona habla.
  conVoz: Array<[number, number]>;
  duracionFrames: number;
  fps: number;
}): number[] => {
  const { musica, conVoz, duracionFrames, fps } = p;
  // Frames que faltan para que hable (hacia adelante) y desde que se calló (hacia atrás).
  const hastaVoz = new Array<number>(duracionFrames).fill(Infinity);
  const desdeVoz = new Array<number>(duracionFrames).fill(Infinity);
  for (const [desde, hasta] of conVoz) {
    for (let f = Math.max(0, desde); f < Math.min(hasta, duracionFrames); f++) {
      hastaVoz[f] = 0;
      desdeVoz[f] = 0;
    }
  }
  for (let f = duracionFrames - 2; f >= 0; f--) hastaVoz[f] = Math.min(hastaVoz[f], hastaVoz[f + 1] + 1);
  for (let f = 1; f < duracionFrames; f++) desdeVoz[f] = Math.min(desdeVoz[f], desdeVoz[f - 1] + 1);

  return Array.from({ length: duracionFrames }, (_, f) => {
    // 0 = hablando, 1 = pausa larga.
    const pausa = Math.min(suave(hastaVoz[f] / (BAJADA * fps)), suave(desdeVoz[f] / (SUBIDA * fps)));
    const nivel = musica.alHablar + (1 - musica.alHablar) * pausa;
    const bordes = Math.min(suave(f / (ENTRADA * fps)), suave((duracionFrames - 1 - f) / (SALIDA * fps)));
    return musica.volumen * nivel * bordes;
  });
};

// Música de fondo: se repite si la canción es más corta que el video.
export const Musica: React.FC<{
  musica: NonNullable<Edicion["musica"]>;
  conVoz: Array<[number, number]>;
  duracionFrames: number;
}> = ({ musica, conVoz, duracionFrames }) => {
  const { fps } = useVideoConfig();
  const volumenes = useMemo(
    () => volumenesDeMusica({ musica, conVoz, duracionFrames, fps }),
    [musica, conVoz, duracionFrames, fps],
  );
  return (
    <Audio
      src={staticFile(musica.archivo)}
      trimBefore={Math.round(musica.desde * fps)}
      loop
      loopVolumeCurveBehavior="extend"
      volume={(f) => volumenes[Math.min(f, volumenes.length - 1)] ?? 0}
    />
  );
};
