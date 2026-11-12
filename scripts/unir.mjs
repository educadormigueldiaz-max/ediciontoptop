#!/usr/bin/env node
// Une varias partes de un mismo video (grabado por pedazos) en entrada/<nombre>.mp4 y anota dónde
// empieza cada una. Después: npm run preparar -- entrada/<nombre>.mp4 y pide a Claude que lo ordene
// ("Ordena las partes según la lógica y quita las tomas repetidas").
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { RAIZ, aId } from "./lib/herramientas.mjs";
import { MAX_PARTES, unirPartes } from "./lib/unir.mjs";

const { values: op, positionals: archivos } = parseArgs({
  allowPositionals: true,
  options: { nombre: { type: "string" }, salida: { type: "string" }, nombres: { type: "string" }, ayuda: { type: "boolean" } },
});
if (op.ayuda || archivos.length < 2) {
  console.log(`Uso: npm run unir -- parte1.mp4 parte2.mp4 [más partes…] [--nombre mi-video]
Une de 2 a ${MAX_PARTES} partes en entrada/<nombre>.mp4 (en el orden en que las escribes; el orden
final lo decide la edición). Luego: npm run preparar -- entrada/<nombre>.mp4`);
  process.exit(archivos.length < 2 && !op.ayuda ? 1 : 0);
}
for (const a of archivos) if (!fs.existsSync(a)) { console.error(`No encuentro ${a}`); process.exit(1); }
// --salida (lo usa el piloto): ruta exacta del video unido. --nombres: JSON con el nombre original de cada parte.
const salida = op.salida ? path.resolve(op.salida) : path.join(RAIZ, "entrada", `${aId(op.nombre ?? `${path.basename(archivos[0])}-unido`)}.mp4`);
let nombres;
try { nombres = op.nombres ? JSON.parse(op.nombres) : undefined; } catch { nombres = undefined; }
if (!Array.isArray(nombres) || nombres.length !== archivos.length) nombres = undefined;
fs.mkdirSync(path.dirname(salida), { recursive: true });
console.log(`Uniendo ${archivos.length} partes…`);
let partes;
try {
  partes = unirPartes(archivos, salida, nombres);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
for (const p of partes) console.log(`  Parte ${p.n}: ${p.nombre} (${p.inicio.toFixed(1)} s → ${p.fin.toFixed(1)} s)`);
console.log(`\nListo: ${path.relative(RAIZ, salida)}\nSiguiente: npm run preparar -- ${path.relative(RAIZ, salida)}`);
