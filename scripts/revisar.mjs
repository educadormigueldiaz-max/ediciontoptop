#!/usr/bin/env node
// Genera cuadros de revisión de un proyecto en salida/revision/<id>/:
// el inicio, los primeros cortes, la mitad de cada elemento gráfico, el final y el cierre.
//   npm run revisar -- take-01
//   npm run revisar -- take-01 --formato 16:9
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { asegurarCaras } from "./lib/caras.mjs";
import { aFrameEditado as aFrameEnTramos, tramosDe } from "./lib/escenas.mjs";
import { asegurarProduccion } from "./lib/produccion.mjs";
import { asegurarRecortes, avisarRecortesIncompletos } from "./lib/recorte.mjs";
import {
  CARPETA_PROYECTOS, CARPETA_SALIDA, FPS, RAIZ, actualizarListaDeProyectos, leerJson, puertoLibre,
} from "./lib/herramientas.mjs";

const { values: op, positionals } = parseArgs({
  allowPositionals: true,
  options: { formato: { type: "string" } },
});

const id = positionals[0];
const archivoEdicion = id && path.join(CARPETA_PROYECTOS, id, "edicion.json");
if (!id || !fs.existsSync(archivoEdicion)) {
  console.error("Uso: npm run revisar -- <proyecto> [--formato 9:16|4:5|1:1|16:9]");
  process.exit(1);
}
await asegurarCaras(archivoEdicion);
await asegurarRecortes(archivoEdicion);
avisarRecortesIncompletos(archivoEdicion);
const edicion = leerJson(archivoEdicion);
asegurarProduccion(edicion);
const { musica, opciones } = edicion;
console.log(
  `Estilo: ${edicion.estilo ?? "predeterminado"} · ` +
    `Música: ${musica ? `${musica.archivo} (volumen ${musica.volumen ?? 0.25})` : "no"} · ` +
    `Efectos de sonido: ${opciones.sonidos === false ? "apagados" : "sí"}`,
);

const tramos = tramosDe(edicion);
const finVideo = tramos.reduce((t, x) => t + x.duracionFrames, 0);
const aFrameEditado = (segundo, lado) => aFrameEnTramos(tramos, segundo, lado);

const cuadros = [["01-inicio", Math.min(15, finVideo - 1)]];
tramos.slice(1, 3).forEach((t, i) => cuadros.push([`02-corte-${i + 1}`, t.desdeFrame + 3]));
(edicion.elementos ?? []).forEach((e, i) => {
  const desde = aFrameEditado(e.inicio, "inicio");
  const hasta = aFrameEditado(e.fin, "fin");
  if (desde === null || hasta === null || hasta - desde < 10) {
    console.log(`Aviso: el elemento ${i + 1} (${e.tipo}) cae en una parte cortada y no se ve.`);
    return;
  }
  // Para las listas, cuando ya aparecieron todos los puntos.
  const frame = e.tipo === "lista" ? Math.max(desde, hasta - 15) : Math.floor((desde + hasta) / 2);
  cuadros.push([`03-elemento-${i + 1}-${e.tipo}`, frame]);
});
cuadros.push(["04-final", Math.max(0, finVideo - 10)]);
if (edicion.opciones.cierre) {
  cuadros.push(["05-cierre", finVideo + Math.round((edicion.opciones.cierre.duracion * FPS) / 2)]);
}

actualizarListaDeProyectos();
const carpeta = path.join(CARPETA_SALIDA, "revision", id);
fs.rmSync(carpeta, { recursive: true, force: true });
fs.mkdirSync(carpeta, { recursive: true });
const props = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bydzyne-")), "props.json");
fs.writeFileSync(props, JSON.stringify({ proyecto: id, formato: op.formato ?? null }));
const remotion = path.join(RAIZ, "node_modules", ".bin", "remotion");
const puerto = await puertoLibre();

for (const [nombre, frame] of cuadros) {
  const salida = path.join(carpeta, `${nombre}.png`);
  const r = spawnSync(
    remotion,
    ["still", id, salida, `--frame=${frame}`, `--props=${props}`, `--port=${puerto}`, "--log=error"],
    { cwd: RAIZ, encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(`No se pudo generar ${nombre} (frame ${frame}):\n${r.stderr || r.stdout}`);
    process.exit(1);
  }
  console.log(`${path.relative(RAIZ, salida)}  (frame ${frame})`);
}
