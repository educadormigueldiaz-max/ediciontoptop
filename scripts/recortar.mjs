#!/usr/bin/env node
// Recorta a la persona del fondo en los momentos que lo necesitan (elementos "detras",
// "fondo" y "marco"). Revisar y exportar lo hacen solos; este comando sirve para verlo
// enseguida en la vista previa:
//   npm run recortar -- take-01
import fs from "node:fs";
import path from "node:path";
import { asegurarRecortes, rangosNecesarios } from "./lib/recorte.mjs";
import { CARPETA_PROYECTOS, FPS, leerJson } from "./lib/herramientas.mjs";

const id = process.argv[2];
const archivoEdicion = id && path.join(CARPETA_PROYECTOS, id, "edicion.json");
if (!id || !fs.existsSync(archivoEdicion)) {
  console.error("Uso: npm run recortar -- <proyecto>");
  process.exit(1);
}

if (rangosNecesarios(leerJson(archivoEdicion)).length === 0) {
  console.log(`"${id}" no tiene elementos que necesiten recorte (detras, fondo o marco).`);
  process.exit(0);
}
await asegurarRecortes(archivoEdicion);
const { recorte } = leerJson(archivoEdicion);
const cuadros = (recorte?.cuadros ?? []).reduce((n, [a, b]) => n + b - a, 0);
console.log(`Listo: ${(cuadros / FPS).toFixed(1)} s con recorte. Si la vista previa está abierta, recarga la página.`);
