#!/usr/bin/env node
// Crea una variación de un proyecto que usa el mismo video (útil para versiones A/B/C de anuncios):
//   npm run duplicar -- take-01 take-01-b
import fs from "node:fs";
import path from "node:path";
import {
  CARPETA_PROYECTOS, actualizarListaDeProyectos, aId, escribirJson, leerJson,
} from "./lib/herramientas.mjs";

const [origen, destinoCrudo] = process.argv.slice(2);
const archivoOrigen = origen && path.join(CARPETA_PROYECTOS, origen, "edicion.json");
if (!origen || !destinoCrudo || !fs.existsSync(archivoOrigen)) {
  console.error("Uso: npm run duplicar -- <proyecto-existente> <nombre-nuevo>");
  process.exit(1);
}

const destino = aId(destinoCrudo);
const carpetaDestino = path.join(CARPETA_PROYECTOS, destino);
if (fs.existsSync(carpetaDestino)) {
  console.error(`Ya existe un proyecto llamado "${destino}".`);
  process.exit(1);
}

fs.mkdirSync(carpetaDestino, { recursive: true });
const edicion = leerJson(archivoOrigen);
// "video" sigue apuntando al archivo del proyecto original: no se copia el video.
escribirJson(path.join(carpetaDestino, "edicion.json"), { ...edicion, id: destino });
const transcripcion = path.join(CARPETA_PROYECTOS, origen, "transcripcion.txt");
if (fs.existsSync(transcripcion)) {
  fs.copyFileSync(transcripcion, path.join(carpetaDestino, "transcripcion.txt"));
}
actualizarListaDeProyectos();
console.log(`Listo: "${destino}" es una copia de "${origen}" (mismo video, edición independiente).`);
