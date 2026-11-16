// Descarga de YouTube con yt-dlp (lo usan npm run clips y npm run videos-apoyo).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RAIZ } from "./herramientas.mjs";

// yt-dlp descarga de YouTube. Se baja solo la primera vez (es gratuito y de código abierto).
const YTDLP = path.join(RAIZ, "node_modules", ".cache", "bydzyne", "yt-dlp");
const asegurarYtdlp = async () => {
  if (fs.existsSync(YTDLP)) return;
  // La versión que toca según dónde corre: el Mac de Miguel o el servidor (Linux, editor.somoskreo.com).
  const version = process.platform === "darwin" ? "yt-dlp_macos"
    : process.platform === "linux" ? (process.arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux")
    : null;
  if (!version) throw new Error("La descarga de YouTube solo está preparada para Mac y Linux.");
  console.log("  Instalando el descargador de YouTube (solo la primera vez)…");
  const r = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${version}`);
  if (!r.ok) throw new Error(`No se pudo bajar el descargador (${r.status}). Revisa el internet.`);
  fs.mkdirSync(path.dirname(YTDLP), { recursive: true });
  fs.writeFileSync(YTDLP, Buffer.from(await r.arrayBuffer()), { mode: 0o755 });
};

// FFmpeg de Remotion, para que yt-dlp una imagen y sonido: yt-dlp busca "ffmpeg" y "ffprobe" en
// una carpeta, así que ahí van dos atajos que llaman a los de Remotion.
const CARPETA_FFMPEG = path.join(RAIZ, "node_modules", ".cache", "bydzyne", "ffmpeg");
const asegurarFfmpeg = () => {
  fs.mkdirSync(CARPETA_FFMPEG, { recursive: true });
  for (const nombre of ["ffmpeg", "ffprobe"]) {
    const remotion = path.join(RAIZ, "node_modules", ".bin", "remotion");
    fs.writeFileSync(path.join(CARPETA_FFMPEG, nombre), `#!/bin/sh\nexec "${remotion}" ${nombre} "$@"\n`, { mode: 0o755 });
  }
};

// Duración en segundos de un video de YouTube, sin descargarlo (para cobrarlo en tokens antes). null si no se pudo.
export const duracionDeYoutube = async (url) => {
  await asegurarYtdlp();
  const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` };
  const r = spawnSync(YTDLP, ["--no-playlist", "--skip-download", "--print", "duration", "--js-runtimes", `node:${process.execPath}`, url], { encoding: "utf8", env, timeout: 90000 });
  const segundos = parseFloat(String(r.stdout ?? "").trim().split("\n").pop());
  return Number.isFinite(segundos) && segundos > 0 ? segundos : null;
};

// Datos públicos de un video (licencia, canal, título, duración) sin descargarlo. Los clips de un
// enlace solo se aceptan si el autor lo publicó con licencia Creative Commons (permite reusarlo
// dando crédito). Devuelve { licencia, cc, canal, titulo, segundos } o { error: "bloqueo" | "privado" | "otro" }.
export const datosDeYoutube = async (url) => {
  await asegurarYtdlp();
  const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` };
  const r = await new Promise((resolve) => {
    const p = spawn(YTDLP, ["--no-playlist", "--skip-download", "--js-runtimes", `node:${process.execPath}`, "--print", "%(license)s\t%(channel)s\t%(title)s\t%(duration)s", url], { env });
    let salida = "";
    let errores = "";
    const reloj = setTimeout(() => p.kill("SIGKILL"), 90000);
    p.stdout.on("data", (d) => (salida += d));
    p.stderr.on("data", (d) => (errores += d));
    p.on("close", (codigo) => { clearTimeout(reloj); resolve({ codigo, salida, errores }); });
    p.on("error", () => { clearTimeout(reloj); resolve({ codigo: 1, salida: "", errores: "" }); });
  });
  const linea = r.salida.trim().split("\n").filter((l) => l.includes("\t")).at(-1);
  if (r.codigo !== 0 || !linea) {
    if (/not a bot|confirm you/i.test(r.errores)) return { error: "bloqueo" };
    if (/private|members|sign in|age/i.test(r.errores)) return { error: "privado" };
    return { error: "otro" };
  }
  const [licencia, canal, titulo, duracion] = linea.split("\t").map((x) => (x === "NA" ? "" : x.trim()));
  return { licencia, cc: /creative commons/i.test(licencia), canal, titulo, segundos: parseFloat(duracion) || null };
};

// Descarga un video de YouTube en `carpeta` y devuelve la ruta del archivo. `alAvanzar(pct, listo)`
// recibe el avance (0–99).
export const descargarDeYoutube = async (url, { carpeta, alAvanzar = () => {} }) => {
  await asegurarYtdlp();
  asegurarFfmpeg();
  fs.mkdirSync(carpeta, { recursive: true });
  const args = [
    "--no-playlist", "--restrict-filenames", "--newline", "--progress",
    "--progress-template", "download:BYDZYNE %(progress._percent_str)s",
    // La mejor calidad que haya hasta 4K (1080p o más cuando existe; así el recorte vertical se ve
    // nítido). Sin AV1, que algunos programas no abren.
    "-f", "bv*[height<=2160][vcodec!^=av01]+ba[ext=m4a]/bv*[height<=2160][vcodec!^=av01]+ba/b[height<=2160]/b",
    "--merge-output-format", "mp4",
    "--ffmpeg-location", CARPETA_FFMPEG,
    // YouTube necesita un motor de JavaScript: el mismo Node que corre ByDzyne.
    "--js-runtimes", `node:${process.execPath}`,
    "-o", path.join(carpeta, "%(title).80s.%(ext)s"),
    "--print", "after_move:filepath",
    url,
  ];
  const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` };
  const correr = () =>
    new Promise((resolve) => {
      const p = spawn(YTDLP, args, { env });
      let salida = "";
      let errores = "";
      // Primero baja la imagen (90 % del peso) y después el sonido.
      let parte = 0;
      let anterior = 0;
      p.stdout.on("data", (d) => {
        for (const linea of String(d).split("\n")) {
          const m = /^BYDZYNE\s+([\d.]+)%/.exec(linea.trim());
          if (!m) {
            if (linea.trim()) salida += `${linea}\n`;
            continue;
          }
          const pct = parseFloat(m[1]);
          if (pct < anterior - 50) parte = 1;
          anterior = pct;
          alAvanzar(Math.min(99, parte === 0 ? pct * 0.9 : 90 + pct * 0.1), pct >= 100);
        }
      });
      p.stderr.on("data", (d) => (errores += d));
      p.on("close", (codigo) => resolve({ codigo, salida, errores }));
    });
  let r = await correr();
  if (r.codigo !== 0) {
    // YouTube cambia seguido: con la última versión del descargador casi siempre se arregla.
    console.log("  Actualizando el descargador y probando de nuevo…");
    spawnSync(YTDLP, ["-U"], { stdio: "ignore" });
    r = await correr();
  }
  const archivo = r.salida.trim().split("\n").filter(Boolean).at(-1);
  if (r.codigo !== 0 || !archivo || !fs.existsSync(archivo)) {
    // YouTube a veces frena las descargas que salen de servidores ("not a bot"): no es culpa del video.
    if (/not a bot|confirm you/i.test(r.errores)) throw new Error("YouTube bloqueó la descarga desde este equipo (not a bot).");
    if (/private|members|sign in|age/i.test(r.errores)) {
      throw new Error("Ese video es privado o pide iniciar sesión: no se puede descargar.");
    }
    throw new Error(`No se pudo descargar el video.\n${r.errores.slice(-1500)}`);
  }
  return archivo;
};
