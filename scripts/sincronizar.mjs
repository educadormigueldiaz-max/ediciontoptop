#!/usr/bin/env node
// Regenera src/proyectos.ts a partir de las carpetas de public/proyectos.
// Se ejecuta solo al instalar y antes de abrir la vista previa.
import { actualizarListaDeProyectos } from "./lib/herramientas.mjs";

const ids = actualizarListaDeProyectos();
console.log(`Proyectos: ${ids.length ? ids.join(", ") : "(ninguno todavía)"}`);
