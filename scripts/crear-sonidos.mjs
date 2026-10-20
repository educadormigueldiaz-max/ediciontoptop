#!/usr/bin/env node
// Crea los efectos de sonido de public/sonidos/ (whoosh, pop y click) desde cero, con matemática:
// no se graba ni se copia nada, así que son libres (CC0). Ya vienen hechos; solo hace falta
// correrlo si se cambian:
//   node scripts/crear-sonidos.mjs
import fs from "node:fs";
import path from "node:path";
import { RAIZ } from "./lib/herramientas.mjs";

const MUESTRAS = 48000;
const CARPETA = path.join(RAIZ, "public", "sonidos");

// Ruido siempre igual (semilla fija): el archivo sale idéntico cada vez.
let semilla = 12345;
const ruido = () => {
  semilla = (semilla * 1664525 + 1013904223) >>> 0;
  return semilla / 2 ** 31 - 1;
};

// Filtro pasabanda que puede cambiar de frecuencia en cada muestra.
const pasabanda = () => {
  let bajo = 0;
  let banda = 0;
  return (x, frecuencia, resonancia) => {
    const f = 2 * Math.sin((Math.PI * Math.min(frecuencia, MUESTRAS / 6)) / MUESTRAS);
    bajo += f * banda;
    const alto = x - bajo - resonancia * banda;
    banda += f * alto;
    return banda;
  };
};

const sonido = (segundos, muestra) =>
  Array.from({ length: Math.round(segundos * MUESTRAS) }, (_, i) => muestra(i / MUESTRAS, segundos));

// Deja el pico en -2 dB y suaviza los bordes para que no se oiga un "tic" al empezar o terminar.
const pulir = (datos) => {
  const pico = Math.max(...datos.map(Math.abs));
  const borde = Math.round(0.003 * MUESTRAS);
  return datos.map((v, i) => {
    const suave = Math.min(1, i / borde, (datos.length - 1 - i) / borde);
    return (v / pico) * 0.8 * suave;
  });
};

const guardarWav = (nombre, datos) => {
  const pcm = Buffer.alloc(datos.length * 2);
  datos.forEach((v, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const cabecera = Buffer.alloc(44);
  cabecera.write("RIFF", 0);
  cabecera.writeUInt32LE(36 + pcm.length, 4);
  cabecera.write("WAVEfmt ", 8);
  cabecera.writeUInt32LE(16, 16);
  cabecera.writeUInt16LE(1, 20); // PCM
  cabecera.writeUInt16LE(1, 22); // mono
  cabecera.writeUInt32LE(MUESTRAS, 24);
  cabecera.writeUInt32LE(MUESTRAS * 2, 28);
  cabecera.writeUInt16LE(2, 32);
  cabecera.writeUInt16LE(16, 34);
  cabecera.write("data", 36);
  cabecera.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(CARPETA, nombre), Buffer.concat([cabecera, pcm]));
  console.log(`public/sonidos/${nombre}`);
};

fs.mkdirSync(CARPETA, { recursive: true });

// Whoosh: aire que pasa rápido. Ruido filtrado que sube de tono y vuelve a bajar.
{
  const filtro = pasabanda();
  guardarWav(
    "whoosh.wav",
    pulir(
      sonido(0.5, (t, total) => {
        const avance = t / total;
        const volumen = avance < 0.4 ? (avance / 0.4) ** 2 : Math.exp(-(avance - 0.4) * 7);
        const frecuencia = 350 + 2600 * Math.sin(Math.PI * Math.min(1, avance * 1.15)) ** 1.5;
        return filtro(ruido(), frecuencia, 0.9) * volumen;
      }),
    ),
  );
}

// Pop: burbuja corta. Un tono que cae rápido de agudo a grave.
guardarWav(
  "pop.wav",
  pulir(
    sonido(0.14, (t) => {
      const fase = 2 * Math.PI * (300 * t + (700 / 45) * (1 - Math.exp(-45 * t)));
      return Math.sin(fase) * Math.exp(-t * 32) * Math.min(1, t / 0.002);
    }),
  ),
);

// Click: toque seco, como un botón.
{
  const filtro = pasabanda();
  guardarWav(
    "click.wav",
    pulir(
      sonido(0.06, (t) => {
        const golpe = filtro(ruido(), 3200, 0.6) * Math.exp(-t * 180);
        const tono = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90) * 0.5;
        return golpe + tono;
      }),
    ),
  );
}
