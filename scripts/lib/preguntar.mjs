// Preguntas a Claude Code en modo no interactivo (claude -p), con un tope de gasto.
import { spawn } from "node:child_process";
import { RAIZ } from "./herramientas.mjs";
import { CLAUDE } from "./piloto/cola.mjs";

// Le pide algo a Claude, sin herramientas o (con `herramientas`) solo con Read para mirar cuadros.
// Devuelve { texto, costo } o { error }.
export const preguntarAClaude = (entrada, { tope, sistema, herramientas = false, modelo = null }) =>
  new Promise((resolve) => {
    const proceso = spawn(
      CLAUDE,
      [
        "-p", "--output-format", "json", "--tools", herramientas ? "Read" : "", "--no-session-persistence",
        ...(herramientas ? ["--allowedTools", "Read"] : []),
        "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--setting-sources", "project",
        "--max-budget-usd", String(tope),
        ...(modelo ? ["--model", modelo] : []),
        "--append-system-prompt", sistema,
      ],
      { cwd: RAIZ },
    );
    let salida = "";
    let errores = "";
    proceso.stdout.on("data", (d) => (salida += d));
    proceso.stderr.on("data", (d) => (errores += d));
    proceso.on("error", (e) => resolve({ error: e.message }));
    proceso.on("close", () => {
      try {
        const datos = JSON.parse(salida.trim().split("\n").filter(Boolean).at(-1));
        if (datos.is_error) return resolve({ error: String(datos.result ?? "").slice(-500), costo: datos.total_cost_usd ?? 0 });
        resolve({ texto: String(datos.result ?? ""), costo: datos.total_cost_usd ?? 0 });
      } catch {
        resolve({ error: (errores || salida).slice(-500) });
      }
    });
    proceso.stdin.end(entrada);
  });
