// ¿El video ya trae subtítulos pegados en la imagen? Lee el texto de algunos cuadros mientras la
// persona habla (textos.swift) y lo compara con lo que dice en ese momento.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RAIZ } from "./herramientas.mjs";

const FUENTE_SWIFT = path.join(RAIZ, "scripts", "lib", "textos.swift");
const PROGRAMA = path.join(RAIZ, "node_modules", ".cache", "bydzyne", "textos");
const MUESTRAS = 16;
// Parte de los cuadros con texto que coincide con la voz para decir que ya tiene subtítulos.
const MINIMO = 0.4;

const prepararPrograma = () => {
  if (process.platform !== "darwin") return false;
  const vigente =
    fs.existsSync(PROGRAMA) && fs.statSync(PROGRAMA).mtimeMs >= fs.statSync(FUENTE_SWIFT).mtimeMs;
  if (vigente) return true;
  fs.mkdirSync(path.dirname(PROGRAMA), { recursive: true });
  const r = spawnSync("swiftc", ["-O", FUENTE_SWIFT, "-o", PROGRAMA], { encoding: "utf8" });
  return !r.error && r.status === 0;
};

const normalizar = (texto) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

// Devuelve { tiene, altura, muestras, coincidencias } o null si no se pudo revisar (sin voz o
// fuera de macOS). `altura` es dónde están los subtítulos (0 = arriba, 1 = abajo).
export const detectarSubtitulosPropios = ({ video, palabras }) => {
  const conTexto = palabras.filter((p) => normalizar(p.texto));
  if (conTexto.length < 8 || !prepararPrograma()) return null;
  // Momentos repartidos por todo el video, siempre en medio de una palabra.
  const paso = conTexto.length / MUESTRAS;
  const momentos = [...new Set(Array.from({ length: Math.min(MUESTRAS, conTexto.length) }, (_, i) => {
    const p = conTexto[Math.floor(i * paso + paso / 2)] ?? conTexto.at(-1);
    return Math.round(((p.inicio + p.fin) / 2) * 100) / 100;
  }))];
  const r = spawnSync(PROGRAMA, [video, ...momentos.map(String)], { encoding: "utf8", maxBuffer: 1024 * 1024 * 32 });
  if (r.error || r.status !== 0) return null;

  let coincidencias = 0;
  const alturas = [];
  for (const linea of r.stdout.split("\n").filter(Boolean)) {
    const { t, lineas } = JSON.parse(linea);
    // Lo que dice unos segundos antes y después (los subtítulos pegados no siempre van exactos).
    const dichas = new Set(
      palabras.filter((p) => p.fin >= t - 3 && p.inicio <= t + 3).map((p) => normalizar(p.texto)).filter(Boolean),
    );
    const coincide = lineas.find((l) => {
      const vistas = l.texto.split(/\s+/).map(normalizar).filter((w) => w.length > 0);
      const iguales = vistas.filter((w) => dichas.has(w));
      // Una palabra larga sola (subtítulos de una palabra) o la mitad de una línea más larga.
      return iguales.some((w) => w.length >= 4) && (vistas.length <= 2 || iguales.length >= vistas.length / 2);
    });
    if (coincide) {
      coincidencias++;
      alturas.push(coincide.y);
    }
  }
  alturas.sort((a, b) => a - b);
  return {
    tiene: coincidencias / momentos.length >= MINIMO,
    altura: alturas.length ? alturas[Math.floor(alturas.length / 2)] : null,
    muestras: momentos.length,
    coincidencias,
  };
};
