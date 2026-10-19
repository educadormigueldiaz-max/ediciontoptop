#!/usr/bin/env node
// Busca la cara en un proyecto que ya existe, sin tocar el resto de la edición:
//   npm run caras -- take-01
import fs from "node:fs";
import path from "node:path";
import { detectarCaras } from "./lib/caras.mjs";
import { CARPETA_PROYECTOS, RAIZ, escribirJson, leerJson } from "./lib/herramientas.mjs";

const id = process.argv[2];
const archivoEdicion = id && path.join(CARPETA_PROYECTOS, id, "edicion.json");
if (!id || !fs.existsSync(archivoEdicion)) {
  console.error("Uso: npm run caras -- <proyecto>");
  process.exit(1);
}

const edicion = leerJson(archivoEdicion);
console.log(`Buscando la cara en "${id}"…`);
const caras = await detectarCaras({
  video: path.join(RAIZ, "public", edicion.video),
  ancho: edicion.ancho,
  alto: edicion.alto,
});
// Se vuelve a leer por si el archivo cambió mientras se analizaba el video.
escribirJson(archivoEdicion, { ...leerJson(archivoEdicion), caras });
console.log(
  caras
    ? `Listo: ${caras.cuadros.filter(Boolean).length} momentos con cara guardados en edicion.json.`
    : "No se encontró una cara en el video.",
);
