// Une varias partes grabadas por separado en un solo video, sin decidir el orden final:
// se pegan en el orden recibido y se anota dónde empieza y termina cada una (partes.json).
// Después, al editar, Claude lee la transcripción por partes, ordena los tramos según la lógica
// de lo que se dice y quita las tomas repetidas (skill bydzyne-piloto, "Video en varias partes").
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FPS, ffmpeg, ffprobe } from "./herramientas.mjs";

export const MAX_PARTES = 15;

// Ancho y alto como se ven (los videos del celular guardan la rotación aparte)
const medidas = (info) => {
  const v = info.streams.find((s) => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
  if (!v) return null;
  const giro = Math.abs(
    parseFloat(v.tags?.rotate ?? v.side_data_list?.find((d) => d.rotation != null)?.rotation ?? 0),
  ) % 180;
  return giro === 90 ? { w: v.height, h: v.width } : { w: v.width, h: v.height };
};

// Tamaño común: la orientación que más se repite, sin pasar de 1080 de lado corto
const tamanoComun = (lista) => {
  const verticales = lista.filter((m) => m.h > m.w).length;
  const vertical = verticales * 2 >= lista.length;
  const corto = Math.min(1080, Math.max(...lista.map((m) => Math.min(m.w, m.h))));
  const par = (n) => Math.round(n / 2) * 2;
  return vertical ? { w: par(corto), h: par((corto * 16) / 9) } : { w: par((corto * 16) / 9), h: par(corto) };
};

/**
 * archivos: rutas de las partes en el orden en que llegaron. salida: ruta del .mp4 unido.
 * Devuelve [{ n, nombre, inicio, fin }] (segundos en el video unido) y lo guarda junto a la salida
 * como <salida sin extensión>.partes.json, que preparar copia al proyecto.
 */
export const unirPartes = (archivos, salida, nombres = archivos.map((a) => path.basename(a))) => {
  if (archivos.length < 2) throw new Error("Para unir hacen falta al menos 2 partes.");
  if (archivos.length > MAX_PARTES) throw new Error(`Máximo ${MAX_PARTES} partes.`);
  const infos = archivos.map((a) => {
    const info = ffprobe(a);
    const m = medidas(info);
    if (!m) throw new Error(`La parte ${path.basename(a)} no tiene imagen (¿es un audio?).`);
    return {
      ...m,
      duracion: parseFloat(info.format.duration),
      conAudio: info.streams.some((s) => s.codec_type === "audio"),
    };
  });
  if (infos.some((i) => !(i.duracion > 0))) throw new Error("No se pudo medir la duración de alguna parte.");
  const { w, h } = tamanoComun(infos);

  // Cada parte se pasa a lo mismo (tamaño con bordes negros, 30 fps, audio estéreo a 48 kHz) y luego
  // se pegan sin volver a convertir. El FFmpeg de Remotion no trae "pad": "rotate" con ángulo 0 y un
  // lienzo más grande hace lo mismo. Si una parte no tiene sonido, se le pone silencio.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bydzyne-unir-"));
  try {
    const listos = infos.map((info, i) => {
      const destino = path.join(tmp, `parte-${String(i + 1).padStart(2, "0")}.mp4`);
      ffmpeg([
        "-y", "-i", archivos[i],
        ...(info.conAudio ? [] : ["-f", "lavfi", "-t", info.duracion.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo"]),
        "-map", "0:v:0", "-map", info.conAudio ? "0:a:0" : "1:a:0",
        "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,rotate=0:ow=${w}:oh=${h}:c=black,format=yuv420p`,
        "-r", String(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-t", info.duracion.toFixed(3),
        destino,
      ]);
      return destino;
    });
    const lista = path.join(tmp, "lista.txt");
    fs.writeFileSync(lista, listos.map((l) => `file '${l.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
    ffmpeg(["-y", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", "-movflags", "+faststart", salida]);
    // Duración real de cada parte ya convertida (más exacta que la del original)
    infos.forEach((info, i) => { info.duracion = parseFloat(ffprobe(listos[i]).format.duration) || info.duracion; });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // Dónde quedó cada parte, medido sobre el resultado (se reparte el sobrante por si hubo redondeos)
  const total = parseFloat(ffprobe(salida).format.duration);
  const suma = infos.reduce((t, i) => t + i.duracion, 0);
  const factor = total > 0 && suma > 0 ? total / suma : 1;
  let t = 0;
  const partes = infos.map((info, i) => {
    const inicio = t;
    t += info.duracion * factor;
    return { n: i + 1, nombre: String(nombres[i]).slice(0, 120), inicio: +inicio.toFixed(3), fin: +t.toFixed(3) };
  });
  fs.writeFileSync(archivoPartes(salida), JSON.stringify(partes, null, 2) + "\n");
  return partes;
};

export const archivoPartes = (video) => video.replace(/\.[^./]+$/, "") + ".partes.json";

// Parte un tramo que cruza el límite entre dos partes, para que cada tramo sea de una sola parte
// (así se pueden reordenar sin mezclar tomas).
export const cortarEnPartes = (segmentos, partes) => {
  const limites = partes.slice(1).map((p) => p.inicio);
  const salida = [];
  for (const s of segmentos) {
    let actual = { ...s };
    for (const b of limites) {
      if (b > actual.inicio + 0.05 && b < actual.fin - 0.05) {
        salida.push({ ...actual, fin: b });
        actual = { ...actual, inicio: b };
      }
    }
    salida.push(actual);
  }
  return salida;
};

export const parteDe = (segundo, partes) => partes.find((p) => segundo >= p.inicio && segundo < p.fin)?.n ?? partes.at(-1)?.n;
