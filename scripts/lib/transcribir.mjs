// Transcripción local con Whisper.cpp (no sube nada a internet).
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
} from "@remotion/install-whisper-cpp";
import { CARPETA_WHISPER, redondear } from "./herramientas.mjs";

export const VERSION_WHISPER = "1.5.5";

export const prepararWhisper = async (modelo) => {
  await installWhisperCpp({ to: CARPETA_WHISPER, version: VERSION_WHISPER, printOutput: true });
  let ultimo = -1;
  await downloadWhisperModel({
    model: modelo,
    folder: CARPETA_WHISPER,
    printOutput: false,
    onProgress: (bytes, total) => {
      const pct = Math.floor((bytes / total) * 100);
      if (pct >= ultimo + 10) {
        ultimo = pct;
        process.stdout.write(`  Descargando modelo "${modelo}": ${pct}%\n`);
      }
    },
  });
};

// Convierte los tokens de Whisper en palabras con tiempo de inicio y fin (segundos).
export const palabrasDesdeWhisper = (salida) => {
  const palabras = [];
  const frases = [];
  for (const item of salida.transcription) {
    const texto = item.text.trim();
    if (texto) {
      frases.push({ texto, inicio: item.offsets.from / 1000, fin: item.offsets.to / 1000 });
    }
    for (const token of item.tokens) {
      // Tokens especiales de Whisper: [_BEG_], [_TT_123], etc.
      if (token.text.startsWith("[_") || token.text.trim() === "") continue;
      const inicio = token.offsets.from / 1000;
      const fin = token.offsets.to / 1000;
      const nuevaPalabra = token.text.startsWith(" ") || palabras.length === 0;
      if (nuevaPalabra) {
        palabras.push({ texto: token.text.trim(), inicio, fin });
      } else {
        // Continuación de la palabra anterior (sílabas o signos de puntuación).
        const anterior = palabras[palabras.length - 1];
        anterior.texto += token.text;
        anterior.fin = Math.max(anterior.fin, fin);
      }
    }
  }
  return {
    palabras: palabras.map((p) => ({
      texto: p.texto,
      inicio: redondear(p.inicio),
      fin: redondear(Math.max(p.fin, p.inicio + 0.05)),
    })),
    frases,
  };
};

export const transcribir = async ({ wav, modelo, idioma }) => {
  await prepararWhisper(modelo);
  let ultimo = -1;
  const salida = await transcribe({
    inputPath: wav,
    whisperPath: CARPETA_WHISPER,
    whisperCppVersion: VERSION_WHISPER,
    model: modelo,
    language: idioma,
    tokenLevelTimestamps: true,
    splitOnWord: true,
    printOutput: false,
    onProgress: (p) => {
      const pct = Math.floor(p * 100);
      if (pct >= ultimo + 10) {
        ultimo = pct;
        process.stdout.write(`  Transcribiendo: ${pct}%\n`);
      }
    },
  });
  return palabrasDesdeWhisper(salida);
};
