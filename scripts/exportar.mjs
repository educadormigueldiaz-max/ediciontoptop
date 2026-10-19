#!/usr/bin/env node
// Exporta un proyecto a MP4:
//   npm run exportar -- take-01                 (formato guardado en edicion.json)
//   npm run exportar -- take-01 --formato 1:1
//   npm run exportar -- take-01 --todos         (9:16, 4:5, 1:1 y 16:9)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { asegurarCaras } from "./lib/caras.mjs";
import {
  CARPETA_PROYECTOS, CARPETA_SALIDA, RAIZ, actualizarListaDeProyectos, leerJson,
} from "./lib/herramientas.mjs";

const FORMATOS = ["9:16", "4:5", "1:1", "16:9"];

const { values: op, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    formato: { type: "string" },
    todos: { type: "boolean", default: false },
  },
});

const id = positionals[0];
const archivoEdicion = id && path.join(CARPETA_PROYECTOS, id, "edicion.json");
if (!id || !fs.existsSync(archivoEdicion)) {
  const existentes = fs.existsSync(CARPETA_PROYECTOS) ? fs.readdirSync(CARPETA_PROYECTOS) : [];
  console.error(
    `Uso: npm run exportar -- <proyecto> [--formato 9:16|4:5|1:1|16:9] [--todos]\n` +
      `Proyectos disponibles: ${existentes.join(", ") || "(ninguno; usa npm run preparar primero)"}`,
  );
  process.exit(1);
}

await asegurarCaras(archivoEdicion);
const edicion = leerJson(archivoEdicion);
const formatos = op.todos ? FORMATOS : [op.formato ?? edicion.opciones.formato];
for (const f of formatos) {
  if (!FORMATOS.includes(f)) {
    console.error(`Formato no válido: ${f}`);
    process.exit(1);
  }
}

actualizarListaDeProyectos();
fs.mkdirSync(CARPETA_SALIDA, { recursive: true });
const remotion = path.join(RAIZ, "node_modules", ".bin", "remotion");

for (const formato of formatos) {
  const salida = path.join(CARPETA_SALIDA, `${id}-${formato.replace(":", "x")}.mp4`);
  const props = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "toptop-")), "props.json");
  fs.writeFileSync(props, JSON.stringify({ proyecto: id, formato }));
  console.log(`\nExportando ${id} en ${formato}…`);
  const r = spawnSync(remotion, ["render", id, salida, `--props=${props}`], {
    cwd: RAIZ,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log(`Guardado en ${path.relative(RAIZ, salida)}`);
}
