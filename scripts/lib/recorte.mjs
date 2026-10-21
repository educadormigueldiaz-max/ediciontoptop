// Recorte de la persona (separarla del fondo) para los elementos "detras", "fondo" y "marco".
// Usa Apple Vision (VNGeneratePersonSegmentationRequest), que viene con macOS: corre en la
// computadora, sin internet ni descargas. Solo se calculan los momentos que lo necesitan.
// Las máscaras quedan junto al video, en public/proyectos/<id>/recorte/ (no se suben a git).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { FPS, RAIZ, escribirJson, leerJson } from "./herramientas.mjs";

export const TIPOS_RECORTE = ["detras", "fondo", "marco"];
// Segundos extra antes y después de cada elemento, por si se mueven un poco sus tiempos.
const MARGEN = 0.5;
// Las máscaras no necesitan más resolución que esta (lado más largo, en píxeles): el borde se
// suaviza igual al agrandarlas, y así pesan menos.
const LADO_MAXIMO = 1280;
// Súbelo al cambiar cómo se calculan las máscaras: las viejas se borran y se calculan de nuevo.
const VERSION = "2";

const FUENTE_SWIFT = path.join(RAIZ, "scripts", "lib", "recorte.swift");
const PROGRAMA = path.join(RAIZ, "node_modules", ".cache", "bydzyne", "recortar");

// Carpeta de las máscaras, relativa a public/ (va junto al video, así las copias hechas con
// `npm run duplicar` las comparten).
export const carpetaRecorte = (edicion) => path.posix.join(path.posix.dirname(edicion.video), "recorte");

// Cuadros del video original [desde, hasta) que necesitan recorte, sin repetir.
export const rangosNecesarios = (edicion) => {
  const ultimo = Math.round(edicion.duracion * FPS);
  const rangos = (edicion.elementos ?? [])
    .filter((e) => TIPOS_RECORTE.includes(e.tipo))
    .map((e) => [
      Math.max(0, Math.floor((e.inicio - MARGEN) * FPS)),
      Math.min(ultimo, Math.ceil((e.fin + MARGEN) * FPS)),
    ])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  const unidos = [];
  for (const r of rangos) {
    const ultimoUnido = unidos.at(-1);
    if (ultimoUnido && r[0] <= ultimoUnido[1]) ultimoUnido[1] = Math.max(ultimoUnido[1], r[1]);
    else unidos.push([...r]);
  }
  return unidos;
};

// Compila el programa de Swift la primera vez (o si cambió). Devuelve false si no se puede.
const prepararPrograma = () => {
  if (process.platform !== "darwin") return false;
  const vigente =
    fs.existsSync(PROGRAMA) && fs.statSync(PROGRAMA).mtimeMs >= fs.statSync(FUENTE_SWIFT).mtimeMs;
  if (vigente) return true;
  console.log("  Preparando el recorte de fondo (solo la primera vez)…");
  fs.mkdirSync(path.dirname(PROGRAMA), { recursive: true });
  const r = spawnSync("swiftc", ["-O", FUENTE_SWIFT, "-o", PROGRAMA], { encoding: "utf8" });
  if (r.error || r.status !== 0) {
    console.warn(
      "  Aviso: no se pudo preparar el recorte de fondo. Instala las herramientas de Apple con\n" +
        `  "xcode-select --install" y vuelve a intentarlo.\n${r.stderr ?? r.error?.message ?? ""}`,
    );
    return false;
  }
  return true;
};

const faltantes = (carpeta, rangos) =>
  rangos.reduce((n, [a, b]) => {
    for (let c = a; c < b; c++) if (!fs.existsSync(path.join(carpeta, `${c}.png`))) n++;
    return n;
  }, 0);

// Calcula las máscaras que falten y guarda en edicion.json qué cuadros tienen recorte.
// Si no hay elementos de recorte, no hace nada.
export const asegurarRecortes = async (archivoEdicion) => {
  const edicion = leerJson(archivoEdicion);
  const rangos = rangosNecesarios(edicion);
  if (rangos.length === 0) return;
  const relativa = carpetaRecorte(edicion);
  const carpeta = path.join(RAIZ, "public", relativa);
  const archivoVersion = path.join(carpeta, "version.txt");
  if (fs.existsSync(carpeta) && (!fs.existsSync(archivoVersion) || fs.readFileSync(archivoVersion, "utf8") !== VERSION)) {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
  const pendientes = faltantes(carpeta, rangos);

  if (pendientes > 0) {
    if (!prepararPrograma()) return;
    const escala = Math.min(1, LADO_MAXIMO / Math.max(edicion.ancho, edicion.alto));
    const ancho = Math.round(edicion.ancho * escala);
    const alto = Math.round(edicion.alto * escala);
    console.log(`Recortando a la persona en "${edicion.id}": ${(pendientes / FPS).toFixed(1)} s de video…`);
    const proceso = spawn(PROGRAMA, [
      path.join(RAIZ, "public", edicion.video), carpeta, String(ancho), String(alto), String(FPS),
      ...rangos.map(([a, b]) => `${a}-${b}`),
    ]);
    let errores = "";
    proceso.stderr.on("data", (d) => (errores += d));
    proceso.stdout.on("data", (d) => {
      const ultimo = String(d).trim().split("\n").at(-1)?.split(" ");
      if (ultimo?.[0] === "progreso") {
        process.stdout.write(`  Recorte: ${(Number(ultimo[1]) / FPS).toFixed(1)} de ${(Number(ultimo[2]) / FPS).toFixed(1)} s\n`);
      }
    });
    const codigo = await new Promise((resolve) => proceso.on("close", resolve));
    if (codigo !== 0) {
      console.warn(`  Aviso: el recorte de fondo falló; esos elementos no se verán.\n${errores}`);
      return;
    }
    fs.writeFileSync(archivoVersion, VERSION);
  }

  // Solo se anotan los cuadros que de verdad tienen máscara.
  const cuadros = [];
  for (const [a, b] of rangos) {
    let inicio = null;
    for (let c = a; c <= b; c++) {
      const hay = c < b && fs.existsSync(path.join(carpeta, `${c}.png`));
      if (hay && inicio === null) inicio = c;
      if (!hay && inicio !== null) {
        cuadros.push([inicio, c]);
        inicio = null;
      }
    }
  }
  const recorte = { carpeta: relativa, cuadros };
  // Se vuelve a leer por si el archivo cambió mientras se recortaba.
  const actual = leerJson(archivoEdicion);
  if (JSON.stringify(actual.recorte) !== JSON.stringify(recorte)) {
    escribirJson(archivoEdicion, { ...actual, recorte });
  }
};

// Avisa de los elementos de recorte que no se van a ver porque les faltan máscaras.
export const avisarRecortesIncompletos = (archivoEdicion) => {
  const edicion = leerJson(archivoEdicion);
  const cuadros = edicion.recorte?.cuadros ?? [];
  (edicion.elementos ?? []).forEach((e, i) => {
    if (!TIPOS_RECORTE.includes(e.tipo)) return;
    const desde = Math.round(e.inicio * FPS);
    const hasta = Math.round(e.fin * FPS);
    const cubierto = cuadros.some(([a, b]) => a <= desde && b >= hasta);
    if (!cubierto) {
      console.log(`Aviso: el elemento ${i + 1} (${e.tipo}) no tiene recorte y no se verá. Prueba con npm run recortar.`);
    }
  });
};
