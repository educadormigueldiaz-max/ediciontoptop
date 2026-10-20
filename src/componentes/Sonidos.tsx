import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import type { ElementoEnEditado } from "../edicion/linea-de-tiempo";

// Efectos de sonido cortos de public/sonidos/ (hechos desde cero, licencia CC0).
const SONIDOS = {
  // Aire que pasa: algo grande entra a la pantalla.
  whoosh: { archivo: "sonidos/whoosh.wav", duracion: 0.5, volumen: 0.8 },
  // Burbuja: aparece un punto, un ícono o una etiqueta.
  pop: { archivo: "sonidos/pop.wav", duracion: 0.14, volumen: 1 },
  // Toque seco: cambia el paso de un tutorial.
  click: { archivo: "sonidos/click.wav", duracion: 0.06, volumen: 0.8 },
} as const;

export type Golpe = { frame: number; sonido: keyof typeof SONIDOS };

// Dos sonidos más juntos que esto se oyen como uno solo: se deja el primero.
const SEPARACION_MINIMA = 6;
// Un punto o paso que aparece casi junto con el elemento no lleva sonido propio.
const JUNTO_AL_INICIO = 8;

type ConMomentos = Pick<ElementoEnEditado, "elemento" | "desdeFrame" | "momentos">;

// Qué suena y cuándo, según el tipo de cada elemento.
export const golpesDe = (items: ConMomentos[]): Golpe[] => {
  const golpes = items.flatMap(({ elemento, desdeFrame, momentos }): Golpe[] => {
    if (!elemento.sonido) return [];
    const entrada: Golpe = { frame: desdeFrame, sonido: "whoosh" };
    const cada = (sonido: Golpe["sonido"]) =>
      momentos.filter((m) => m >= JUNTO_AL_INICIO).map((m) => ({ frame: desdeFrame + m, sonido }));
    switch (elemento.tipo) {
      case "lista":
        return [
          ...(elemento.titulo ? [entrada] : []),
          ...momentos.map((m) => ({ frame: desdeFrame + m, sonido: "pop" as const })),
        ];
      case "icono":
        return [{ frame: desdeFrame, sonido: "pop" }];
      case "tutorial":
        return [entrada, ...cada("click")];
      case "objeto3d":
        return [entrada, ...cada("pop")];
      default:
        return [entrada];
    }
  });
  golpes.sort((a, b) => a.frame - b.frame);
  return golpes.filter((g, i) => i === 0 || g.frame - golpes[i - 1].frame >= SEPARACION_MINIMA);
};

export const Sonidos: React.FC<{ golpes: Golpe[]; volumen: number; fps: number }> = ({
  golpes,
  volumen,
  fps,
}) => (
  <>
    {golpes.map(({ frame, sonido }, i) => (
      <Sequence
        key={i}
        from={frame}
        durationInFrames={Math.ceil(SONIDOS[sonido].duracion * fps) + 1}
        name={`Sonido ${sonido}`}
        layout="none"
      >
        <Audio src={staticFile(SONIDOS[sonido].archivo)} volume={volumen * SONIDOS[sonido].volumen} />
      </Sequence>
    ))}
  </>
);
