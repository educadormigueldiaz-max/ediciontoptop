#!/usr/bin/env node
// Paso 1 del flujo "crudo → editado":
//   npm run preparar -- entrada/take-01.mp4
// Convierte el video, lo transcribe con Whisper, detecta pausas y muletillas,
// y deja todo listo en public/proyectos/<id>/edicion.json para editar en Remotion Studio.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { buscarMuletillas, calcularSegmentos, detectarSilencios, medirUmbral } from "./lib/cortes.mjs";
import {
  CARPETA_PROYECTOS, FPS, RAIZ, actualizarListaDeProyectos, aId, escribirJson, ffmpeg, ffprobe,
  leerJson, redondear,
} from "./lib/herramientas.mjs";
import { detectarCaras } from "./lib/caras.mjs";
import { transcribir } from "./lib/transcribir.mjs";

const AYUDA = `
Uso: npm run preparar -- <video> [opciones]

Opciones:
  --id <nombre>             Nombre del proyecto (por defecto, el del archivo)
  --pausa <seg>             Pausa mínima que se corta (por defecto 0.35)
  --margen <seg>            Aire que se deja antes y después de cada frase (por defecto 0.08)
  --umbral <dB>             Umbral de silencio fijo (por defecto se calcula solo)
  --modelo <nombre>         Modelo de Whisper: tiny, base, small, medium, large-v3-turbo (por defecto medium)
  --idioma <código>         Idioma del audio (por defecto es)
  --formato <9:16|4:5|1:1|16:9>  Formato inicial (por defecto 9:16)
  --sin-subtitulos          No transcribe (más rápido; no habrá subtítulos)
  --sin-cortes              No corta pausas (solo subtítulos)
  --conservar-muletillas    No corta "eh", "mmm", etc.
  --sin-caras               No busca la cara (los textos no sabrán dónde está)
  --transcripcion <json>    Usa una transcripción ya hecha en vez de Whisper
  --forzar                  Rehace el proyecto aunque ya exista (pierde los cambios a mano)
`;

const { values: op, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    id: { type: "string" },
    pausa: { type: "string", default: "0.35" },
    margen: { type: "string", default: "0.08" },
    umbral: { type: "string" },
    modelo: { type: "string", default: "medium" },
    idioma: { type: "string", default: "es" },
    formato: { type: "string", default: "9:16" },
    "sin-subtitulos": { type: "boolean", default: false },
    "sin-cortes": { type: "boolean", default: false },
    "sin-caras": { type: "boolean", default: false },
    "conservar-muletillas": { type: "boolean", default: false },
    transcripcion: { type: "string" },
    forzar: { type: "boolean", default: false },
    ayuda: { type: "boolean", short: "h", default: false },
  },
});

const original = positionals[0];
if (op.ayuda || !original) {
  console.log(AYUDA);
  process.exit(original ? 0 : 1);
}
if (!fs.existsSync(original)) {
  console.error(`No encuentro el video: ${original}`);
  process.exit(1);
}
if (op.transcripcion && !fs.existsSync(op.transcripcion)) {
  console.error(`No encuentro la transcripción: ${op.transcripcion}`);
  process.exit(1);
}
if (!["9:16", "4:5", "1:1", "16:9"].includes(op.formato)) {
  console.error(`Formato no válido: ${op.formato}. Usa 9:16, 4:5, 1:1 o 16:9.`);
  process.exit(1);
}

const id = aId(op.id ?? path.basename(original));
const carpeta = path.join(CARPETA_PROYECTOS, id);
const archivoEdicion = path.join(carpeta, "edicion.json");

if (fs.existsSync(archivoEdicion) && !op.forzar) {
  console.error(
    `El proyecto "${id}" ya existe (${path.relative(RAIZ, archivoEdicion)}).\n` +
      `Usa --forzar para rehacerlo (se pierden los cambios hechos a mano) o --id para crear otro.`,
  );
  process.exit(1);
}
fs.mkdirSync(carpeta, { recursive: true });

const paso = (n, texto) => console.log(`\n[${n}/6] ${texto}`);

// 1. Video de trabajo: H.264 a 30 fps constantes. Evita desfases de los videos
//    del celular (que graban con fps variables) y funciona en cualquier navegador.
paso(1, "Convirtiendo el video…");
const video = path.join(carpeta, "video.mp4");
ffmpeg([
  "-y", "-i", original,
  "-r", String(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  "-movflags", "+faststart", video,
]);
const info = ffprobe(video);
const flujoVideo = info.streams.find((s) => s.codec_type === "video");
const duracion = parseFloat(info.format.duration);
if (!info.streams.some((s) => s.codec_type === "audio")) {
  console.error("El video no tiene audio: no se pueden detectar pausas ni hacer subtítulos.");
  process.exit(1);
}

// 2. Audio a 16 kHz mono, el formato que usa Whisper.
paso(2, "Extrayendo el audio…");
const wav = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "toptop-")), "audio.wav");
ffmpeg(["-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);

// 3. Transcripción.
let palabras = [];
let frases = [];
if (op.transcripcion) {
  paso(3, `Usando la transcripción de ${op.transcripcion}`);
  ({ palabras, frases } = leerJson(op.transcripcion));
} else if (op["sin-subtitulos"]) {
  paso(3, "Sin transcripción (--sin-subtitulos)");
} else {
  paso(3, `Transcribiendo con Whisper (modelo ${op.modelo}, idioma ${op.idioma})…`);
  ({ palabras, frases } = await transcribir({ wav, modelo: op.modelo, idioma: op.idioma }));
}

// 4. Pausas y muletillas.
paso(4, "Buscando pausas y muletillas…");
const pausa = parseFloat(op.pausa);
const margen = parseFloat(op.margen);
const umbralDb = op.umbral ? parseFloat(op.umbral) : medirUmbral(wav).umbralDb;
const silencios = op["sin-cortes"] ? [] : detectarSilencios({ wav, umbralDb, minDuracion: pausa, duracion });
const muletillas = op["sin-cortes"] || op["conservar-muletillas"] ? [] : buscarMuletillas(palabras);
const segmentos = calcularSegmentos({ duracion, silencios, cortesExtra: muletillas, margen });
fs.rmSync(path.dirname(wav), { recursive: true, force: true });

// 5. Dónde está la cara en cada momento, para que ningún texto o gráfico la tape.
let caras = null;
if (op["sin-caras"]) {
  paso(5, "Sin búsqueda de cara (--sin-caras)");
} else {
  paso(5, "Buscando la cara…");
  caras = await detectarCaras({ video, ancho: flujoVideo.width, alto: flujoVideo.height });
  if (!caras) console.log("  No se encontró una cara en el video.");
}

// 6. Archivo de edición: aquí vive todo lo que se puede cambiar de este video.
paso(6, "Guardando la edición…");
const edicion = {
  version: 1,
  id,
  original: path.basename(original),
  video: `proyectos/${id}/video.mp4`,
  ancho: flujoVideo.width,
  alto: flujoVideo.height,
  duracion: redondear(duracion),
  ajustes: { pausa, margen, umbralDb: redondear(umbralDb, 1), modelo: op.modelo, idioma: op.idioma },
  opciones: {
    formato: op.formato,
    enfoqueX: "auto",
    enfoqueY: "auto",
    subtitulos: palabras.length > 0,
    estiloSubtitulos: "palabra",
    posicionSubtitulos: 0.7,
    zoomEnCortes: true,
    gancho: null,
    duracionGancho: 2.5,
    cierre: null,
  },
  segmentos,
  palabras,
  enfasis: [],
  elementos: [],
  caras,
};
escribirJson(archivoEdicion, edicion);

const reloj = (s) => {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
};
fs.writeFileSync(
  path.join(carpeta, "transcripcion.txt"),
  frases.length
    ? frases.map((f) => `[${reloj(f.inicio)} → ${reloj(f.fin)}] ${f.texto}`).join("\n") + "\n"
    : "(sin transcripción)\n",
);
actualizarListaDeProyectos();

const editado = segmentos.reduce((t, s) => t + (s.fin - s.inicio), 0);
console.log(`
Listo: proyecto "${id}"
  Duración original: ${duracion.toFixed(1)} s
  Duración editada:  ${editado.toFixed(1)} s (${segmentos.length} tramos, ${Math.max(0, segmentos.length - 1)} cortes, ${muletillas.length} muletillas)
  Palabras:          ${palabras.length}
  Archivos:          ${path.relative(RAIZ, carpeta)}/edicion.json y transcripcion.txt

Siguiente paso: abre la vista previa con "npm run dev" y busca "${id}" en la lista,
o exporta directo con "npm run exportar -- ${id}".
`);
