// Detección de silencios y cálculo de los tramos que se conservan.
import { ffmpeg, redondear } from "./herramientas.mjs";

// Mide el volumen del audio (EBU R128) para adaptar el umbral de silencio a cada grabación.
export const medirUmbral = (wav) => {
  const salida = ffmpeg(["-i", wav, "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
  const json = salida.slice(salida.lastIndexOf("{"), salida.lastIndexOf("}") + 1);
  const datos = JSON.parse(json);
  return { umbralDb: parseFloat(datos.input_thresh), volumenLufs: parseFloat(datos.input_i) };
};

export const detectarSilencios = ({ wav, umbralDb, minDuracion, duracion }) => {
  const salida = ffmpeg([
    "-i", wav, "-af", `silencedetect=noise=${umbralDb}dB:d=${minDuracion}`, "-f", "null", "-",
  ]);
  const silencios = [];
  let inicio = null;
  for (const linea of salida.split("\n")) {
    const a = linea.match(/silence_start: (-?[\d.]+)/);
    if (a) inicio = Math.max(0, parseFloat(a[1]));
    const b = linea.match(/silence_end: ([\d.]+)/);
    if (b && inicio !== null) {
      silencios.push({ inicio, fin: Math.min(parseFloat(b[1]), duracion) });
      inicio = null;
    }
  }
  // Silencio que llega hasta el final sin "silence_end".
  if (inicio !== null) silencios.push({ inicio, fin: duracion });
  return silencios;
};

// Sonidos de relleno que Whisper a veces transcribe ("eh", "mmm", "emm"...).
const MULETILLA = /^(e+h*m*|m{2,}|a+h+|u+m+|e+m+|hmm+|mhm+)$/i;

export const buscarMuletillas = (palabras) =>
  palabras
    .filter((p) => MULETILLA.test(p.texto.trim().replace(/[.,;:!?¡¿…"]/g, "")))
    .map((p) => ({ inicio: p.inicio - 0.02, fin: p.fin + 0.02, motivo: "muletilla" }));

// Devuelve los tramos [inicio, fin] (en segundos del video original) que se conservan.
export const calcularSegmentos = ({ duracion, silencios, cortesExtra, margen, minSegmento = 0.25 }) => {
  const quitar = [
    ...silencios.map((s) => ({
      // El margen deja respirar el principio y el final de cada frase.
      inicio: s.inicio <= 0.01 ? 0 : s.inicio + margen,
      fin: s.fin >= duracion - 0.01 ? duracion : s.fin - margen,
    })),
    ...cortesExtra,
  ]
    .map((r) => ({ inicio: Math.max(0, r.inicio), fin: Math.min(duracion, r.fin) }))
    .filter((r) => r.fin - r.inicio > 0.05)
    .sort((a, b) => a.inicio - b.inicio);

  const unidos = [];
  for (const r of quitar) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && r.inicio <= ultimo.fin) ultimo.fin = Math.max(ultimo.fin, r.fin);
    else unidos.push({ ...r });
  }

  const segmentos = [];
  let cursor = 0;
  for (const r of unidos) {
    if (r.inicio > cursor) segmentos.push({ inicio: cursor, fin: r.inicio });
    cursor = Math.max(cursor, r.fin);
  }
  if (cursor < duracion) segmentos.push({ inicio: cursor, fin: duracion });

  return segmentos
    .filter((s) => s.fin - s.inicio >= minSegmento)
    .map((s) => ({ inicio: redondear(s.inicio), fin: redondear(s.fin) }));
};
