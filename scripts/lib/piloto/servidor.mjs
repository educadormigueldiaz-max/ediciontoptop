// Página del piloto automático: entrar, subir videos, ver el estado, descargar y pedir cambios.
// Sin dependencias: servidor HTTP de Node. Los archivos se suben "en crudo" (uno por petición).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { CARPETA_PROYECTOS, CARPETA_SALIDA, RAIZ, aId } from "../herramientas.mjs";
import { estilosDisponibles, nombresDeEstilos } from "../produccion.mjs";
import { archivoProgreso, posicionEnCola, siguiente } from "./cola.mjs";
import {
  ESTADOS, REDES_PILOTO, TIPOS, abrirSesion, actualizarTrabajo, anotar, borrarPersona, carpetaTrabajo,
  cerrarSesion, comprobarClave, guardarPersona, leerSesion, leerTrabajo, nombreValido, nuevoTrabajo,
  personas, registrar, trabajos,
} from "./datos.mjs";

const PAGINA = path.join(path.dirname(new URL(import.meta.url).pathname), "pagina.html");
const PANEL_CLIPS = path.join(path.dirname(PAGINA), "clips.html");
const COOKIE = "bydzyne";
const EXT_VIDEO = ["mp4", "mov", "m4v", "webm", "mkv", "avi", "3gp"];
// Un audio solo (nota de voz, podcast) se vuelve un video animado (skill bydzyne-apoyo).
const EXT_AUDIO = ["mp3", "m4a", "wav", "aac", "ogg", "opus", "flac"];
const EXT_FOTO = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const MAX_VIDEO = 4 * 1024 ** 3;
const MAX_FOTO = 30 * 1024 ** 2;
const MAX_FOTOS = 6;

// Estilos que se pueden elegir en la página (el de ejemplo no).
const estilos = () => estilosDisponibles().filter((e) => e !== "ejemplo");

// ---------- Ayudas ----------

const enviarJson = (res, codigo, datos) => {
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(datos));
};
const error = (res, codigo, mensaje, extra = {}) => enviarJson(res, codigo, { error: mensaje, ...extra });

const leerCuerpo = (req, limite = 100_000) =>
  new Promise((resolve, reject) => {
    let datos = "";
    req.on("data", (d) => {
      datos += d;
      if (datos.length > limite) reject(new Error("muy grande"));
    });
    req.on("end", () => {
      try {
        resolve(datos ? JSON.parse(datos) : {});
      } catch {
        reject(new Error("json"));
      }
    });
    req.on("error", reject);
  });

const tokenDe = (req) =>
  (req.headers.cookie ?? "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === COOKIE)?.[1];

// Intentos fallidos de entrar, por dirección (10 cada 15 minutos).
const intentos = new Map();
const bloqueado = (ip) => {
  const ahora = Date.now();
  const lista = (intentos.get(ip) ?? []).filter((t) => ahora - t < 15 * 60 * 1000);
  intentos.set(ip, lista);
  return lista.length >= 10;
};

const ENLACE_YOUTUBE = /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{6,}[^\s]*$/;

const extension = (nombre) => path.extname(String(nombre)).slice(1).toLowerCase();

// Avance de unos clips (lo escribe npm run clips mientras trabaja), o null.
const leerProgreso = (t) => {
  try {
    const p = JSON.parse(fs.readFileSync(archivoProgreso(t.id), "utf8"));
    if (p.video) p.video = path.basename(p.video, path.extname(p.video)).replace(/_/g, " ");
    return p;
  } catch {
    return null;
  }
};

// Lo que la página ve de un trabajo (sin rutas internas).
const vista = (t, posiciones, conDueno) => ({
  id: t.id,
  nombre: t.nombre,
  creado: t.creado,
  tipo: TIPOS[t.tipo] ?? t.tipo,
  clips: t.tipo === "clips",
  red: REDES_PILOTO[t.red] ?? t.red,
  estilo: t.estilo,
  cta: t.cta,
  notas: t.notas,
  estado: t.estado,
  estadoTexto: ESTADOS[t.estado] ?? t.estado,
  paso: t.paso,
  error: t.error,
  enCola: posiciones.get(t.id) ?? null,
  pedidoEnCurso: t.pendiente?.tipo === "cambio" ? t.pendiente.pedido : null,
  versiones: t.versiones,
  progreso: t.tipo === "clips" ? leerProgreso(t) : null,
  // Cambio a un clip en curso (el grupo sigue listo y los demás clips se pueden ver).
  cambioClip: t.pendiente?.tipo === "cambio-clip" ? { n: t.pendiente.n, pedido: t.pendiente.pedido } : null,
  cambiosClips: t.cambiosClips ?? [],
  ...(conDueno ? { usuario: t.usuario, costo: t.costo ?? 0 } : {}),
});

// Sirve un archivo con soporte de rangos (el reproductor del celular los necesita).
const servirArchivo = (req, res, archivo, descargar) => {
  const tamano = fs.statSync(archivo).size;
  const cabeceras = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${path.basename(archivo)}"`,
  };
  const rango = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
  if (rango) {
    const inicio = rango[1] ? +rango[1] : 0;
    const fin = rango[2] ? Math.min(+rango[2], tamano - 1) : tamano - 1;
    res.writeHead(206, { ...cabeceras, "Content-Range": `bytes ${inicio}-${fin}/${tamano}`, "Content-Length": fin - inicio + 1 });
    fs.createReadStream(archivo, { start: inicio, end: fin }).pipe(res);
  } else {
    res.writeHead(200, { ...cabeceras, "Content-Length": tamano });
    fs.createReadStream(archivo).pipe(res);
  }
};

// Borra un trabajo con todo lo que generó (proyectos, imágenes, revisión y clips).
const borrarTodo = (t) => {
  fs.rmSync(carpetaTrabajo(t.id), { recursive: true, force: true });
  for (const carpeta of [
    path.join(CARPETA_PROYECTOS, t.proyecto),
    path.join(RAIZ, "public", "imagenes", t.proyecto),
    path.join(CARPETA_SALIDA, "revision", t.proyecto),
    path.join(CARPETA_SALIDA, "clips", t.proyecto),
    // Cada clip es un proyecto propio: <proyecto>-clip-01, -02…
    ...(fs.existsSync(CARPETA_PROYECTOS) ? fs.readdirSync(CARPETA_PROYECTOS) : [])
      .filter((d) => d.startsWith(`${t.proyecto}-clip-`))
      .flatMap((d) => [path.join(CARPETA_PROYECTOS, d), path.join(CARPETA_SALIDA, "revision", d)]),
  ]) {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
};

// ---------- Rutas ----------

const manejar = async (req, res) => {
  const url = new URL(req.url, "http://local");
  const ruta = url.pathname;
  const metodo = req.method;

  if (metodo === "GET" && (ruta === "/" || ruta === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(fs.readFileSync(PAGINA));
    return;
  }
  if (metodo === "GET" && ruta === "/clips") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(fs.readFileSync(PANEL_CLIPS));
    return;
  }
  if (!ruta.startsWith("/api/")) return error(res, 404, "No existe.");

  // Las peticiones que cambian algo deben venir de la página (protección básica contra otros sitios).
  if (metodo !== "GET" && req.headers["x-bydzyne"] !== "1") return error(res, 403, "Petición no permitida.");

  if (metodo === "POST" && ruta === "/api/entrar") {
    const ip = req.socket.remoteAddress;
    if (bloqueado(ip)) return error(res, 429, "Demasiados intentos. Espera 15 minutos y vuelve a intentar.");
    const { usuario, clave } = await leerCuerpo(req);
    const u = String(usuario ?? "").trim().toLowerCase();
    if (!comprobarClave(u, String(clave ?? "").trim())) {
      intentos.get(ip).push(Date.now());
      return error(res, 401, "Usuario o contraseña incorrectos.");
    }
    const token = abrirSesion(u);
    registrar(`Entró ${u} desde ${ip}`);
    res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
    return enviarJson(res, 200, { ok: true });
  }

  const sesion = leerSesion(tokenDe(req));
  if (!sesion.usuario) {
    const mensaje =
      sesion.motivo === "otra-sesion"
        ? "Tu cuenta se abrió en otro equipo y aquí se cerró. Cada cuenta es personal: si no fuiste tú, avísale a quien administra esta página."
        : "Entra con tu usuario y contraseña.";
    return error(res, 401, mensaje, { motivo: sesion.motivo });
  }
  const { usuario, persona } = sesion;
  const esAdmin = persona.admin;

  if (metodo === "POST" && ruta === "/api/salir") {
    cerrarSesion(tokenDe(req));
    res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
    return enviarJson(res, 200, { ok: true });
  }

  if (metodo === "GET" && ruta === "/api/yo") {
    return enviarJson(res, 200, {
      usuario,
      nombre: persona.nombre,
      admin: esAdmin,
      estiloFijo: persona.estilo,
      estilos: estilos(),
      nombresEstilos: nombresDeEstilos(),
      tipos: TIPOS,
      redes: REDES_PILOTO,
    });
  }

  if (metodo === "GET" && ruta === "/api/trabajos") {
    const posiciones = posicionEnCola();
    const lista = trabajos().filter((t) => (esAdmin && url.searchParams.get("todos") === "1") || t.usuario === usuario);
    return enviarJson(res, 200, { trabajos: lista.map((t) => vista(t, posiciones, esAdmin)) });
  }

  if (metodo === "POST" && ruta === "/api/trabajos") {
    const d = await leerCuerpo(req);
    if (!TIPOS[d.tipo]) return error(res, 400, "Elige el tipo de video.");
    if (!REDES_PILOTO[d.red]) return error(res, 400, "Elige la red social.");
    const estilo = persona.estilo ?? (estilos().includes(d.estilo) ? d.estilo : "predeterminado");
    // Clips de un video de YouTube: no se sube nada, entra directo a la cola.
    if (d.tipo === "clips" && d.enlace) {
      const enlace = String(d.enlace).trim();
      if (!ENLACE_YOUTUBE.test(enlace)) return error(res, 400, "Ese enlace no parece de un video de YouTube.");
      const t = nuevoTrabajo({
        usuario,
        nombre: "clips-youtube",
        tipo: "clips",
        red: d.red,
        estilo,
        enlace,
        cta: "",
        notas: "",
        fotosEsperadas: 0,
        estado: "en-cola",
        paso: "Esperando turno",
        enColaDesde: new Date().toISOString(),
      });
      anotar(t.id, `Clips de YouTube pedidos por ${usuario}: ${enlace}, ${t.red}, estilo ${estilo}.`);
      siguiente();
      return enviarJson(res, 200, { id: t.id, enCola: true });
    }
    const esAudio = EXT_AUDIO.includes(extension(d.nombreVideo));
    if (!EXT_VIDEO.includes(extension(d.nombreVideo)) && !(esAudio && d.tipo !== "clips")) {
      return error(res, 400, "Ese archivo no parece un video ni un audio. Usa MP4 o MOV (los del celular sirven) o un audio MP3 o M4A.");
    }
    const fotos = Array.isArray(d.fotos) ? d.fotos : [];
    if (fotos.length > MAX_FOTOS) return error(res, 400, `Puedes subir hasta ${MAX_FOTOS} fotos.`);
    if (fotos.some((f) => !EXT_FOTO.includes(extension(f)))) return error(res, 400, "Las fotos deben ser JPG, PNG o HEIC.");
    const t = nuevoTrabajo({
      usuario,
      nombre: aId(String(d.nombreVideo)).slice(0, 40),
      tipo: d.tipo,
      red: d.red,
      estilo,
      cta: String(d.cta ?? "").trim().slice(0, 200),
      notas: String(d.notas ?? "").trim().slice(0, 1000),
      fotosEsperadas: fotos.length,
      // Escenas de apoyo animadas en medio del video (con un audio solo, siempre).
      animaciones: esAudio || d.animaciones === true,
    });
    anotar(
      t.id,
      `Subido por ${usuario}: ${TIPOS[t.tipo]}${esAudio ? " (solo audio)" : ""}, ${t.red}, estilo ${estilo}, ` +
        `animaciones ${t.animaciones ? "sí" : "no"}. CTA: ${t.cta || "-"}. Notas: ${t.notas || "-"}`,
    );
    return enviarJson(res, 200, { id: t.id });
  }

  const m = /^\/api\/trabajos\/([a-z0-9]{10})(?:\/([a-z-]+))?$/.exec(ruta);
  if (!m) return error(res, 404, "No existe.");
  const t = leerTrabajo(m[1]);
  if (!t || (t.usuario !== usuario && !esAdmin)) return error(res, 404, "Ese video no existe.");
  const accion = m[2];

  // Subir el video o una foto: el archivo viene en el cuerpo, tal cual.
  if (metodo === "PUT" && accion === "archivo") {
    if (t.estado !== "subiendo") return error(res, 409, "Este video ya se envió.");
    const clase = url.searchParams.get("clase");
    const ext = extension(url.searchParams.get("nombre"));
    const esVideo = clase === "video";
    const permitidas = esVideo ? [...EXT_VIDEO, ...(t.tipo === "clips" ? [] : EXT_AUDIO)] : EXT_FOTO;
    if (!permitidas.includes(ext)) return error(res, 400, "Tipo de archivo no permitido.");
    if (!esVideo && t.fotos.length >= MAX_FOTOS) return error(res, 400, `Puedes subir hasta ${MAX_FOTOS} fotos.`);
    const limite = esVideo ? MAX_VIDEO : MAX_FOTO;
    if (+(req.headers["content-length"] ?? 0) > limite) {
      return error(res, 413, esVideo ? "El video pesa más de 4 GB. Recórtalo o grábalo en menor calidad." : "La foto pesa más de 30 MB.");
    }
    const nombre = esVideo ? `video.${ext}` : `foto-${t.fotos.length + 1}.${ext}`;
    const destino = path.join(carpetaTrabajo(t.id), "subidos", nombre);
    let recibidos = 0;
    let excedido = false;
    await new Promise((resolve, reject) => {
      const salida = fs.createWriteStream(destino);
      req.on("data", (d) => {
        recibidos += d.length;
        if (recibidos > limite && !excedido) {
          excedido = true;
          req.unpipe(salida);
          salida.destroy();
          resolve();
        }
      });
      req.pipe(salida);
      salida.on("finish", resolve);
      salida.on("error", reject);
      req.on("error", reject);
    });
    if (excedido || recibidos === 0) {
      fs.rmSync(destino, { force: true });
      return error(res, 400, excedido ? "El archivo es demasiado grande." : "El archivo llegó vacío. Intenta de nuevo.");
    }
    let final = nombre;
    // Las fotos HEIC del iPhone se pasan a JPG para que se vean en el video.
    if (!esVideo && ["heic", "heif"].includes(ext)) {
      final = nombre.replace(/\.(heic|heif)$/, ".jpg");
      const r = spawnSync("sips", ["-s", "format", "jpeg", destino, "--out", path.join(path.dirname(destino), final)]);
      fs.rmSync(destino, { force: true });
      if (r.status !== 0) return error(res, 400, "No pudimos abrir esa foto. Envíala en JPG o PNG.");
    }
    const actual = leerTrabajo(t.id);
    actualizarTrabajo(t.id, esVideo ? { video: final } : { fotos: [...actual.fotos, final] });
    return enviarJson(res, 200, { ok: true });
  }

  // Todo subido: entra a la cola.
  if (metodo === "POST" && accion === "enviar") {
    if (t.estado !== "subiendo") return error(res, 409, "Este video ya se envió.");
    if (!t.video) return error(res, 400, "Falta el video.");
    actualizarTrabajo(t.id, { estado: "en-cola", paso: "Esperando turno", enColaDesde: new Date().toISOString() });
    anotar(t.id, "En cola.");
    siguiente();
    return enviarJson(res, 200, { ok: true });
  }

  if (metodo === "POST" && accion === "cambios") {
    if (t.estado !== "listo") return error(res, 409, "Espera a que el video esté listo para pedir cambios.");
    const { pedido, clip } = await leerCuerpo(req);
    const texto = String(pedido ?? "").trim().slice(0, 600);
    if (texto.length < 3) return error(res, 400, "Escribe qué quieres cambiar.");
    // En un grupo de clips, el cambio es para un clip (n); los demás no se tocan.
    const n = parseInt(clip, 10);
    if (t.tipo === "clips") {
      const prefijo = `clip-${String(n).padStart(2, "0")}-`;
      if (!(n > 0) || !t.versiones[0]?.archivos.some((a) => a.archivo.startsWith(prefijo))) {
        return error(res, 404, "Ese clip no existe.");
      }
    }
    actualizarTrabajo(t.id, {
      estado: "en-cola",
      paso: "Esperando turno",
      error: null,
      pendiente: t.tipo === "clips" ? { tipo: "cambio-clip", n, pedido: texto } : { tipo: "cambio", pedido: texto },
      enColaDesde: new Date().toISOString(),
    });
    anotar(t.id, `Pide cambios${t.tipo === "clips" ? ` al clip ${n}` : ""}: ${texto}`);
    siguiente();
    return enviarJson(res, 200, { ok: true });
  }

  if (metodo === "POST" && accion === "reintentar") {
    if (t.estado !== "problema") return error(res, 409, "Este video no tiene un problema que reintentar.");
    actualizarTrabajo(t.id, { estado: "en-cola", paso: "Esperando turno", error: null, enColaDesde: new Date().toISOString() });
    anotar(t.id, "Reintento.");
    siguiente();
    return enviarJson(res, 200, { ok: true });
  }

  if (metodo === "DELETE" && !accion) {
    if (["editando", "revisando", "exportando"].includes(t.estado)) {
      return error(res, 409, "Este video se está editando ahora. Bórralo cuando termine.");
    }
    borrarTodo(t);
    registrar(`Borrado ${t.id} por ${usuario}`);
    return enviarJson(res, 200, { ok: true });
  }

  // Borrar un clip de un grupo de clips (con todas sus versiones por red). Si era el último, se
  // borra el grupo entero.
  if (metodo === "DELETE" && accion === "clip") {
    if (t.tipo !== "clips" || t.estado !== "listo") return error(res, 409, "Solo se borran clips ya listos.");
    const n = parseInt(url.searchParams.get("n"), 10);
    const prefijo = `clip-${String(n).padStart(2, "0")}-`;
    const versiones = t.versiones.map((v) => {
      for (const a of v.archivos.filter((a) => a.archivo.startsWith(prefijo))) {
        fs.rmSync(path.join(carpetaTrabajo(t.id), "resultados", `v${v.n}`, a.archivo), { force: true });
      }
      return { ...v, archivos: v.archivos.filter((a) => !a.archivo.startsWith(prefijo)) };
    });
    if (!(n > 0) || versiones.every((v, i) => v.archivos.length === t.versiones[i].archivos.length)) {
      return error(res, 404, "Ese clip no existe.");
    }
    const idClip = `${t.proyecto}-clip-${String(n).padStart(2, "0")}`;
    for (const carpeta of [path.join(CARPETA_PROYECTOS, idClip), path.join(CARPETA_SALIDA, "revision", idClip)]) {
      fs.rmSync(carpeta, { recursive: true, force: true });
    }
    if (versiones.every((v) => v.archivos.length === 0)) {
      borrarTodo(t);
    } else {
      actualizarTrabajo(t.id, { versiones });
      anotar(t.id, `${usuario} borró el clip ${n}.`);
    }
    registrar(`Clip ${n} de ${t.id} borrado por ${usuario}`);
    return enviarJson(res, 200, { ok: true });
  }

  if (metodo === "GET" && accion === "archivo") {
    const nombre = url.searchParams.get("nombre");
    // Un clip que ya terminó mientras los demás se siguen creando (todavía está en salida/).
    if (t.tipo === "clips" && url.searchParams.get("parcial") === "1") {
      const listo = leerProgreso(t)?.clips?.some((c) => c.archivos?.includes(nombre));
      const archivo = path.join(CARPETA_SALIDA, String(nombre));
      if (!listo || !String(nombre).startsWith(`${t.proyecto}-clip-`) || !fs.existsSync(archivo)) {
        return error(res, 404, "Ese clip ya no está aquí: recarga la página.");
      }
      return servirArchivo(req, res, archivo, url.searchParams.get("descargar") === "1");
    }
    const version = t.versiones.find((v) => v.archivos.some((a) => a.archivo === nombre));
    if (!version) return error(res, 404, "Ese archivo no existe.");
    const archivo = path.join(carpetaTrabajo(t.id), "resultados", `v${version.n}`, nombre);
    if (!fs.existsSync(archivo)) return error(res, 404, "Ese archivo ya no está.");
    return servirArchivo(req, res, archivo, url.searchParams.get("descargar") === "1");
  }

  return error(res, 404, "No existe.");
};

// ---------- Personas (solo administración) ----------

const manejarPersonas = async (req, res) => {
  const url = new URL(req.url, "http://local");
  const sesion = leerSesion(tokenDe(req));
  if (!sesion.persona?.admin) return error(res, 403, "Solo para administración.");
  if (req.method !== "GET" && req.headers["x-bydzyne"] !== "1") return error(res, 403, "Petición no permitida.");
  const lista = () =>
    Object.entries(personas()).map(([usuario, p]) => ({
      usuario,
      nombre: p.nombre,
      estilo: p.estilo,
      admin: p.admin,
      videos: trabajos().filter((t) => t.usuario === usuario).length,
    }));
  if (req.method === "GET") return enviarJson(res, 200, { personas: lista(), estilos: estilos() });
  if (req.method === "POST") {
    const d = await leerCuerpo(req);
    const usuario = String(d.usuario ?? "").trim().toLowerCase();
    if (!nombreValido(usuario)) return error(res, 400, "El usuario va en minúsculas, sin espacios (por ejemplo maria.gomez).");
    const estilo = d.estilo && estilos().includes(d.estilo) ? d.estilo : null;
    const clave = guardarPersona({ usuario, nombre: String(d.nombre ?? "").trim().slice(0, 60), estilo, admin: false });
    registrar(`${sesion.usuario} creó o cambió la clave de ${usuario}`);
    return enviarJson(res, 200, { usuario, clave, personas: lista() });
  }
  if (req.method === "DELETE") {
    const usuario = url.searchParams.get("usuario");
    if (usuario === sesion.usuario) return error(res, 400, "No puedes borrar tu propia cuenta.");
    borrarPersona(usuario);
    registrar(`${sesion.usuario} borró a ${usuario}`);
    return enviarJson(res, 200, { personas: lista() });
  }
  return error(res, 404, "No existe.");
};

export const crearServidor = () =>
  http.createServer(async (req, res) => {
    try {
      if (new URL(req.url, "http://local").pathname === "/api/personas") await manejarPersonas(req, res);
      else await manejar(req, res);
    } catch (e) {
      registrar(`Error en ${req.method} ${req.url}: ${e.stack ?? e}`);
      if (!res.headersSent) error(res, 500, "Algo falló en el servidor. Intenta de nuevo.");
      else res.end();
    }
  });
