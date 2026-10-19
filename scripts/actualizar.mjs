#!/usr/bin/env node
// Trae la última versión de TopTop Lab desde GitHub e instala lo nuevo:
//   npm run actualizar
import { spawnSync } from "node:child_process";
import { RAIZ } from "./lib/herramientas.mjs";

const git = (...args) => spawnSync("git", args, { cwd: RAIZ, encoding: "utf8" });

// npm reescribe package-lock.json según la computadora: no es un cambio tuyo, se descarta.
git("checkout", "--", "package-lock.json");

const cambios = git("status", "--porcelain", "--untracked-files=no").stdout.trim();
if (cambios) {
  console.error(
    `Hay archivos del proyecto modificados en esta computadora:\n${cambios}\n\n` +
      `No actualicé para no perderlos. Pídele a Claude: "revisa mis cambios y actualiza TopTop Lab".`,
  );
  process.exit(1);
}

const pull = spawnSync("git", ["pull", "--ff-only"], { cwd: RAIZ, stdio: "inherit" });
if (pull.status !== 0) process.exit(pull.status ?? 1);

const npm = spawnSync("npm", ["install"], { cwd: RAIZ, stdio: "inherit" });
if (npm.status !== 0) process.exit(npm.status ?? 1);
console.log("\nTopTop Lab está actualizado.");
