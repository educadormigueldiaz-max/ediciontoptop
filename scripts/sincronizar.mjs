#!/usr/bin/env node
// Regenera src/proyectos.ts a partir de las carpetas de public/proyectos.
// Se ejecuta solo al instalar y antes de abrir la vista previa.
import path from "node:path";
import { asegurarCaras } from "./lib/caras.mjs";
import { CARPETA_PROYECTOS, actualizarListaDeProyectos } from "./lib/herramientas.mjs";

const ids = actualizarListaDeProyectos();
for (const id of ids) await asegurarCaras(path.join(CARPETA_PROYECTOS, id, "edicion.json"));
console.log(`Proyectos: ${ids.length ? ids.join(", ") : "(ninguno todavía)"}`);
