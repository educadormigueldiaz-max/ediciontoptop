// Voz más limpia y pareja en el video de trabajo (ver audio.swift) y volumen estándar de redes.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RAIZ, ffmpeg } from "./herramientas.mjs";

const FUENTE_SWIFT = path.join(RAIZ, "scripts", "lib", "audio.swift");
const PROGRAMA = path.join(RAIZ, "node_modules", ".cache", "bydzyne", "audio");
// Volumen de la voz que usan las redes (-16 LUFS) sin que los picos saturen.
const VOLUMEN = "loudnorm=I=-16:TP=-1.5:LRA=11";

// Compila el programa de Swift la primera vez (o si cambió). Devuelve false si no se puede.
const prepararPrograma = () => {
  if (process.platform !== "darwin") return false;
  const vigente =
    fs.existsSync(PROGRAMA) && fs.statSync(PROGRAMA).mtimeMs >= fs.statSync(FUENTE_SWIFT).mtimeMs;
  if (vigente) return true;
  fs.mkdirSync(path.dirname(PROGRAMA), { recursive: true });
  const r = spawnSync("swiftc", ["-O", FUENTE_SWIFT, "-o", PROGRAMA], { encoding: "utf8" });
  return !r.error && r.status === 0;
};

// Reemplaza el audio de `video` por la voz limpia. Sin las herramientas de Apple, solo empareja
// el volumen. Devuelve qué se hizo.
export const limpiarAudio = (video) => {
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "bydzyne-audio-"));
  try {
    let audio = video;
    let limpio = false;
    if (prepararPrograma()) {
      const wav = path.join(temporal, "voz.wav");
      const caf = path.join(temporal, "voz.caf");
      ffmpeg(["-y", "-i", video, "-vn", "-ar", "48000", "-c:a", "pcm_s16le", wav]);
      const r = spawnSync(PROGRAMA, [wav, caf], { encoding: "utf8" });
      if (r.status === 0) {
        audio = caf;
        limpio = true;
      }
    }
    const salida = path.join(temporal, "video.mp4");
    ffmpeg([
      "-y", "-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "copy", "-af", VOLUMEN, "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      "-movflags", "+faststart", salida,
    ]);
    fs.copyFileSync(salida, video);
    return limpio ? "voz limpia y volumen parejo" : "volumen parejo";
  } finally {
    fs.rmSync(temporal, { recursive: true, force: true });
  }
};
