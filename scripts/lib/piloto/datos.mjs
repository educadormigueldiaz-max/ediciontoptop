// Datos del piloto automático: personas, sesiones y trabajos (un video subido y sus versiones).
// Todo vive en piloto/ (no se sube a git): son videos y datos de otras personas.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, escribirJson, leerJson } from "../herramientas.mjs";

export const CARPETA_PILOTO = path.join(RAIZ, "piloto");
export const CARPETA_TRABAJOS = path.join(CARPETA_PILOTO, "trabajos");
const ARCHIVO_PERSONAS = path.join(CARPETA_PILOTO, "personas.json");
const ARCHIVO_SESIONES = path.join(CARPETA_PILOTO, "sesiones.json");
export const ARCHIVO_REGISTRO = path.join(CARPETA_PILOTO, "registro.txt");

export const TIPOS = {
  reel: "Reel de contenido",
  anuncio: "Anuncio",
  tutorial: "Tutorial",
  testimonio: "Testimonio",
  clips: "Clips de un video largo",
};
export const REDES_PILOTO = {
  instagram: "Instagram / TikTok",
  whatsapp: "WhatsApp (liviano)",
  "youtube-shorts": "YouTube Shorts",
  youtube: "YouTube (horizontal)",
  todas: "Todas",
};
// Estados que ve la persona en la página.
export const ESTADOS = {
  subiendo: "Subiendo",
  "en-cola": "En cola",
  editando: "Editando",
  revisando: "Revisando",
  exportando: "Exportando",
  listo: "Listo",
  problema: "Con problema",
};

fs.mkdirSync(CARPETA_TRABAJOS, { recursive: true });

const leer = (archivo, vacio) => (fs.existsSync(archivo) ? leerJson(archivo) : vacio);

export const registrar = (texto) => {
  const linea = `[${new Date().toLocaleString("es-CO")}] ${texto}\n`;
  fs.appendFileSync(ARCHIVO_REGISTRO, linea);
};

// ---------- Personas ----------

const resumenClave = (clave, sal = crypto.randomBytes(16).toString("hex")) =>
  `${sal}:${crypto.scryptSync(clave, sal, 64).toString("hex")}`;

const claveCorrecta = (clave, guardada) => {
  const [sal, resumen] = guardada.split(":");
  const nuevo = crypto.scryptSync(clave, sal, 64);
  return crypto.timingSafeEqual(nuevo, Buffer.from(resumen, "hex"));
};

// Claves fáciles de dictar: tres palabras y un número ("sol-mango-rio-42").
const PALABRAS = [
  "sol", "luna", "mar", "rio", "mango", "pera", "cafe", "nube", "roca", "flor", "lago", "pino",
  "tigre", "puma", "loro", "coco", "miel", "sal", "faro", "isla", "valle", "brisa", "lima", "kiwi",
];
export const claveNueva = () =>
  [0, 1, 2].map(() => PALABRAS[crypto.randomInt(PALABRAS.length)]).join("-") +
  "-" + crypto.randomInt(10, 100);

export const personas = () => leer(ARCHIVO_PERSONAS, {});

export const nombreValido = (usuario) => /^[a-z0-9][a-z0-9._-]{1,29}$/.test(usuario);

// Crea la persona o le pone una clave nueva. Devuelve la clave (se muestra una sola vez).
export const guardarPersona = ({ usuario, nombre, estilo = null, admin = false }) => {
  const todas = personas();
  const clave = claveNueva();
  todas[usuario] = {
    ...(todas[usuario] ?? { creada: new Date().toISOString() }),
    nombre: nombre || todas[usuario]?.nombre || usuario,
    estilo: estilo === undefined ? (todas[usuario]?.estilo ?? null) : estilo,
    admin: Boolean(admin || todas[usuario]?.admin),
    clave: resumenClave(clave),
  };
  escribirJson(ARCHIVO_PERSONAS, todas);
  cerrarSesionesDe(usuario);
  return clave;
};

export const borrarPersona = (usuario) => {
  const todas = personas();
  delete todas[usuario];
  escribirJson(ARCHIVO_PERSONAS, todas);
  cerrarSesionesDe(usuario);
};

export const comprobarClave = (usuario, clave) => {
  const p = personas()[usuario];
  return p && typeof clave === "string" && claveCorrecta(clave, p.clave) ? p : null;
};

// ---------- Sesiones: una sola abierta por persona ----------

// Sesiones cerradas porque la persona entró desde otro equipo (para avisarle en la página).
const reemplazadas = new Map();

const sesiones = () => leer(ARCHIVO_SESIONES, {});

export const abrirSesion = (usuario) => {
  const todas = sesiones();
  for (const [token, s] of Object.entries(todas)) {
    if (s.usuario === usuario) {
      reemplazadas.set(token, Date.now());
      delete todas[token];
    }
  }
  const token = crypto.randomBytes(32).toString("hex");
  todas[token] = { usuario, abierta: new Date().toISOString() };
  escribirJson(ARCHIVO_SESIONES, todas);
  return token;
};

export const cerrarSesion = (token) => {
  const todas = sesiones();
  delete todas[token];
  escribirJson(ARCHIVO_SESIONES, todas);
};

const cerrarSesionesDe = (usuario) => {
  const todas = sesiones();
  for (const [token, s] of Object.entries(todas)) if (s.usuario === usuario) delete todas[token];
  escribirJson(ARCHIVO_SESIONES, todas);
};

// Devuelve { usuario, persona } o { motivo } si no hay sesión válida.
export const leerSesion = (token) => {
  if (!token) return { motivo: "sin-sesion" };
  const s = sesiones()[token];
  if (!s) return { motivo: reemplazadas.has(token) ? "otra-sesion" : "sin-sesion" };
  const persona = personas()[s.usuario];
  if (!persona) return { motivo: "sin-sesion" };
  return { usuario: s.usuario, persona };
};

// ---------- Trabajos ----------

export const carpetaTrabajo = (id) => path.join(CARPETA_TRABAJOS, id);
const archivoTrabajo = (id) => path.join(carpetaTrabajo(id), "trabajo.json");

export const idValido = (id) => typeof id === "string" && /^[a-z0-9]{10}$/.test(id);

export const leerTrabajo = (id) =>
  idValido(id) && fs.existsSync(archivoTrabajo(id)) ? leerJson(archivoTrabajo(id)) : null;

export const guardarTrabajo = (t) => escribirJson(archivoTrabajo(t.id), t);

export const actualizarTrabajo = (id, cambios) => {
  const t = leerTrabajo(id);
  Object.assign(t, cambios, { actualizado: new Date().toISOString() });
  guardarTrabajo(t);
  return t;
};

export const trabajos = () =>
  fs
    .readdirSync(CARPETA_TRABAJOS)
    .map(leerTrabajo)
    .filter(Boolean)
    .sort((a, b) => b.creado.localeCompare(a.creado));

export const nuevoTrabajo = (datos) => {
  const id = crypto.randomBytes(8).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").padEnd(10, "x").slice(0, 10);
  fs.mkdirSync(path.join(carpetaTrabajo(id), "subidos"), { recursive: true });
  const ahora = new Date().toISOString();
  const t = {
    id,
    proyecto: `web-${id}`,
    creado: ahora,
    actualizado: ahora,
    estado: "subiendo",
    paso: "Esperando el video",
    error: null,
    video: null,
    fotos: [],
    versiones: [],
    pendiente: { tipo: "nuevo", pedido: null },
    enColaDesde: null,
    ...datos,
  };
  guardarTrabajo(t);
  return t;
};

// Agrega una línea al registro del trabajo (qué se hizo, cuánto costó, errores).
export const anotar = (id, texto) => {
  fs.appendFileSync(
    path.join(carpetaTrabajo(id), "registro.txt"),
    `[${new Date().toLocaleString("es-CO")}] ${texto}\n`,
  );
};
