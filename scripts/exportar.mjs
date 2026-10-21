#!/usr/bin/env node
// Exporta un proyecto a MP4:
//   npm run exportar -- take-01                 (formato guardado en edicion.json)
//   npm run exportar -- take-01 --formato 1:1
//   npm run exportar -- take-01 --todos         (9:16, 4:5, 1:1 y 16:9)
//   npm run exportar -- take-01 --red whatsapp  (calidad y tamaño de cada red social)
//   npm run exportar -- take-01 --red todas     (WhatsApp, Instagram, TikTok y YouTube)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { asegurarCaras } from "./lib/caras.mjs";
import { REDES, TODAS_LAS_REDES, asegurarProduccion, opcionesDeRed } from "./lib/produccion.mjs";
import { asegurarRecortes, avisarRecortesIncompletos } from "./lib/recorte.mjs";
import {
  CARPETA_PROYECTOS, CARPETA_SALIDA, RAIZ, actualizarListaDeProyectos, leerJson, puertoLibre,
} from "./lib/herramientas.mjs";

const FORMATOS = ["9:16", "4:5", "1:1", "16:9"];

const { values: op, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    formato: { type: "string" },
    todos: { type: "boolean", default: false },
    red: { type: "string" },
  },
});

const id = positionals[0];
const archivoEdicion = id && path.join(CARPETA_PROYECTOS, id, "edicion.json");
if (!id || !fs.existsSync(archivoEdicion)) {
  const existentes = fs.existsSync(CARPETA_PROYECTOS) ? fs.readdirSync(CARPETA_PROYECTOS) : [];
  console.error(
    `Uso: npm run exportar -- <proyecto> [--formato 9:16|4:5|1:1|16:9] [--todos]\n` +
      `                                  [--red ${Object.keys(REDES).join("|")}|todas]\n` +
      `Proyectos disponibles: ${existentes.join(", ") || "(ninguno; usa npm run preparar primero)"}`,
  );
  process.exit(1);
}

// Redes pedidas: "--red whatsapp", "--red whatsapp,youtube" o "--red todas".
const redes = op.red
  ? op.red === "todas"
    ? TODAS_LAS_REDES
    : op.red.split(",").map((r) => r.trim().toLowerCase())
  : [];
for (const r of redes) {
  if (!REDES[r]) {
    console.error(`Red no válida: ${r}. Usa ${Object.keys(REDES).join(", ")} o todas.`);
    process.exit(1);
  }
}
if (op.formato && !FORMATOS.includes(op.formato)) {
  console.error(`Formato no válido: ${op.formato}`);
  process.exit(1);
}

await asegurarCaras(archivoEdicion);
await asegurarRecortes(archivoEdicion);
avisarRecortesIncompletos(archivoEdicion);
const edicion = leerJson(archivoEdicion);
asegurarProduccion(edicion);

// Cada exportación: formato, nombre del archivo y opciones extra de calidad.
const segundos =
  edicion.segmentos.reduce((t, s) => t + (s.fin - s.inicio), 0) + (edicion.opciones.cierre?.duracion ?? 0);
const exportaciones = redes.length
  ? redes.map((red) => {
      const formato = op.formato ?? REDES[red].formato ?? edicion.opciones.formato;
      // El formato va en el nombre solo si no es el de siempre para esa red.
      const propio = REDES[red].formato ?? edicion.opciones.formato;
      const nombre = formato === propio ? `${id}-${red}` : `${id}-${red}-${formato.replace(":", "x")}`;
      return { formato, nombre, red, ...opcionesDeRed(red, formato, segundos) };
    })
  : (op.todos ? FORMATOS : [op.formato ?? edicion.opciones.formato]).map((formato) => ({
      formato,
      nombre: `${id}-${formato.replace(":", "x")}`,
      red: null,
      opciones: [],
      aviso: null,
    }));

// Un video vertical pasado a horizontal se recorta mucho: con encuadre fijo, la cara puede quedar fuera.
if (edicion.alto > edicion.ancho && exportaciones.some((e) => e.formato === "16:9")) {
  const fijo = edicion.opciones.enfoqueY !== "auto";
  console.log(
    "Aviso: el video original es vertical y se exporta en horizontal (16:9): se pierde arriba y abajo." +
      (fijo ? ' El encuadre es fijo (enfoqueY): con "auto" seguiría a la cara.' : "") +
      " Revisa con npm run revisar -- " + id + " --formato 16:9, o usa --red youtube-shorts (vertical).",
  );
}

actualizarListaDeProyectos();
fs.mkdirSync(CARPETA_SALIDA, { recursive: true });
const remotion = path.join(RAIZ, "node_modules", ".bin", "remotion");
const hechos = [];

for (const { formato, nombre, red, opciones, aviso } of exportaciones) {
  const salida = path.join(CARPETA_SALIDA, `${nombre}.mp4`);
  // Instagram y TikTok usan los mismos ajustes: si ya se exportó uno igual, se copia.
  const igual = hechos.find((h) => h.formato === formato && h.opciones.join() === opciones.join());
  if (igual) {
    fs.copyFileSync(igual.salida, salida);
  } else {
    const props = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bydzyne-")), "props.json");
    fs.writeFileSync(props, JSON.stringify({ proyecto: id, formato }));
    console.log(`\nExportando ${id} ${red ? `para ${REDES[red].nombre} ` : ""}en ${formato}…`);
    const r = spawnSync(
      remotion,
      ["render", id, salida, `--props=${props}`, `--port=${await puertoLibre()}`, ...opciones],
      { cwd: RAIZ, stdio: "inherit" },
    );
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  hechos.push({ formato, opciones, salida });
  const megas = fs.statSync(salida).size / 1e6;
  console.log(`Guardado en ${path.relative(RAIZ, salida)} (${megas.toFixed(1)} MB)`);
  if (aviso) console.log(`Aviso: ${aviso}`);
}
