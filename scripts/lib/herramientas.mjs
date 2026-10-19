// Utilidades compartidas por los scripts de TopTop Lab.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CARPETA_PROYECTOS = path.join(RAIZ, "public", "proyectos");
export const CARPETA_SALIDA = path.join(RAIZ, "salida");
export const CARPETA_WHISPER = path.join(RAIZ, "whisper.cpp");
export const ARCHIVO_LISTA = path.join(RAIZ, "src", "proyectos.ts");
export const FPS = 30;

export const REMOTION_BIN = path.join(RAIZ, "node_modules", ".bin", "remotion");

const ejecutar = (bin, args) => {
  const r = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 512 });
  if (r.error) throw r.error;
  return r;
};

// FFmpeg y FFprobe vienen incluidos con Remotion: no hace falta instalarlos aparte.
export const ffmpeg = (args) => {
  const r = ejecutar(REMOTION_BIN, ["ffmpeg", "-hide_banner", ...args]);
  if (r.status !== 0) {
    throw new Error(`FFmpeg falló (${args.join(" ")}):\n${r.stderr.slice(-2000)}`);
  }
  return r.stderr;
};

export const ffprobe = (archivo) => {
  const r = ejecutar(REMOTION_BIN, [
    "ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", archivo,
  ]);
  if (r.status !== 0) throw new Error(`No se pudo leer ${archivo}:\n${r.stderr}`);
  return JSON.parse(r.stdout);
};

// "Mi Video_01.MOV" -> "mi-video-01"
export const aId = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "proyecto";

export const leerJson = (archivo) => JSON.parse(fs.readFileSync(archivo, "utf8"));
export const escribirJson = (archivo, datos) =>
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 2) + "\n");

export const redondear = (n, decimales = 3) => Math.round(n * 10 ** decimales) / 10 ** decimales;

// Mantiene src/proyectos.ts sincronizado con las carpetas de public/proyectos,
// así cada proyecto aparece como composición propia en Remotion Studio.
export const actualizarListaDeProyectos = () => {
  const ids = fs.existsSync(CARPETA_PROYECTOS)
    ? fs
        .readdirSync(CARPETA_PROYECTOS)
        .filter((d) => fs.existsSync(path.join(CARPETA_PROYECTOS, d, "edicion.json")))
        .sort()
    : [];
  const contenido =
    "// Archivo generado automáticamente a partir de public/proyectos. No lo edites a mano.\n" +
    `export const proyectos: string[] = ${JSON.stringify(ids, null, 2)};\n`;
  fs.writeFileSync(ARCHIVO_LISTA, contenido);
  return ids;
};
