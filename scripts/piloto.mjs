#!/usr/bin/env node
// Piloto automático de ByDzyne: una página para subir videos y recibirlos editados.
//   npm run piloto                         Arranca la página y la cola (se deja encendido)
//   npm run piloto -- --usuario maria      Crea a "maria" (o le da una clave nueva) y muestra la clave
//   npm run piloto -- --usuario maria --estilo serio --nombre "María Gómez"
//   npm run piloto -- --personas           Lista las personas
//   npm run piloto -- --al-iniciar         Que arranque solo al prender la Mac
//   npm run piloto -- --no-iniciar         Quita el arranque automático
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { CARPETA_WHISPER, RAIZ } from "./lib/herramientas.mjs";
import { estilosDisponibles } from "./lib/produccion.mjs";
import { CLAUDE, configurarCola, retomar, siguiente } from "./lib/piloto/cola.mjs";
import { CARPETA_PILOTO, guardarPersona, nombreValido, personas, registrar } from "./lib/piloto/datos.mjs";
import { crearServidor } from "./lib/piloto/servidor.mjs";

const { values: op } = parseArgs({
  options: {
    puerto: { type: "string", default: "8080" },
    usuario: { type: "string" },
    nombre: { type: "string" },
    estilo: { type: "string" },
    admin: { type: "boolean", default: false },
    personas: { type: "boolean", default: false },
    tope: { type: "string" },
    "al-iniciar": { type: "boolean", default: false },
    "no-iniciar": { type: "boolean", default: false },
    ayuda: { type: "boolean", default: false },
  },
});

if (op.ayuda) {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 9).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(0);
}

// ---------- Personas ----------
if (op.usuario) {
  const usuario = op.usuario.trim().toLowerCase();
  if (!nombreValido(usuario)) {
    console.error("El usuario va en minúsculas, sin espacios (por ejemplo maria.gomez).");
    process.exit(1);
  }
  if (op.estilo && !estilosDisponibles().includes(op.estilo)) {
    console.error(`No existe el estilo "${op.estilo}". Hay: ${estilosDisponibles().join(", ")}.`);
    process.exit(1);
  }
  const clave = guardarPersona({ usuario, nombre: op.nombre, estilo: op.estilo ?? undefined, admin: op.admin });
  console.log(`\nUsuario: ${usuario}\nContraseña: ${clave}\n\nDásela a esa persona. No se vuelve a mostrar (si se pierde, crea una nueva igual).`);
  process.exit(0);
}
if (op.personas) {
  for (const [u, p] of Object.entries(personas())) {
    console.log(`${u.padEnd(20)} ${p.nombre.padEnd(25)} ${p.admin ? "admin" : ""} ${p.estilo ? `estilo: ${p.estilo}` : ""}`);
  }
  process.exit(0);
}

// ---------- Arranque automático (al iniciar sesión en la Mac) ----------
const PLIST = path.join(os.homedir(), "Library", "LaunchAgents", "com.bydzyne.piloto.plist");
if (op["al-iniciar"] || op["no-iniciar"]) {
  const dominio = `gui/${process.getuid()}`;
  spawnSync("launchctl", ["bootout", dominio, PLIST], { stdio: "ignore" });
  if (op["no-iniciar"]) {
    fs.rmSync(PLIST, { force: true });
    console.log("Listo: el piloto ya no arranca solo al prender la Mac.");
    process.exit(0);
  }
  const log = path.join(CARPETA_PILOTO, "piloto.log");
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.bydzyne.piloto</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${path.join(RAIZ, "scripts", "piloto.mjs")}</string>
    <string>--puerto</string><string>${op.puerto}</string>
  </array>
  <key>WorkingDirectory</key><string>${RAIZ}</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>${path.dirname(process.execPath)}:${path.dirname(CLAUDE)}:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${log}</string>
  <key>StandardErrorPath</key><string>${log}</string>
</dict>
</plist>
`;
  fs.mkdirSync(path.dirname(PLIST), { recursive: true });
  fs.writeFileSync(PLIST, plist);
  const r = spawnSync("launchctl", ["bootstrap", dominio, PLIST], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`No se pudo activar el arranque automático:\n${r.stderr}`);
    process.exit(1);
  }
  console.log(`Listo: el piloto arranca solo al prender la Mac (y se reinicia si se cierra).\nRegistro: ${path.relative(RAIZ, log)}\nPara quitarlo: npm run piloto -- --no-iniciar`);
  process.exit(0);
}

// ---------- Arrancar ----------
if (op.tope) configurarCola({ tope: Number(op.tope) });
if (!fs.existsSync(CARPETA_WHISPER)) {
  console.error("Falta instalar Whisper (los subtítulos). Ejecuta primero: npm run instalar");
  process.exit(1);
}
if (spawnSync(CLAUDE, ["--version"], { encoding: "utf8" }).status !== 0) {
  console.error("No encuentro Claude Code en esta Mac. Instálalo y entra con tu cuenta antes de arrancar el piloto.");
  process.exit(1);
}

// La primera vez se crea la cuenta de administración.
if (!Object.values(personas()).some((p) => p.admin)) {
  const clave = guardarPersona({ usuario: "admin", nombre: "Administración", admin: true });
  console.log(`\nCuenta de administración creada.\n  Usuario: admin\n  Contraseña: ${clave}\nGuárdala: no se vuelve a mostrar (si se pierde: npm run piloto -- --usuario admin --admin).\n`);
}

retomar();
const servidor = crearServidor();
servidor.on("error", (e) => {
  console.error(e.code === "EADDRINUSE" ? `El puerto ${op.puerto} está ocupado: ¿el piloto ya está encendido? Usa --puerto 8081.` : e);
  process.exit(1);
});
servidor.listen(Number(op.puerto), "0.0.0.0", () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
  console.log("\nByDzyne · piloto automático encendido");
  console.log(`  En esta Mac:            http://localhost:${op.puerto}`);
  for (const ip of ips) console.log(`  Otros equipos y celulares (misma red wifi): http://${ip}:${op.puerto}`);
  console.log("\nDéjalo abierto. Para apagarlo: Control + C.\n");
  registrar(`Piloto encendido en el puerto ${op.puerto}`);
  siguiente();
});
