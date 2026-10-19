// Detección de caras local para que los textos y gráficos nunca tapen la cara.
// Modelo: Ultra-Light-Fast-Generic-Face-Detector (licencia MIT), ver modelos/LEEME.md.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, REMOTION_BIN, escribirJson, leerJson, redondear } from "./herramientas.mjs";

const MODELO = path.join(RAIZ, "modelos", "caras-ultraface-640.onnx");
const ANCHO = 640;
const ALTO = 480;
const UMBRAL = 0.7;
// Segundos entre cada cuadro analizado.
export const CADA = 0.5;

const area = (c) => Math.max(0, c.x2 - c.x1) * Math.max(0, c.y2 - c.y1);
const solapamiento = (a, b) => {
  const inter = area({
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
    x2: Math.min(a.x2, b.x2),
    y2: Math.min(a.y2, b.y2),
  });
  return inter / (area(a) + area(b) - inter);
};

// Devuelve { cada, cuadros } con la cara principal de cada cuadro como
// [x, y, ancho, alto] (fracciones del video original), o null si no se pudo detectar.
export const detectarCaras = async ({ video, ancho, alto }) => {
  let ort;
  try {
    ort = (await import("onnxruntime-node")).default;
  } catch {
    console.warn("  Aviso: el detector de caras no está disponible en esta computadora; se omite.");
    return null;
  }
  const sesion = await ort.InferenceSession.create(MODELO, { logSeverityLevel: 3 });

  // El cuadro se reduce sin deformarlo y se centra en un lienzo negro de 640x480.
  const escala = Math.min(ANCHO / ancho, ALTO / alto);
  const w = Math.floor((ancho * escala) / 2) * 2;
  const h = Math.floor((alto * escala) / 2) * 2;
  const px = Math.floor((ANCHO - w) / 2);
  const py = Math.floor((ALTO - h) / 2);

  // (El FFmpeg de Remotion no trae los filtros fps ni pad: "-r" baja los cuadros por segundo
  // y el relleno negro se hace aquí abajo.)
  const proceso = spawn(REMOTION_BIN, [
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", video,
    "-vf", `scale=${w}:${h}`, "-r", String(1 / CADA),
    "-f", "image2pipe", "-c:v", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
  ]);
  let errores = "";
  proceso.stderr.on("data", (d) => (errores += d));

  const plano = ANCHO * ALTO;
  const entrada = new Float32Array(3 * plano).fill(-127 / 128);
  const analizar = async (rgb) => {
    for (let fila = 0; fila < h; fila++) {
      for (let col = 0; col < w; col++) {
        const origen = (fila * w + col) * 3;
        const destino = (fila + py) * ANCHO + col + px;
        entrada[destino] = (rgb[origen] - 127) / 128;
        entrada[plano + destino] = (rgb[origen + 1] - 127) / 128;
        entrada[2 * plano + destino] = (rgb[origen + 2] - 127) / 128;
      }
    }
    const r = await sesion.run({ input: new ort.Tensor("float32", entrada, [1, 3, ALTO, ANCHO]) });
    const puntajes = r.scores.data;
    const cajas = r.boxes.data;
    const candidatas = [];
    for (let k = 0; k < puntajes.length / 2; k++) {
      const p = puntajes[k * 2 + 1];
      if (p < UMBRAL) continue;
      candidatas.push({ p, x1: cajas[k * 4], y1: cajas[k * 4 + 1], x2: cajas[k * 4 + 2], y2: cajas[k * 4 + 3] });
    }
    candidatas.sort((a, b) => b.p - a.p);
    const elegidas = [];
    for (const c of candidatas) {
      if (elegidas.every((e) => solapamiento(e, c) < 0.3)) elegidas.push(c);
    }
    if (elegidas.length === 0) return null;
    // La cara principal es la más grande.
    const c = elegidas.reduce((a, b) => (area(b) > area(a) ? b : a));
    const x = Math.max(0, (c.x1 * ANCHO - px) / w);
    const y = Math.max(0, (c.y1 * ALTO - py) / h);
    const x2 = Math.min(1, (c.x2 * ANCHO - px) / w);
    const y2 = Math.min(1, (c.y2 * ALTO - py) / h);
    return [redondear(x), redondear(y), redondear(x2 - x), redondear(y2 - y)];
  };

  const tamano = w * h * 3;
  const cuadros = [];
  let pendiente = Buffer.alloc(0);
  for await (const trozo of proceso.stdout) {
    pendiente = pendiente.length ? Buffer.concat([pendiente, trozo]) : trozo;
    while (pendiente.length >= tamano) {
      cuadros.push(await analizar(pendiente.subarray(0, tamano)));
      pendiente = pendiente.subarray(tamano);
      if (cuadros.length % 40 === 0) process.stdout.write(`  Caras: ${cuadros.length * CADA} s analizados\n`);
    }
  }
  const codigo = await new Promise((resolve) => proceso.on("close", resolve));
  if (codigo !== 0) throw new Error(`No se pudo leer el video para buscar caras:\n${errores}`);

  // Si en un cuadro suelto no se vio la cara (giro, parpadeo), se usa la del vecino.
  const rellenos = cuadros.map((c, i) => c ?? cuadros[i - 1] ?? cuadros[i + 1] ?? null);
  if (rellenos.every((c) => c === null)) return null;
  return { cada: CADA, cuadros: rellenos };
};

// Proyectos creados antes de la detección de caras: la agrega una sola vez (si ya se buscó y no
// había cara, `caras` queda en null y no se repite).
export const asegurarCaras = async (archivoEdicion) => {
  const edicion = leerJson(archivoEdicion);
  if ("caras" in edicion) return;
  console.log(`Buscando la cara en "${edicion.id}" (solo esta vez)…`);
  const caras = await detectarCaras({
    video: path.join(RAIZ, "public", edicion.video),
    ancho: edicion.ancho,
    alto: edicion.alto,
  });
  if (fs.existsSync(archivoEdicion)) escribirJson(archivoEdicion, { ...leerJson(archivoEdicion), caras });
};
