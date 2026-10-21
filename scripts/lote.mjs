#!/usr/bin/env node
// Trabajo en lote: prepara todos los videos nuevos de entrada/ con los mismos ajustes, revisa
// cada uno y deja un resumen de cuáles conviene mirar.
//   npm run lote
//   npm run lote -- --estilo cliente --musica musica/cancion.mp3 --pausa 0.3
// Acepta las mismas opciones que `npm run preparar` (menos --id y --forzar). Los videos que ya
// tienen proyecto no se tocan.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CARPETA_PROYECTOS, CARPETA_SALIDA, RAIZ, aId, ffmpeg, leerJson,
} from "./lib/herramientas.mjs";

const CARPETA_ENTRADA = path.join(RAIZ, "entrada");
const EXTENSIONES = [".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".mts"];

const opciones = process.argv.slice(2);
if (opciones.some((o) => o === "--forzar" || o === "--id" || o.startsWith("--id="))) {
  console.error("En lote no se usan --id ni --forzar: cada video toma el nombre de su archivo y no se rehace nada.");
  process.exit(1);
}
if (opciones.includes("--ayuda") || opciones.includes("-h")) {
  console.log("Uso: npm run lote [-- opciones de preparar]. Ver npm run preparar -- --ayuda");
  process.exit(0);
}

const videos = fs.existsSync(CARPETA_ENTRADA)
  ? fs.readdirSync(CARPETA_ENTRADA).filter((a) => EXTENSIONES.includes(path.extname(a).toLowerCase())).sort()
  : [];
const nuevos = videos.filter((a) => !fs.existsSync(path.join(CARPETA_PROYECTOS, aId(a), "edicion.json")));
const yaEstaban = videos.filter((a) => !nuevos.includes(a));

if (nuevos.length === 0) {
  console.log(
    videos.length
      ? `No hay videos nuevos en entrada/: los ${videos.length} que hay ya tienen proyecto.`
      : "No hay videos en entrada/. Copia ahí los videos y vuelve a intentarlo.",
  );
  process.exit(0);
}
console.log(`Videos nuevos: ${nuevos.length}${yaEstaban.length ? ` (se saltan ${yaEstaban.length} que ya tienen proyecto)` : ""}`);

const reloj = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const normalizar = (t) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]/g, "");

// Nivel de la voz (dB) en las partes que se conservan: avisa si está muy bajo o satura.
const nivelDeVoz = (edicion) => {
  const wav = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bydzyne-")), "voz.wav");
  try {
    ffmpeg(["-y", "-i", path.join(RAIZ, "public", edicion.video), "-vn", "-ac", "1", "-ar", "8000", "-c:a", "pcm_s16le", wav]);
    // Las muestras están en el bloque "data" del WAV.
    const wavCompleto = fs.readFileSync(wav);
    const inicio = wavCompleto.indexOf("data") + 8;
    const datos = wavCompleto.subarray(inicio, inicio + wavCompleto.readUInt32LE(inicio - 4));
    let energia = 0;
    let n = 0;
    let saturadas = 0;
    for (const s of edicion.segmentos) {
      for (let i = Math.floor(s.inicio * 8000); i < Math.min(datos.length / 2, s.fin * 8000); i++) {
        const v = datos.readInt16LE(i * 2) / 32768;
        energia += v * v;
        n++;
        if (Math.abs(v) > 0.99) saturadas++;
      }
    }
    return { db: 10 * Math.log10(energia / Math.max(1, n) + 1e-12), saturadas: saturadas / Math.max(1, n) };
  } finally {
    fs.rmSync(path.dirname(wav), { recursive: true, force: true });
  }
};

// Frases repetidas cerca (4 palabras iguales en menos de 25 s) que siguen en el video: suele ser
// una toma repetida que hay que quitar a mano.
const tomasRepetidas = (edicion) => {
  const conservada = (p) => edicion.segmentos.some((s) => p.inicio >= s.inicio && p.fin <= s.fin);
  const palabras = edicion.palabras.filter(conservada).map((p) => ({ ...p, n: normalizar(p.texto) })).filter((p) => p.n);
  const vistas = new Map();
  const encontradas = [];
  for (let i = 0; i + 4 <= palabras.length; i++) {
    const clave = palabras.slice(i, i + 4).map((p) => p.n).join(" ");
    const antes = vistas.get(clave);
    if (antes !== undefined && palabras[i].inicio - palabras[antes].inicio < 25) {
      if (!encontradas.some((t) => Math.abs(t - palabras[antes].inicio) < 10)) encontradas.push(palabras[antes].inicio);
    }
    vistas.set(clave, i);
  }
  return encontradas;
};

// Qué conviene mirar de un proyecto ya preparado y revisado.
const motivosParaMirar = (edicion, avisosRevision) => {
  const motivos = [];
  const editado = edicion.segmentos.reduce((t, s) => t + (s.fin - s.inicio), 0);
  if (edicion.palabras.length === 0) motivos.push("No se entendió la voz: no tiene subtítulos.");
  if (!edicion.caras) {
    motivos.push("No se encontró la cara: revisa que los textos no tapen a la persona.");
  } else {
    const sinCara = edicion.caras.cuadros.filter((c) => c === null).length / Math.max(1, edicion.caras.cuadros.length);
    if (sinCara > 0.3) motivos.push(`No se ve la cara en el ${Math.round(sinCara * 100)} % del video: revisa el encuadre.`);
  }
  if (editado < edicion.duracion * 0.5) {
    motivos.push(`Se cortó más de la mitad (${reloj(edicion.duracion)} → ${reloj(editado)}): revisa que no falten frases.`);
  }
  if (editado > 90) motivos.push(`Dura ${reloj(editado)}: para redes conviene menos de 1:30 (o dividirlo).`);
  if (editado < 5) motivos.push(`Dura solo ${editado.toFixed(1)} s.`);
  for (const t of tomasRepetidas(edicion)) motivos.push(`Parece haber una toma repetida cerca de ${reloj(t)}.`);
  try {
    const { db, saturadas } = nivelDeVoz(edicion);
    if (db < -35) motivos.push(`La voz se oye muy baja (${db.toFixed(0)} dB).`);
    if (saturadas > 0.001) motivos.push("La voz satura (se oye distorsionada) en algunas partes.");
  } catch {
    // Si no se puede medir, no es motivo para mirarlo.
  }
  motivos.push(...avisosRevision);
  return motivos;
};

const resultados = [];
for (const [n, archivo] of nuevos.entries()) {
  const id = aId(archivo);
  console.log(`\n━━━ [${n + 1}/${nuevos.length}] ${archivo} → ${id} ━━━`);
  const preparar = spawnSync(process.execPath, [path.join(RAIZ, "scripts", "preparar.mjs"), path.join(CARPETA_ENTRADA, archivo), ...opciones], {
    cwd: RAIZ,
    stdio: ["ignore", "inherit", "pipe"],
    encoding: "utf8",
  });
  if (preparar.status !== 0) {
    process.stderr.write(preparar.stderr ?? "");
    const error = (preparar.stderr ?? "").trim().split("\n").at(-1) || "error desconocido";
    resultados.push({ archivo, id, estado: "error", motivos: [`No se pudo preparar: ${error}`] });
    // Si falla por una opción mal escrita, fallará igual en todos: se para aquí.
    if (/no válido|No existe el estilo|No encuentro la música|volumen-musica|Unknown option/i.test(error)) break;
    continue;
  }
  console.log("Revisando…");
  const revisar = spawnSync(process.execPath, [path.join(RAIZ, "scripts", "revisar.mjs"), id], { cwd: RAIZ, encoding: "utf8" });
  const salida = `${revisar.stdout ?? ""}\n${revisar.stderr ?? ""}`;
  const avisos = salida.split("\n").filter((l) => /^(Aviso|Error):/.test(l)).map((l) => l.replace(/^(Aviso|Error):\s*/, ""));
  if (revisar.status !== 0) {
    resultados.push({ archivo, id, estado: "error", motivos: [`La revisión falló: ${salida.trim().split("\n").at(-1)}`, ...avisos] });
    continue;
  }
  const edicion = leerJson(path.join(CARPETA_PROYECTOS, id, "edicion.json"));
  const motivos = motivosParaMirar(edicion, avisos);
  const editado = edicion.segmentos.reduce((t, s) => t + (s.fin - s.inicio), 0);
  resultados.push({ archivo, id, estado: motivos.length ? "mirar" : "listo", motivos, duracion: editado });
}

// Resumen en pantalla y en salida/lote-<fecha>.md.
const ahora = new Date();
const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
const hora = `${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}`;
const ESTADOS = { listo: "✅ Listo", mirar: "👀 Míralo", error: "❌ Falló" };
const lineas = [
  `# Lote del ${fecha} a las ${hora.slice(0, 2)}:${hora.slice(2)}`,
  "",
  `Opciones: ${opciones.length ? `\`${opciones.join(" ")}\`` : "las de siempre"}`,
  "",
  "| Video | Proyecto | Duración | Estado |",
  "|---|---|---|---|",
  ...resultados.map((r) => `| ${r.archivo} | ${r.id} | ${r.duracion ? reloj(r.duracion) : "—"} | ${ESTADOS[r.estado]} |`),
  "",
];
for (const r of resultados.filter((x) => x.motivos.length)) {
  lineas.push(`## ${ESTADOS[r.estado]}: ${r.id}`, "", ...r.motivos.map((m) => `- ${m}`), "");
  if (r.estado !== "error") lineas.push(`Cuadros de revisión: \`salida/revision/${r.id}/\``, "");
}
const sinTocar = nuevos.length - resultados.length;
if (sinTocar > 0) lineas.push(`Se detuvo antes de terminar: ${sinTocar} video(s) sin preparar.`, "");
if (yaEstaban.length) lineas.push(`Ya tenían proyecto (no se tocaron): ${yaEstaban.join(", ")}`, "");
lineas.push(
  "Siguiente paso: abre la vista previa con `npm run dev`, mira los que dicen 👀 y exporta con",
  "`npm run exportar -- <proyecto> --red todas`.",
  "",
);

fs.mkdirSync(CARPETA_SALIDA, { recursive: true });
const archivoResumen = path.join(CARPETA_SALIDA, `lote-${fecha}-${hora}.md`);
fs.writeFileSync(archivoResumen, lineas.join("\n"));
console.log(`\n${lineas.join("\n")}`);
console.log(`Resumen guardado en ${path.relative(RAIZ, archivoResumen)}`);
