import type { Edicion } from "./esquema";

// Dibujos (SVG en public/) que usan las escenas ilustradas de una edición.
export const dibujosDe = (edicion: Edicion): string[] => [
  ...new Set(
    edicion.elementos.flatMap((e) =>
      e.tipo === "apoyo" && e.modo === "escena" && e.escena
        ? e.escena.capas.map((c) => c.dibujo)
        : [],
    ),
  ),
];

// Proporción ancho/alto del dibujo según su viewBox (1 si no tiene).
export const proporcionDe = (svg: string) => {
  const m =
    /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(
      svg,
    );
  return m && Number(m[2]) > 0 ? Number(m[1]) / Number(m[2]) : 1;
};

// Deja el SVG listo para ponerlo en la página: sin código ni enlaces externos, del tamaño de su
// caja y con los `id` propios de esta capa (`prefijo`), para mover sus partes sin chocar con otra.
export const prepararSvg = (svg: string, prefijo: string) =>
  svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(script|foreignObject|image|iframe|style)\b[\s\S]*?(<\/\1\s*>|\/>)/gi,
      "",
    )
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/((?:xlink:)?href\s*=\s*["'])(?!#)[^"']*(["'])/gi, "$1#$2")
    .replace(/\bid\s*=\s*(["'])([^"']+)\1/g, `id="${prefijo}$2"`)
    .replace(/url\(\s*#([^)\s]+)\s*\)/g, `url(#${prefijo}$1)`)
    .replace(
      /((?:xlink:)?href\s*=\s*["'])#([^"']+)(["'])/g,
      `$1#${prefijo}$2$3`,
    )
    .replace(
      /<svg\b([^>]*)>/i,
      (_, atributos: string) =>
        `<svg${atributos.replace(/\s(width|height|preserveAspectRatio)\s*=\s*("[^"]*"|'[^']*')/g, "")} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`,
    );
