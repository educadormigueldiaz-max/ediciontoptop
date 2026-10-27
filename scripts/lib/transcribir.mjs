// Transcripción local con Whisper.cpp (no sube nada a internet).
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
} from "@remotion/install-whisper-cpp";
import fs from "node:fs";
import { CARPETA_WHISPER, redondear } from "./herramientas.mjs";

export const VERSION_WHISPER = "1.5.5";

export const prepararWhisper = async (modelo) => {
  await installWhisperCpp({ to: CARPETA_WHISPER, version: VERSION_WHISPER, printOutput: true });
  let ultimo = -1;
  await downloadWhisperModel({
    model: modelo,
    folder: CARPETA_WHISPER,
    printOutput: false,
    onProgress: (bytes, total) => {
      const pct = Math.floor((bytes / total) * 100);
      if (pct >= ultimo + 10) {
        ultimo = pct;
        process.stdout.write(`  Descargando modelo "${modelo}": ${pct}%\n`);
      }
    },
  });
};

// Partes de la voz: dónde hay voz y dónde silencio, medido en el audio (wav de 16 kHz, mono,
// 16 bits). Devuelve los silencios de al menos `minimo` segundos.
const VENTANA = 0.02;
export const silenciosDelAudio = (wav, minimo = 0.2) => {
  const datos = fs.readFileSync(wav);
  // Busca el bloque "data" del wav (la cabecera no siempre mide 44 bytes).
  let i = 12;
  let inicio = 44;
  let largo = datos.length - 44;
  while (i + 8 <= datos.length) {
    const id = datos.toString("ascii", i, i + 4);
    const tam = datos.readUInt32LE(i + 4);
    if (id === "data") {
      inicio = i + 8;
      largo = Math.min(tam, datos.length - inicio);
      break;
    }
    i += 8 + tam + (tam % 2);
  }
  const porVentana = Math.round(16000 * VENTANA);
  const db = [];
  for (let v = inicio; v + porVentana * 2 <= inicio + largo; v += porVentana * 2) {
    let suma = 0;
    for (let k = 0; k < porVentana; k++) {
      const m = datos.readInt16LE(v + k * 2) / 32768;
      suma += m * m;
    }
    db.push(10 * Math.log10(suma / porVentana + 1e-10));
  }
  if (db.length === 0) return [];
  // Umbral entre el ruido de fondo y la voz de esta grabación.
  const orden = [...db].sort((x, y) => x - y);
  const fondo = orden[Math.floor(orden.length * 0.1)];
  const voz = orden[Math.floor(orden.length * 0.9)];
  const umbral = fondo + Math.max(6, (voz - fondo) * 0.3);
  const silencios = [];
  let desde = null;
  db.forEach((valor, n) => {
    if (valor < umbral) {
      if (desde === null) {
        // Un golpe de una sola ventana (un "clic") no parte un silencio en dos.
        const anterior = silencios.at(-1);
        if (anterior && n * VENTANA - anterior.fin <= VENTANA * 2) desde = Math.round(silencios.pop().inicio / VENTANA);
        else desde = n;
      }
    } else if (desde !== null) {
      if ((n - desde) * VENTANA >= minimo) silencios.push({ inicio: desde * VENTANA, fin: n * VENTANA });
      desde = null;
    }
  });
  if (desde !== null && (db.length - desde) * VENTANA >= minimo) {
    silencios.push({ inicio: desde * VENTANA, fin: db.length * VENTANA });
  }
  return silencios;
};

// Duración probable de una palabra según su largo (segundos).
const duracionProbable = (texto) => 0.12 + 0.06 * texto.replace(/[^\p{L}\p{N}]/gu, "").length;
const cierraFrase = (texto) => /[.,;:?!…]$/.test(texto);
const tieneLetras = (texto) => /[\p{L}\p{N}]/u.test(texto);

// Convierte los tokens de Whisper en palabras con tiempo de inicio y fin (segundos).
// Los tiempos de cada token (`offsets`) a veces amontonan una frase entera en el mismo instante;
// el momento en que Whisper oye cada token (`t_dtw`, de --dtw) es mucho más fiel, así que se usa
// ese. Con `silencios` (del audio), ninguna palabra empieza en un silencio y la primera después
// de una pausa empieza justo cuando vuelve la voz.
export const palabrasDesdeWhisper = (salida, silencios = []) => {
  const crudas = [];
  const frases = [];
  for (const item of salida.transcription) {
    const texto = item.text.trim();
    if (texto) {
      frases.push({ texto, inicio: item.offsets.from / 1000, fin: item.offsets.to / 1000 });
    }
    for (const token of item.tokens) {
      // Tokens especiales de Whisper: [_BEG_], [_TT_123], etc.
      if (token.text.startsWith("[_") || token.text.trim() === "") continue;
      const dtw = token.t_dtw !== undefined && token.t_dtw >= 0 && tieneLetras(token.text) ? token.t_dtw / 100 : null;
      const nuevaPalabra = token.text.startsWith(" ") || crudas.length === 0;
      if (nuevaPalabra) {
        crudas.push({
          texto: token.text.trim(),
          desde: token.offsets.from / 1000,
          hasta: token.offsets.to / 1000,
          dtw: dtw === null ? [] : [dtw],
        });
      } else {
        // Continuación de la palabra anterior (sílabas o signos de puntuación).
        const anterior = crudas[crudas.length - 1];
        anterior.texto += token.text;
        anterior.hasta = Math.max(anterior.hasta, token.offsets.to / 1000);
        if (dtw !== null) anterior.dtw.push(dtw);
      }
    }
  }
  if (crudas.length === 0) return { palabras: [], frases };

  // 1. Inicio: cuando Whisper oye su primera sílaba (un poco antes, porque la marca llega tarde).
  const usarDtw = crudas.filter((p) => p.dtw.length > 0).length >= crudas.length * 0.8;
  const inicios = crudas.map((p) => (usarDtw && p.dtw.length ? Math.max(0, p.dtw[0] - 0.06) : p.desde));
  for (let i = 1; i < inicios.length; i++) inicios[i] = Math.max(inicios[i], inicios[i - 1] + 0.04);

  // 2. Con los silencios del audio: una palabra que empieza en medio de un silencio va antes (si
  // cierra la frase o queda más cerca del comienzo del silencio) o justo cuando vuelve la voz (si
  // abre una frase o queda más cerca del final).
  const silencioEn = (t) => silencios.find((s) => t > s.inicio && t < s.fin) ?? null;
  for (let i = 0; i < crudas.length; i++) {
    const s = silencioEn(inicios[i]);
    if (!s) continue;
    // La puntuación manda: "lado." cierra lo anterior; después de "caro." empieza otra frase.
    const antes = cierraFrase(crudas[i].texto)
      ? true
      : i > 0 && cierraFrase(crudas[i - 1].texto)
        ? false
        : inicios[i] - s.inicio < s.fin - inicios[i];
    if (antes) {
      const previo = i > 0 ? inicios[i - 1] + 0.08 : 0;
      inicios[i] = Math.max(previo, Math.min(s.inicio - 0.05, s.inicio - duracionProbable(crudas[i].texto)));
    } else {
      inicios[i] = s.fin;
    }
  }
  // La primera palabra después de una pausa empieza cuando vuelve la voz (la marca llega tarde).
  for (let i = 1; i < crudas.length; i++) {
    const pausa = silencios.find((s) => s.fin > inicios[i - 1] && s.fin <= inicios[i] + 0.01);
    if (pausa && inicios[i] - pausa.fin < 1) inicios[i] = pausa.fin;
  }
  for (let i = 1; i < inicios.length; i++) inicios[i] = Math.max(inicios[i], inicios[i - 1] + 0.03);

  // 3. Cada tramo de voz (entre dos pausas) lo llenan sus palabras: la marca de Whisper se
  // adelanta o se atrasa poco a poco, así que se estiran o encogen para ocupar el tramo entero.
  // Se estira como mucho la mitad (el resto del tramo puede ser una risa, música u otra voz).
  if (silencios.length) {
    const fin = Math.max(inicios.at(-1) + duracionProbable(crudas.at(-1).texto), silencios.at(-1).fin);
    const tramos = [];
    let desde = 0;
    for (const s of silencios) {
      if (s.inicio > desde) tramos.push({ inicio: desde, fin: s.inicio });
      desde = s.fin;
    }
    if (fin > desde) tramos.push({ inicio: desde, fin });
    for (const tramo of tramos) {
      const dentro = inicios.flatMap((t, i) => (t >= tramo.inicio && t < tramo.fin ? [i] : []));
      if (dentro.length < 2) continue;
      const a = inicios[dentro[0]];
      const ultima = dentro.at(-1);
      const b = Math.min(tramo.fin, inicios[ultima] + duracionProbable(crudas[ultima].texto));
      const escala = Math.min(1.5, Math.max(0.8, (tramo.fin - tramo.inicio) / (b - a)));
      for (const i of dentro) inicios[i] = tramo.inicio + (inicios[i] - a) * escala;
    }
  }

  // 4. Varias palabras seguidas en el mismo instante (Whisper no supo ubicarlas): se reparten
  // según su largo hasta la siguiente palabra bien ubicada.
  for (let i = 0; i < inicios.length; ) {
    let j = i + 1;
    while (j < inicios.length && inicios[j] - inicios[j - 1] < 0.06) j++;
    if (j - i >= 3) {
      const hasta = j < inicios.length ? inicios[j] : inicios[i] + crudas.slice(i, j).reduce((t, p) => t + duracionProbable(p.texto), 0);
      const pesos = crudas.slice(i, j).map((p) => duracionProbable(p.texto));
      const total = pesos.reduce((t, x) => t + x, 0);
      let t = inicios[i];
      for (let k = i; k < j; k++) {
        inicios[k] = t;
        t += ((hasta - inicios[i]) * pesos[k - i]) / total;
      }
    }
    i = j;
  }

  // 5. Fin: hasta que empieza la siguiente, sin pasar de un largo razonable ni entrar en una pausa.
  const palabras = crudas.map((p, i) => {
    const inicio = inicios[i];
    const siguiente = i + 1 < inicios.length ? inicios[i + 1] : Infinity;
    let fin = Math.min(siguiente, inicio + duracionProbable(p.texto) + 0.3);
    const pausa = silencios.find((s) => s.inicio > inicio && s.inicio < fin);
    if (pausa) fin = Math.max(inicio + 0.1, pausa.inicio + 0.05);
    if (fin === Infinity) fin = inicio + duracionProbable(p.texto);
    return { texto: p.texto, inicio: redondear(inicio), fin: redondear(Math.max(fin, inicio + 0.05)) };
  });
  return { palabras, frases };
};

// `alAvanzar(fraccion)` recibe el avance (0–1) para mostrarlo en otra parte.
export const transcribir = async ({ wav, modelo, idioma, alAvanzar }) => {
  await prepararWhisper(modelo);
  let ultimo = -1;
  const salida = await transcribe({
    inputPath: wav,
    whisperPath: CARPETA_WHISPER,
    whisperCppVersion: VERSION_WHISPER,
    model: modelo,
    language: idioma,
    tokenLevelTimestamps: true,
    splitOnWord: true,
    printOutput: false,
    onProgress: (p) => {
      alAvanzar?.(p);
      const pct = Math.floor(p * 100);
      if (pct >= ultimo + 10) {
        ultimo = pct;
        process.stdout.write(`  Transcribiendo: ${pct}%\n`);
      }
    },
  });
  return palabrasDesdeWhisper(salida, silenciosDelAudio(wav));
};
