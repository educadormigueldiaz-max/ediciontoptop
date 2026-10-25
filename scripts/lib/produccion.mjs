// Producción: revisa que el estilo y la música de un proyecto existan, y guarda los ajustes de
// exportación de cada red social.
import fs from "node:fs";
import path from "node:path";
import { RAIZ, ffprobe } from "./herramientas.mjs";

export const CARPETA_ESTILOS = path.join(RAIZ, "estilos");

export const estilosDisponibles = () => [
  "predeterminado",
  ...(fs.existsSync(CARPETA_ESTILOS)
    ? fs.readdirSync(CARPETA_ESTILOS).filter((a) => a.endsWith(".json")).map((a) => a.replace(/\.json$/, "")).sort()
    : []),
];

// Nombre y descripción de cada estilo, para mostrarlos ("tecnologico" → "Tecnológico").
export const nombresDeEstilos = () =>
  Object.fromEntries(
    estilosDisponibles().map((e) => {
      if (e === "predeterminado") return [e, { nombre: "Predeterminado", descripcion: "Los colores de siempre." }];
      try {
        const d = JSON.parse(fs.readFileSync(path.join(CARPETA_ESTILOS, `${e}.json`), "utf8"));
        return [e, { nombre: d.nombre ?? e, descripcion: d.descripcion ?? "" }];
      } catch {
        return [e, { nombre: e, descripcion: "" }];
      }
    }),
  );

// Errores (no se puede dibujar el video) y avisos (se puede, pero conviene mirarlo).
export const revisarProduccion = (edicion) => {
  const errores = [];
  const avisos = [];
  const estilo = edicion.estilo ?? "predeterminado";
  if (estilo !== "predeterminado") {
    const archivo = path.join(CARPETA_ESTILOS, `${estilo}.json`);
    if (!fs.existsSync(archivo)) {
      errores.push(`No existe el estilo "${estilo}" (estilos/${estilo}.json). Hay: ${estilosDisponibles().join(", ")}.`);
    } else {
      try {
        const datos = JSON.parse(fs.readFileSync(archivo, "utf8"));
        for (const fuente of [datos.fuente, datos.fuenteAlterna]) {
          for (const a of fuente?.archivos ?? []) {
            const ruta = typeof a === "string" ? a : a.archivo;
            if (!fs.existsSync(path.join(RAIZ, "public", ruta))) {
              errores.push(`El estilo "${estilo}" usa la fuente public/${ruta}, que no existe.`);
            }
          }
        }
      } catch (e) {
        errores.push(`estilos/${estilo}.json no se puede leer: ${e.message}`);
      }
    }
  }

  const { musica } = edicion;
  if (musica) {
    const archivo = path.join(RAIZ, "public", musica.archivo);
    if (!fs.existsSync(archivo)) {
      errores.push(`No encuentro la música public/${musica.archivo}. Ponla en public/musica/.`);
    } else {
      const volumen = musica.volumen ?? 0.25;
      const alHablar = musica.alHablar ?? 0.3;
      if (volumen > 0.5) avisos.push(`La música está alta (volumen ${volumen}): puede tapar la voz.`);
      if (volumen * alHablar > 0.15) {
        avisos.push(`La música baja poco cuando se habla (alHablar ${alHablar}): revisa que la voz se entienda.`);
      }
      const duracionCancion = parseFloat(ffprobe(archivo).format.duration) - (musica.desde ?? 0);
      const editado = edicion.segmentos.reduce((t, s) => t + (s.fin - s.inicio), 0);
      if (duracionCancion < editado) {
        avisos.push(
          `La canción (${duracionCancion.toFixed(0)} s) es más corta que el video (${editado.toFixed(0)} s): se repite desde el principio.`,
        );
      }
    }
  }
  return { errores, avisos };
};

// Muestra los avisos; con errores, termina el programa.
export const asegurarProduccion = (edicion) => {
  const { errores, avisos } = revisarProduccion(edicion);
  for (const a of avisos) console.log(`Aviso: ${a}`);
  if (errores.length) {
    for (const e of errores) console.error(`Error: ${e}`);
    process.exit(1);
  }
};

// Ajustes de exportación por red social. `formato` = el que se usa si no se pide otro
// (null = el del proyecto). `ladoMayor` achica el video (WhatsApp).
export const REDES = {
  whatsapp: {
    nombre: "WhatsApp",
    formato: null,
    ladoMayor: 1280,
    // Liviano: se calcula la calidad para que pese menos de esto.
    pesoMaximoMB: 15,
    audio: "96k",
  },
  instagram: { nombre: "Instagram (Reels)", formato: "9:16", crf: 18, audio: "192k" },
  tiktok: { nombre: "TikTok", formato: "9:16", crf: 18, audio: "192k" },
  youtube: { nombre: "YouTube", formato: "16:9", crf: 16, audio: "192k" },
  "youtube-shorts": { nombre: "YouTube Shorts", formato: "9:16", crf: 16, audio: "192k" },
};
export const TODAS_LAS_REDES = ["whatsapp", "instagram", "tiktok", "youtube"];

const DIMENSIONES = {
  "9:16": [1080, 1920],
  "4:5": [1080, 1350],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080],
};

// Opciones de `remotion render` para una red y un formato, y el aviso si no alcanza el peso.
export const opcionesDeRed = (red, formato, segundos) => {
  const ajustes = REDES[red];
  const opciones = ["--codec=h264", `--audio-bitrate=${ajustes.audio}`];
  let aviso = null;
  if (ajustes.ladoMayor) {
    // Se dibuja directo en el tamaño chico (todo se acomoda solo al tamaño del video).
    // Ancho y alto pares, como piden los reproductores.
    const escala = Math.min(1, ajustes.ladoMayor / Math.max(...DIMENSIONES[formato]));
    const [ancho, alto] = DIMENSIONES[formato].map((lado) => Math.round((lado * escala) / 2) * 2);
    opciones.push(`--width=${ancho}`, `--height=${alto}`);
  }
  if (ajustes.pesoMaximoMB) {
    // Bits disponibles para la imagen, con un 8 % de margen para el contenedor.
    const kbps = Math.floor(((ajustes.pesoMaximoMB * 8 * 1000) / segundos) * 0.92 - parseInt(ajustes.audio, 10));
    const video = Math.max(500, Math.min(2500, kbps));
    if (kbps < 500) {
      aviso = `El video es largo para WhatsApp: va a pesar más de ${ajustes.pesoMaximoMB} MB y WhatsApp lo puede comprimir más.`;
    }
    opciones.push(`--video-bitrate=${video}k`);
  } else {
    opciones.push(`--crf=${ajustes.crf}`);
  }
  return { opciones, aviso };
};
