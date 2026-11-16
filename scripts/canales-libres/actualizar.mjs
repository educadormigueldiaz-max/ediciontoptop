// Lista de "Canales con videos libres" del panel de clips (clips.html).
// Cada 2 meses (lo lanza el Mac solo, ver programar.sh) vuelve a mirar los 6 videos más recientes de
// cada canal de canales.json: actualiza suscriptores y saca de la lista los canales que ya casi no
// publican con licencia Creative Commons. Luego rearma el bloque de clips.html y, con --publicar, lo
// guarda en git y lo copia al servidor (editor.somoskreo.com lee clips.html en cada visita: no hay que reiniciar).
//
//   node scripts/canales-libres/actualizar.mjs              revisa y rearma (sin subir)
//   node scripts/canales-libres/actualizar.mjs --publicar   revisa, rearma y sube
//   node scripts/canales-libres/actualizar.mjs --solo-armar rearma con lo que ya hay (sin revisar YouTube)
//   node scripts/canales-libres/actualizar.mjs --prueba     revisa 5 canales y muestra el resultado (no cambia nada)
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../..");
const LISTA = path.join(AQUI, "canales.json");
const INFORME = path.join(AQUI, "informe.txt");
const CLIPS = path.join(RAIZ, "scripts/lib/piloto/clips.html");
const YTDLP = path.join(RAIZ, "node_modules/.cache/bydzyne/yt-dlp");
const LLAVE = path.join(process.env.HOME, ".ssh/kreo_vps");
const SERVIDOR = "root@82.180.161.80";

const publicar = process.argv.includes("--publicar");
const soloArmar = process.argv.includes("--solo-armar");
const prueba = process.argv.includes("--prueba");

// Nichos en el orden en que salen. kreo: los que mejor le sirven a Kreo (llevan la etiqueta).
const NICHOS = {
  NEG: { t: "💼 Negocios y emprendimiento", kreo: true },
  VEN: { t: "📣 Marketing, ventas y redes", kreo: true },
  FIN: { t: "💰 Finanzas, economía e inversión", kreo: true },
  DES: { t: "🚀 Desarrollo personal y motivación", kreo: true },
  PSI: { t: "🧠 Psicología, mente y relaciones", kreo: true },
  SAL: { t: "🩺 Salud y nutrición" }, FIT: { t: "🏋️ Fitness y deportes" }, CIE: { t: "🔭 Ciencia y curiosidades" },
  TEC: { t: "🤖 Tecnología e inteligencia artificial" }, HIS: { t: "🏛️ Historia y relatos" },
  CRI: { t: "🕵️ Crimen, casos reales e historias" }, MIS: { t: "👽 Misterio y paranormal" }, ESP: { t: "🙏 Espiritualidad y fe" },
  HUM: { t: "😂 Humor, entretenimiento y entrevistas" }, VIA: { t: "✈️ Viajes, estilo de vida y belleza" },
  COC: { t: "🍳 Cocina" }, EDU: { t: "📚 Educación e idiomas" }, FAM: { t: "👨‍👩‍👧 Familia y crianza" },
  FIL: { t: "🤔 Filosofía" }, TRA: { t: "🧑‍💻 Trabajo, empleo y migración" },
};

const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Bogota" });
const fechaLarga = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
const canales = JSON.parse(fs.readFileSync(LISTA, "utf8"));
const informe = [];

// 1. Revisar en YouTube (desde el Mac: al servidor YouTube lo bloquea)
if (!soloArmar) {
  if (!fs.existsSync(YTDLP)) throw new Error("Falta el descargador de YouTube (yt-dlp). Corre una vez npm run clips en el Mac.");
  spawnSync(YTDLP, ["-U"], { stdio: "ignore" }); // YouTube cambia seguido: siempre con la última versión
  const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` };
  const mirar = (c) => new Promise((ok) => {
    const p = spawn(YTDLP, ["--playlist-end", "6", "--skip-download", "--ignore-errors", "--js-runtimes", `node:${process.execPath}`,
      "--print", "%(license)s\t%(channel_follower_count)s", `https://www.youtube.com/channel/${c.id}/videos`], { env });
    let s = "";
    const reloj = setTimeout(() => p.kill("SIGKILL"), 240000);
    p.stdout.on("data", (d) => (s += d));
    p.on("close", () => { clearTimeout(reloj); ok(s.split("\n").filter((l) => l.includes("\t")).map((l) => l.split("\t"))); });
  });
  const vivos = canales.filter((c) => !c.retirado).slice(0, prueba ? 5 : undefined);
  let i = 0;
  let hechos = 0;
  const trabajador = async () => {
    while (i < vivos.length) {
      const c = vivos[i++];
      const vids = await mirar(c);
      hechos++;
      if (hechos % 20 === 0) console.log(`  ${hechos} de ${vivos.length} canales revisados…`);
      if (vids.length < 3) { informe.push(`? ${c.nombre}: no se pudo revisar (${vids.length} videos). Queda como estaba.`); continue; }
      const libres = vids.filter(([lic]) => /creative commons/i.test(lic)).length;
      const subs = Math.max(0, ...vids.map(([, s]) => +s || 0));
      Object.assign(c, { libres, revisados: vids.length, revisado: hoy }, subs ? { subs } : {});
      // Se va si menos de la mitad de sus videos recientes es libre
      if (libres / vids.length < 0.5) {
        c.retirado = hoy;
        informe.push(`− ${c.nombre} (${NICHOS[c.nicho].t}): solo ${libres} de ${vids.length} videos recientes son libres. Sale de la lista.`);
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, trabajador));
  if (prueba) {
    for (const c of vivos) console.log(`  ${c.nombre}: ${c.libres} de ${c.revisados} libres, ${c.subs} suscriptores${c.retirado ? " → SALDRÍA" : ""}`);
    for (const l of informe) console.log("  " + l);
    process.exit(0);
  }
  fs.writeFileSync(LISTA, JSON.stringify(canales, null, 1));
}

// 2. Rearmar el bloque de clips.html
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const subs = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",").replace(",0", "")} M` : `${Math.round(n / 1000)} mil`);
const visibles = canales.filter((c) => !c.retirado);
const ultima = visibles.map((c) => c.revisado).sort().at(-1) ?? hoy;
const cajas = Object.entries(NICHOS).map(([k, n]) => {
  const l = visibles.filter((c) => c.nicho === k).sort((a, b) => b.subs - a.subs);
  if (!l.length) return "";
  return `          <details class="nicho-libre${n.kreo ? " para-kreo" : ""}">
            <summary>${n.t} <span class="ayuda">(${l.length})</span>${n.kreo ? ' <span class="etq-kreo" title="De los nichos que mejor encajan con lo que enseña Kreo">✦ Ideal para Kreo</span>' : ""}</summary>
            <ul>
${l.map((c) => `              <li><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.nombre)}</a> <span class="ayuda">· ${subs(c.subs)} suscriptores${c.ingles ? " · en inglés" : ""}</span></li>`).join("\n")}
            </ul>
          </details>`;
}).filter(Boolean).join("\n");
const bloque = `        <!-- CANALES-LIBRES (generado por scripts/canales-libres/actualizar.mjs) -->
        <details class="guia-libre canales-libres" style="margin-top:8px;font-size:15px">
          <summary style="cursor:pointer;font-weight:600">📺 Canales con videos libres, por nicho (${visibles.length} canales)</summary>
          <div style="margin-top:8px;line-height:1.5">
            <p class="ayuda">Canales revisados el ${fechaLarga(ultima)} (se revisan cada 2 meses): en sus videos más recientes, la mayoría tiene licencia Creative Commons. La licencia va <strong>video por video</strong> y el autor la puede cambiar, así que revisa siempre la descripción del video que elijas (Kreo IA también lo revisa). Da siempre el crédito y evita los videos que traen música o partes de otras personas. Los nichos con <span class="etq-kreo">✦ Ideal para Kreo</span> son los que mejor encajan con lo que enseñamos.</p>
${cajas}
          </div>
        </details>
        <!-- /CANALES-LIBRES -->`;
const html = fs.readFileSync(CLIPS, "utf8");
const nuevo = html.replace(/ *<!-- CANALES-LIBRES[\s\S]*?<!-- \/CANALES-LIBRES -->/, bloque);
if (nuevo === html && !html.includes(bloque)) throw new Error("No encontré el bloque CANALES-LIBRES en clips.html.");
fs.writeFileSync(CLIPS, nuevo);

const retiradosHoy = canales.filter((c) => c.retirado === hoy).length;
const resumen = `Canales libres · ${fechaLarga(hoy)}: ${visibles.length} en la lista${soloArmar ? "" : `, ${retiradosHoy} salieron`}.`;
fs.writeFileSync(INFORME, [resumen, ...informe].join("\n") + "\n");
console.log(resumen);
for (const l of informe) console.log("  " + l);

// 3. Guardar y subir
if (publicar) {
  const correr = (cmd, args) => {
    const r = spawnSync(cmd, args, { cwd: RAIZ, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`${cmd} falló: ${r.stderr || r.stdout}`);
  };
  spawnSync("git", ["add", "scripts/canales-libres", "scripts/lib/piloto/clips.html"], { cwd: RAIZ });
  if (spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: RAIZ }).status !== 0) {
    correr("git", ["commit", "-m", `Panel de clips: revisión de canales libres (${hoy}), ${visibles.length} canales`]);
  }
  const ssh = `ssh -i ${LLAVE} -o BatchMode=yes -o ConnectTimeout=20`;
  correr("rsync", ["-az", "-e", ssh, CLIPS, `${SERVIDOR}:/home/editor/editor/scripts/lib/piloto/clips.html`]);
  correr("ssh", ["-i", LLAVE, "-o", "BatchMode=yes", SERVIDOR, "chown editor:editor /home/editor/editor/scripts/lib/piloto/clips.html"]);
  console.log("Subido a editor.somoskreo.com.");
  // Aviso en la pantalla del Mac
  spawnSync("osascript", ["-e", `display notification ${JSON.stringify(resumen)} with title "Kreo · canales libres"`]);
}
