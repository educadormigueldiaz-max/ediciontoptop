#!/usr/bin/env node
// Deja Whisper (transcripción local) instalado y el modelo descargado:
//   npm run instalar              (modelo medium, ~1.5 GB, mejor calidad en español)
//   npm run instalar -- small     (modelo small, ~470 MB, más rápido)
import { spawnSync } from "node:child_process";
import { prepararWhisper } from "./lib/transcribir.mjs";

const modelo = process.argv[2] ?? "medium";

for (const [bin, ayuda] of [
  ["git", "Instala las herramientas de Xcode con: xcode-select --install"],
  ["make", "Instala las herramientas de Xcode con: xcode-select --install"],
]) {
  if (spawnSync(bin, ["--version"]).status !== 0) {
    console.error(`Falta "${bin}". ${ayuda}`);
    process.exit(1);
  }
}

console.log(`Instalando Whisper y el modelo "${modelo}" (solo la primera vez, tarda unos minutos)…`);
await prepararWhisper(modelo);
console.log("\nListo. Ya puedes usar: npm run preparar -- entrada/tu-video.mp4");
