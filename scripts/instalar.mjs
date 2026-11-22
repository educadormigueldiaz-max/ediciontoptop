#!/usr/bin/env node
// Deja Whisper (transcripción local) instalado y el modelo descargado:
//   npm run instalar              (modelo medium, ~1.5 GB, mejor calidad en español)
//   npm run instalar -- small     (modelo small, ~470 MB, más rápido)
import { spawnSync } from "node:child_process";
import { prepararWhisper } from "./lib/transcribir.mjs";

const modelo = process.argv[2] ?? "medium";

// En Windows, Whisper se baja ya armado: no hace falta "make" (las herramientas de Xcode son solo de Mac).
const enWindows = process.platform === "win32";
const requisitos = enWindows
  ? [["git", "Instala Git desde https://git-scm.com/download/win"]]
  : [
      ["git", "Instala las herramientas de Xcode con: xcode-select --install"],
      ["make", "Instala las herramientas de Xcode con: xcode-select --install"],
    ];
for (const [bin, ayuda] of requisitos) {
  if (spawnSync(bin, ["--version"]).status !== 0) {
    console.error(`Falta "${bin}". ${ayuda}`);
    process.exit(1);
  }
}

console.log(`Instalando Whisper y el modelo "${modelo}" (solo la primera vez, tarda unos minutos)…`);
await prepararWhisper(modelo);
console.log("\nListo. Ya puedes usar: npm run preparar -- entrada/tu-video.mp4");
