#!/usr/bin/env node
// Vuelve a calcular cuándo se dice cada palabra de un proyecto (los tiempos de los subtítulos)
// escuchando su video otra vez, sin cambiar los textos (las correcciones hechas se conservan).
// Sirve para proyectos preparados antes de que los tiempos salieran de la voz (lib/transcribir.mjs).
//   npm run resincronizar -- <proyecto> [<proyecto>…]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CARPETA_PROYECTOS, RAIZ, escribirJson, ffmpeg, leerJson, redondear } from "./lib/herramientas.mjs";
import { transcribir } from "./lib/transcribir.mjs";

const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!ids.length) {
  console.error("Uso: npm run resincronizar -- <proyecto> [<proyecto>…]");
  process.exit(1);
}

const normalizar = (t) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]/g, "");
const duracionProbable = (texto) => 0.12 + 0.06 * normalizar(texto).length;

// Empareja las palabras viejas con las nuevas por su texto (la secuencia común más larga).
const emparejar = (viejas, nuevas) => {
  const a = viejas.map((p) => normalizar(p.texto));
  const b = nuevas.map((p) => normalizar(p.texto));
  const n = a.length;
  const m = b.length;
  const tabla = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      tabla[i][j] = a[i] && a[i] === b[j] ? tabla[i + 1][j + 1] + 1 : Math.max(tabla[i + 1][j], tabla[i][j + 1]);
    }
  }
  const pares = new Map();
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i] && a[i] === b[j]) {
      pares.set(i, j);
      i++;
      j++;
    } else if (tabla[i + 1][j] >= tabla[i][j + 1]) i++;
    else j++;
  }
  return pares;
};

for (const id of ids) {
  const archivo = path.join(CARPETA_PROYECTOS, id, "edicion.json");
  if (!fs.existsSync(archivo)) {
    console.error(`No existe el proyecto "${id}".`);
    continue;
  }
  const edicion = leerJson(archivo);
  if (!edicion.palabras?.length) {
    console.log(`${id}: no tiene subtítulos.`);
    continue;
  }
  console.log(`${id}: escuchando el video…`);
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "bydzyne-"));
  const wav = path.join(temporal, "audio.wav");
  ffmpeg(["-y", "-i", path.join(RAIZ, "public", edicion.video), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
  const { palabras: nuevas } = await transcribir({
    wav,
    modelo: edicion.ajustes?.modelo ?? "medium",
    idioma: edicion.ajustes?.idioma ?? "es",
  });
  fs.rmSync(temporal, { recursive: true, force: true });

  const viejas = edicion.palabras;
  const pares = emparejar(viejas, nuevas);
  // Las que no se emparejaron se reparten entre las vecinas que sí, según su largo.
  const tiempos = viejas.map((p, i) => (pares.has(i) ? { ...nuevas[pares.get(i)] } : null));
  for (let i = 0; i < viejas.length; ) {
    if (tiempos[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < viejas.length && !tiempos[j]) j++;
    const desde = i > 0 ? tiempos[i - 1].fin : Math.max(0, viejas[i].inicio);
    const hasta = j < viejas.length ? tiempos[j].inicio : Math.max(desde, viejas[j - 1].fin);
    const pesos = viejas.slice(i, j).map((p) => duracionProbable(p.texto));
    const total = pesos.reduce((t, x) => t + x, 0);
    let t = desde;
    for (let k = i; k < j; k++) {
      const largo = Math.max(0, hasta - desde) * (pesos[k - i] / total);
      tiempos[k] = { inicio: t, fin: t + Math.max(largo, 0.05) };
      t += largo;
    }
    i = j;
  }
  let movidas = 0;
  edicion.palabras = viejas.map((p, i) => {
    const inicio = redondear(tiempos[i].inicio);
    const fin = redondear(Math.max(tiempos[i].fin, tiempos[i].inicio + 0.05));
    if (Math.abs(inicio - p.inicio) > 0.15) movidas++;
    return { ...p, inicio, fin };
  });
  fs.copyFileSync(archivo, archivo.replace(/\.json$/, ".antes-de-resincronizar.json"));
  escribirJson(archivo, edicion);
  console.log(
    `  ${pares.size} de ${viejas.length} palabras encontradas en la voz; ${movidas} cambiaron de momento. ` +
      `(Copia de antes: edicion.antes-de-resincronizar.json)`,
  );
}
