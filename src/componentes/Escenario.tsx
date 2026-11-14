import { loadFont } from "@remotion/fonts";
import { createContext, useContext } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ElementoApoyo } from "../edicion/esquema";
import { useMarca } from "../edicion/estilos";
import type { ElementoEnEditado } from "../edicion/linea-de-tiempo";
import { buscarIcono } from "./iconos";

// Escenarios animados (`modo: "escenario"` de las escenas de apoyo): un mundo dibujado que se
// queda (un cuarto de noche o una calle al atardecer), un personaje en pixeles, una cámara que va
// de la toma abierta a la de cerca y una ventana de app o navegador con lo que se dice. Un cursor
// va a cada punto y lo toca justo cuando la persona lo dice (sus palabras de la transcripción).
// El mundo se dibuja en un escenario de 1080×1920 que cubre el cuadro; la ventana, el cursor y el
// personaje de cerca van en la zona libre (arriba de los subtítulos), en cualquier formato.

loadFont({ family: "Space Grotesk", url: staticFile("fuentes/SpaceGrotesk.ttf"), weight: "300 700" });
const MONO = "Space Grotesk";

const LIMITE = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const suave = Easing.bezier(0.16, 1, 0.3, 1);
const entra = (f: number, desde: number, dur = 14) =>
  interpolate(f, [desde, desde + dur], [0, 1], { ...LIMITE, easing: suave });

export type Escenario = NonNullable<ElementoApoyo["escenario"]>;
type Punto = ElementoApoyo["puntos"][number];
export type ItemEscenario = ElementoEnEditado & { elemento: ElementoApoyo };
// Cómo se une con las escenas de al lado: si sigue en el mismo mundo, no hay transición y la
// cámara, la luz y el personaje siguen desde donde quedaron.
export type Continuidad = { entra: boolean; sale: boolean; cercaAntes: boolean; luzAntes: number };

// ---------------- Colores ----------------
const mezclar = (a: string, b: string, t: number) => {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [n(a), n(b)];
  if (x.some(Number.isNaN) || y.some(Number.isNaN)) return a;
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};
const temaDe = (mundo: Escenario["mundo"], acento: string, fuente: string) => {
  const base = {
    acento,
    acento2: mezclar(acento, "#ffffff", 0.45),
    acentoOscuro: mezclar(acento, "#000000", 0.3),
    verde: "#3ccf91",
    fuente,
  };
  return mundo === "calle"
    ? { ...base, texto: "#fbf3ec", suave: "#c2aeb0", gris: "#8a7378", ventana: "#1b1517", barra: "#241c1f", linea: "#3a2c30", caja: "#241c20", papel: "#fbf3ea", tinta: "#1d1517", navegador: true }
    : { ...base, texto: "#f4f2ee", suave: "#a6a2b4", gris: "#6d6a78", ventana: "#16161c", barra: "#1d1d25", linea: "#2c2b36", caja: "#1c1c24", papel: "#f2efe9", tinta: "#17161b", navegador: false };
};
type Tema = ReturnType<typeof temaDe>;
const ContextoTema = createContext<Tema>(temaDe("cuarto", "#8f7cff", "sans-serif"));
const useTema = () => useContext(ContextoTema);

// Los íconos se buscan una sola vez (buscar en la lista enorme de lucide en cada cuadro hacía caer
// el render de Chrome en algunos cuadros de 16:9).
const ICONOS_YA = new Map<string, ReturnType<typeof buscarIcono>>();
const iconoDe = (n: string) => {
  if (!ICONOS_YA.has(n)) ICONOS_YA.set(n, buscarIcono(n));
  return ICONOS_YA.get(n) ?? null;
};
const Icono: React.FC<{ nombre: string | null; defecto: string; tam: number; color?: string }> = ({ nombre, defecto, tam, color }) => {
  const K = useTema();
  const C = (nombre && iconoDe(nombre)) || iconoDe(defecto);
  return C ? <C size={tam} color={color ?? K.texto} strokeWidth={2.2} style={{ flexShrink: 0 }} /> : null;
};

// ---------------- Personaje en pixeles ----------------
const FRENTE = [
  "....hhhhhhhh....", "...hhhhhhhhhh...", "..hhhhhhhhhhhh..", "..hssssssssssh..", "..sswwsssswwss..", "..sseesssseess..",
  "..ssssssssssss..", "..ssssSSssssss..", "..ssssmmmmssss..", "...ssssssssss...", ".....ssssss.....", "...pppppppppp...",
  "..pppppppppppp..", ".pppppkkkkppppp.", ".spppppppppppps.", ".sPPPPPPPPPPPPs.", "...jjjjjjjjjj...", "...jjjj..jjjj...",
  "...jjjj..jjjj...", "..zzzzz..zzzzz..", "..ZZZZZ..ZZZZZ..",
];
// La tendera de la calle: pelo largo, camisa y delantal
const TENDERA = [
  "....hhhhhhhh....", "...hhhhhhhhhh...", "..hhhhhhhhhhhh..", "..hhhhsssshhhh..", ".hsswwsssswwssh.", ".hsseesssseessh.",
  ".hssssssssssssh.", ".hssssSSssssssh.", ".hssssmmmmssssh.", ".hhsssssssssshh.", ".hh..ssssss..hh.", ".hpppppppppppph.",
  "..ppaaaaaaaapp..", ".ppaaakkkkaaapp.", ".spaaaaaaaaaaps.", ".sPaaaaaaaaaaPs.", "...aaaaaaaaaa...", "...jjjj..jjjj...",
  "...jjjj..jjjj...", "..zzzzz..zzzzz..", "..ZZZZZ..ZZZZZ..",
];
type Sprite = { frente: string[]; parpadeo: string[]; paleta: Record<string, string> };
const sprite = (frente: string[], paleta: Record<string, string>): Sprite => ({
  frente,
  paleta,
  parpadeo: frente.map((f, i) => (i === 4 || i === 5 ? f.replace(/[we]/g, "s") : f)),
});
const PIEL = { s: "#d9a27a", S: "#b98660", e: "#18161a", w: "#f4f4f4", m: "#8a3f2c" };
const spriteDe = (mundo: Escenario["mundo"], K: Tema) =>
  mundo === "calle"
    ? sprite(TENDERA, { h: "#6a2f1c", s: "#c98d64", S: "#a8714d", e: "#18161a", w: "#f4f4f4", m: "#8a3f2c", p: "#2f8f83", P: "#22685f", a: "#f3e6cf", k: K.acento, j: "#3a3346", z: "#f0f0f0", Z: K.acento })
    : sprite(FRENTE, { ...PIEL, h: "#2a1c14", p: K.acento, P: K.acentoOscuro, k: "#ffffff", j: "#2b3c63", z: "#efefef", Z: K.acento2 });
const TRANSEUNTES: Sprite[] = [
  sprite(FRENTE, { ...PIEL, h: "#111", p: "#e0524a", P: "#a83a33", k: "#e0524a", j: "#24324f", z: "#efefef", Z: "#222" }),
  sprite(TENDERA, { h: "#d9b26a", s: "#e3b38c", S: "#c4936c", e: "#18161a", w: "#f4f4f4", m: "#8a3f2c", p: "#4b6cc4", P: "#33508f", a: "#4b6cc4", k: "#4b6cc4", j: "#2a2a2a", z: "#f0f0f0", Z: "#4b6cc4" }),
  sprite(FRENTE, { ...PIEL, h: "#5a3a22", s: "#8d5a3b", S: "#6f4529", p: "#e7c15a", P: "#b8932f", k: "#e7c15a", j: "#3d3d3d", z: "#efefef", Z: "#e7c15a" }),
];

const Pixel: React.FC<{ filas: string[]; tam: number; sinMano?: boolean; paleta: Record<string, string> }> = ({ filas, tam, sinMano, paleta }) => (
  <svg width={16 * tam} height={filas.length * tam} viewBox={`0 0 16 ${filas.length}`} shapeRendering="crispEdges" style={{ display: "block", overflow: "visible" }}>
    {filas.flatMap((f, y) =>
      [...f].map((c, x) =>
        c === "." || !paleta[c] || (sinMano && x === 14 && (y === 14 || y === 15)) ? null : (
          <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={paleta[c]} />
        ),
      ),
    )}
  </svg>
);

const Personaje: React.FC<{ x: number; y: number; tam: number; saluda?: boolean; salto?: number; sp: Sprite }> = ({ x, y, tam, saluda, salto = 0, sp }) => {
  const f = useCurrentFrame();
  const parpadea = f % 96 > 90;
  const bob = Math.round(Math.sin(f / 9) * 1.2) * tam * 0.5 - salto * tam * 2;
  const mano = saluda ? Math.sin(f / 3.2) * 28 - 150 : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 16 * tam, height: 21 * tam }}>
      <div style={{ position: "absolute", left: tam, right: tam, bottom: -tam * 0.8, height: tam * 1.6, borderRadius: "50%", background: "rgba(0,0,0,.55)", filter: `blur(${tam * 0.4}px)` }} />
      <div style={{ transform: `translateY(${bob}px)` }}>
        <Pixel filas={parpadea ? sp.parpadeo : sp.frente} tam={tam} sinMano={saluda} paleta={sp.paleta} />
        {saluda ? (
          <div style={{ position: "absolute", left: 14 * tam, top: 13.5 * tam, width: tam * 1.05, height: tam * 3.4, transformOrigin: `${tam * 0.5}px ${tam * 0.3}px`, transform: `rotate(${mano}deg)` }}>
            <div style={{ width: "100%", height: "70%", background: sp.paleta.p }} />
            <div style={{ width: "100%", height: "30%", background: sp.paleta.s }} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ---------------- El cuarto de noche ----------------
type FondoProps = { local: number; luz: number; cerca: number; titulo: string; busqueda: string | null; nombre: string | null; hora: string };
const Cuarto: React.FC<FondoProps> = ({ local, titulo, nombre, hora }) => {
  const K = useTema();
  const f = useCurrentFrame();
  const parpadeo = 0.92 + 0.08 * Math.sin(f / 7) * random(`l${Math.floor(f / 4)}`);
  const lineas = ["> trabajando de noche", `  ${hora}`, `✓ ${titulo}`.slice(0, 28)];
  let quedan = Math.floor(local / 1.6);
  return (
    <AbsoluteFill style={{ background: "#050609" }}>
      <div style={{ position: "absolute", left: 0, top: 500, width: 1080, height: 1200, background: `radial-gradient(ellipse 520px 460px at 500px 620px, rgba(255,214,170,${0.13 * parpadeo}), transparent 70%)` }} />
      {/* Ventana con la luna */}
      <div style={{ position: "absolute", left: 40, top: 150, width: 420, height: 660, background: "#030406", padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1.25fr", gap: 14, boxShadow: "0 0 120px rgba(40,80,170,.25)" }}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ background: "linear-gradient(170deg, #20428a, #0e2152)" }} />)}
        <svg width={130} height={130} viewBox="0 0 100 100" style={{ position: "absolute", left: 60, top: 70, overflow: "visible", filter: "drop-shadow(0 0 24px rgba(245,239,224,.55))" }}>
          <defs><mask id="luna-escenario"><rect width="100" height="100" fill="#fff" /><circle cx="28" cy="40" r="44" fill="#000" /></mask></defs>
          <circle cx="50" cy="50" r="44" fill="#f5efe0" mask="url(#luna-escenario)" />
        </svg>
        <div style={{ position: "absolute", left: 205, top: 20, width: 14, height: 640, background: "#030406" }} />
        <div style={{ position: "absolute", left: 0, top: 285, width: 420, height: 14, background: "#030406" }} />
        {[[60, 360], [330, 90], [300, 470], [150, 560]].map(([x, y], i) => (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: 5, height: 5, background: "#fff", opacity: 0.4 + 0.6 * Math.abs(Math.sin(f / 15 + i * 2)) }} />
        ))}
      </div>
      {/* Aro de luz */}
      <div style={{ position: "absolute", left: 50, top: 1000, width: 160, height: 200, background: "#0d0e12", borderRadius: 10 }} />
      <div style={{ position: "absolute", left: 70, top: 1040, width: 120, height: 120, borderRadius: "50%", border: "15px solid #f2f2f2", boxShadow: "0 0 40px rgba(255,255,255,.35), inset 0 0 20px rgba(255,255,255,.3)" }} />
      {/* Escritorio */}
      <div style={{ position: "absolute", inset: 0, clipPath: "polygon(0% 62%, 100% 59%, 100% 81%, 0% 86%)", background: "linear-gradient(180deg, #3b3029 0%, #2a221d 55%, #1a1511 100%)" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: "polygon(0% 86%, 100% 81%, 100% 86%, 0% 92%)", background: "#100c0a" }} />
      <div style={{ position: "absolute", left: 120, top: 1150, width: 860, height: 380, background: `radial-gradient(ellipse at 50% 30%, rgba(255,220,180,${0.14 * parpadeo}), transparent 65%)` }} />
      {/* Portátil */}
      <div style={{ position: "absolute", left: 190, top: 870, width: 580, height: 380, background: "#2c2e35", borderRadius: "20px 20px 6px 6px", padding: 14, boxShadow: "0 30px 60px rgba(0,0,0,.6)" }}>
        <div style={{ width: "100%", height: "100%", background: "#0b0c10", borderRadius: 8, overflow: "hidden", padding: 26, boxShadow: `inset 0 0 80px rgba(255,220,180,${0.06 * parpadeo})` }}>
          <div style={{ background: "#15161b", borderRadius: 14, border: "2px solid #2a2b33", height: "100%", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "2px solid #23242b" }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
              <span style={{ flex: 1, textAlign: "center", fontFamily: K.fuente, fontSize: 18, color: K.suave, fontWeight: 700 }}>Terminal</span>
            </div>
            <div style={{ padding: "16px 20px", fontFamily: MONO, fontSize: 25, lineHeight: 1.5, color: "#e9e6f2" }}>
              {lineas.map((l, i) => {
                const n = Math.max(0, Math.min(l.length, quedan));
                quedan -= l.length;
                return <div key={i} style={{ whiteSpace: "pre", color: l.startsWith("✓") ? K.verde : undefined, minHeight: 37 }}>{l.slice(0, n)}</div>;
              })}
              <span style={{ display: "inline-block", width: 13, height: 26, background: "#e9e6f2", opacity: Math.floor(f / 12) % 2 }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, clipPath: "polygon(160px 1250px, 800px 1250px, 860px 1330px, 100px 1330px)", background: "linear-gradient(180deg, #4a4d55, #34363c)" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: "polygon(205px 1260px, 755px 1260px, 790px 1300px, 170px 1300px)", background: "repeating-linear-gradient(90deg, #1b1c20 0 30px, #2b2d33 30px 36px)" }} />
      {/* Celular en su base */}
      <div style={{ position: "absolute", left: 740, top: 1360, width: 310, height: 46, background: "#4c5262", borderRadius: 8, boxShadow: "0 20px 30px rgba(0,0,0,.6)" }} />
      <div style={{ position: "absolute", left: 765, top: 800, width: 270, height: 580, borderRadius: 44, background: "linear-gradient(160deg, #26252b, #121115)", border: "6px solid #2f2e35", boxShadow: "0 30px 80px rgba(0,0,0,.7)", padding: "26px 18px", color: "#f4f4f4", fontFamily: K.fuente }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px", opacity: 0.8 }}>
          <Icono nombre="lock" defecto="lock" tam={16} color="#f4f4f4" />
          <span style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
            {[6, 9, 12].map((h) => <span key={h} style={{ width: 4, height: h, background: "#f4f4f4" }} />)}
            <span style={{ marginLeft: 6, width: 22, height: 11, border: "2px solid #f4f4f4", borderRadius: 3 }} />
          </span>
        </div>
        <div style={{ textAlign: "center", fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 34, letterSpacing: "-0.02em" }}>{hora}</div>
        <div style={{ marginTop: 22, display: "flex", gap: 10, alignItems: "center", padding: 12, borderRadius: 18, background: "rgba(255,255,255,.12)", opacity: entra(local, 8, 10) }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: K.acento, display: "grid", placeItems: "center" }}>
            <Icono nombre="bell" defecto="bell" tam={20} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800 }}><span>{nombre ?? "Nuevo"}</span><span style={{ opacity: 0.6, fontWeight: 700 }}>ahora</span></div>
            <div style={{ fontSize: 15, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 40, left: 30, right: 30, display: "flex", justifyContent: "space-between" }}>
          {["flashlight", "camera"].map((x) => (
            <span key={x} style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center" }}>
              <Icono nombre={x} defecto={x} tam={20} color="#f4f4f4" />
            </span>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 16, left: "32%", right: "32%", height: 5, borderRadius: 5, background: "#ddd" }} />
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 55%, transparent 55%, rgba(0,0,0,.65))" }} />
    </AbsoluteFill>
  );
};

// ---------------- La calle al atardecer (negocio de barrio) ----------------
const EDIFICIOS = [[0, 170, 380], [150, 130, 300], [260, 190, 440], [430, 120, 330], [530, 210, 470], [720, 140, 360], [840, 120, 420], [950, 160, 340]];
const Calle: React.FC<FondoProps> = ({ local, luz, cerca, busqueda, nombre }) => {
  const K = useTema();
  const f = useCurrentFrame();
  const poste = entra(f, 10, 8) * (0.93 + 0.07 * random(`p${Math.floor(f / 3)}`));
  const neon = luz > 0 ? (luz < 1 ? (random(`n${f}`) > 0.4 ? luz : 0.15) : 1) : 0;
  const letras = busqueda ? Math.floor(interpolate(local, [10, 40], [0, busqueda.length], LIMITE)) : 0;
  const tarjeta = busqueda ? entra(local, 4, 12) : 0;
  const voltea = interpolate(luz, [0.3, 0.7], [1, -1], LIMITE);
  const letrero = (nombre ?? "TU NEGOCIO").toUpperCase();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #1c1838 0%, #4b2a5c 30%, #c4506a 52%, #ff9a5a 64%, #ffc27a 72%)" }}>
      <div style={{ position: "absolute", left: 600, top: 700 + f * 0.25, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, #fff1c2 0%, #ffd27a 45%, #ffad5c 70%)", boxShadow: "0 0 160px 60px rgba(255,170,90,.45)" }} />
      {[[80, 260, 360, 0.3], [560, 420, 300, 0.22], [200, 600, 420, 0.18]].map(([x, y, w, o], i) => (
        <div key={i} style={{ position: "absolute", left: ((x + f * (0.4 + i * 0.15)) % 1300) - 200, top: y, width: w, height: w * 0.22, borderRadius: 999, background: i === 1 ? "#ffb38f" : "#ff8e7a", opacity: o, filter: "blur(2px)" }} />
      ))}
      {EDIFICIOS.map(([x, w, h], i) => (
        <div key={i} style={{ position: "absolute", left: x - f * 0.05, top: 1080 - h, width: w, height: h + 200, background: "#3b2547" }}>
          {Array.from({ length: Math.floor(h / 60) * 3 }, (_, j) => (
            <span key={j} style={{ position: "absolute", left: 18 + (j % 3) * (w / 3.2), top: 24 + Math.floor(j / 3) * 60, width: 18, height: 26, background: "#ffcf7a", opacity: random(`v${i}-${j}`) > 0.45 ? 0.75 + 0.25 * Math.sin(f / 20 + j) : 0.08 }} />
          ))}
        </div>
      ))}
      {/* El negocio */}
      <div style={{ position: "absolute", left: 150, top: 560, width: 780, height: 910, background: "linear-gradient(180deg, #6b3f45, #4e2d35)", boxShadow: "0 0 80px rgba(0,0,0,.5)" }}>
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(180deg, transparent 0 26px, rgba(0,0,0,.16) 26px 29px)" }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: 60 + i * 240, top: 70, width: 180, height: 190, background: "#2a1a1f", padding: 10 }}>
            <div style={{ width: "100%", height: "100%", background: i === 1 ? "linear-gradient(180deg, #ffd99a, #ffb366)" : "linear-gradient(180deg, #3a2a40, #24182a)", boxShadow: i === 1 ? "0 0 50px rgba(255,190,110,.6)" : undefined }}>
              <div style={{ width: "45%", height: "100%", background: "rgba(0,0,0,.25)" }} />
            </div>
          </div>
        ))}
      </div>
      {/* Letrero de neón */}
      <div style={{ position: "absolute", left: 230, top: 850, width: 620, height: 100, borderRadius: 14, background: "#22161b", border: "6px solid #140c10", display: "grid", placeItems: "center", fontFamily: K.fuente, fontWeight: 900, fontSize: letrero.length > 12 ? 46 : 60, letterSpacing: "0.08em", whiteSpace: "nowrap", color: neon ? K.acento2 : "#5a3a40", textShadow: neon ? `0 0 ${20 * neon}px ${K.acento}, 0 0 ${50 * neon}px ${K.acento}` : "none" }}>{letrero}</div>
      {/* Toldo */}
      <div style={{ position: "absolute", left: 190, top: 960, width: 700, height: 90, background: `repeating-linear-gradient(90deg, ${K.acento} 0 50px, #f3e6cf 50px 100px)`, boxShadow: "0 20px 30px rgba(0,0,0,.35)" }} />
      <div style={{ position: "absolute", left: 190, top: 1050, width: 700, height: 26, background: `radial-gradient(circle at 25px 0, ${K.acentoOscuro} 24px, transparent 25px) 0 0 / 50px 26px repeat-x` }} />
      {/* Vitrina */}
      <div style={{ position: "absolute", left: 210, top: 1095, width: 430, height: 330, background: "#1d1418", padding: 12 }}>
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: `linear-gradient(180deg, ${luz > 0.5 ? "#5a3a2a" : "#1b1c26"}, ${luz > 0.5 ? "#2e1e18" : "#121219"})` }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 20%, rgba(255,213,154,${0.45 * luz}), transparent 70%)` }} />
          {[90, 190].map((y) => (
            <div key={y} style={{ position: "absolute", left: 20, right: 20, top: y, height: 8, background: "#3a2a26" }}>
              {[0, 1, 2, 3].map((j) => <span key={j} style={{ position: "absolute", left: 20 + j * 92, bottom: 8, width: 54, height: 50 + (j % 2) * 18, borderRadius: 6, background: [K.acento, "#f3e6cf", "#2f8f83", "#ffc27a"][j], opacity: 0.35 + 0.6 * luz }} />)}
            </div>
          ))}
          <div style={{ position: "absolute", left: -100, top: 0, width: 120, height: "140%", background: "rgba(255,255,255,.07)", transform: "rotate(20deg)" }} />
        </div>
      </div>
      {/* Puerta con el aviso que se voltea */}
      <div style={{ position: "absolute", left: 680, top: 1095, width: 190, height: 370, background: "#2b1d22", border: "10px solid #1a1114" }}>
        <div style={{ margin: 16, height: 150, background: luz > 0.5 ? "linear-gradient(180deg,#ffd99a,#d99a5a)" : "#1b1c26" }} />
        <span style={{ position: "absolute", right: 20, top: 210, width: 14, height: 14, borderRadius: "50%", background: "#e7c15a" }} />
        <div style={{ position: "absolute", left: 14, top: 60, width: 142, height: 60, borderRadius: 8, background: voltea > 0 ? "#e0524a" : K.verde, color: "#fff", display: "grid", placeItems: "center", fontFamily: K.fuente, fontWeight: 900, fontSize: 22, transform: `scaleX(${Math.max(0.05, Math.abs(voltea))}) rotate(${Math.sin(f / 12) * 2}deg)`, boxShadow: "0 6px 12px rgba(0,0,0,.4)" }}>{voltea > 0 ? "CERRADO" : "ABIERTO"}</div>
      </div>
      {/* Matas */}
      {[630, 885].map((x) => (
        <div key={x} style={{ position: "absolute", left: x, top: 1390, width: 70, height: 80 }}>
          <div style={{ position: "absolute", bottom: 0, left: 10, width: 50, height: 40, background: "#a0523d", borderRadius: "4px 4px 10px 10px" }} />
          <div style={{ position: "absolute", bottom: 34, left: 0, width: 70, height: 56, borderRadius: "50%", background: "#2f7d4f", transform: `rotate(${Math.sin(f / 18 + x) * 3}deg)` }} />
        </div>
      ))}
      {/* Andén y calle */}
      <div style={{ position: "absolute", left: 0, top: 1465, width: 1080, height: 120, background: "repeating-linear-gradient(90deg, #3a3040 0 118px, #2c2432 118px 122px)", borderTop: "4px solid #4a3e50" }} />
      <div style={{ position: "absolute", left: 0, top: 1585, width: 1080, height: 22, background: "#251e2b" }} />
      <div style={{ position: "absolute", left: 0, top: 1607, width: 1080, height: 320, background: "linear-gradient(180deg, #1d1822, #120f16)" }} />
      <div style={{ position: "absolute", left: -((f * 2) % 200), top: 1770, width: 1400, height: 12, background: "repeating-linear-gradient(90deg, #e8d9a8 0 100px, transparent 100px 200px)", opacity: 0.6 }} />
      {/* Poste de luz que se prende */}
      <div style={{ position: "absolute", left: 30, top: 820, width: 18, height: 760, background: "#1a1418" }} />
      <div style={{ position: "absolute", left: 20, top: 800, width: 90, height: 26, borderRadius: 8, background: "#1a1418" }} />
      <div style={{ position: "absolute", left: 70, top: 826, width: 40, height: 22, borderRadius: "0 0 20px 20px", background: poste > 0.2 ? "#fff3c9" : "#3a3036", boxShadow: poste > 0.2 ? `0 0 40px 10px rgba(255,230,160,${0.7 * poste})` : undefined }} />
      <div style={{ position: "absolute", left: -110, top: 846, width: 360, height: 740, background: `radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255,230,160,${0.22 * poste}), transparent 80%)`, clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)" }} />
      {/* Una búsqueda que no encuentra nada */}
      {busqueda && tarjeta > 0 ? (
        <div style={{ position: "absolute", left: 140, top: 560, width: 800, padding: "22px 30px", borderRadius: 28, background: K.papel, color: K.tinta, fontFamily: K.fuente, boxShadow: "0 30px 60px rgba(0,0,0,.45)", opacity: tarjeta, transform: `translateY(${(1 - tarjeta) * -30}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 38, fontWeight: 700 }}>
            <Icono nombre="search" defecto="search" tam={40} color={K.tinta} />
            <span>{busqueda.slice(0, letras)}</span>
            <span style={{ width: 4, height: 40, background: K.tinta, opacity: Math.floor(f / 10) % 2 }} />
          </div>
          {letras >= busqueda.length ? <div style={{ marginTop: 10, fontSize: 30, fontWeight: 800, color: "#e0524a", opacity: entra(local, 44, 8) }}>Sin resultados</div> : null}
        </div>
      ) : null}
      {/* Gente que pasa cuando el negocio está abierto */}
      {luz > 0.3 && cerca < 0.4
        ? [0, 1, 2].map((i) => {
            const x = ((f * (2.2 + i * 0.6) + i * 470) % 1500) - 250;
            const dir = i === 1 ? -1 : 1;
            const sp = TRANSEUNTES[i];
            return (
              <div key={i} style={{ position: "absolute", left: dir > 0 ? x : 1080 - x, top: 1300 + i * 12 - Math.abs(Math.sin(f / 4 + i)) * 6, opacity: luz * Math.max(0, 1 - cerca * 2.5), transform: `scaleX(${dir})` }}>
                <Pixel filas={Math.floor(f / 6 + i) % 2 ? sp.frente : sp.parpadeo} tam={9} paleta={sp.paleta} />
              </div>
            );
          })
        : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 55%, transparent 60%, rgba(10,5,15,.55))" }} />
    </AbsoluteFill>
  );
};

// Cada mundo: su fondo, dónde enfoca la cámara de cerca y dónde está el personaje en la toma abierta.
// `abajo`: color del piso para lo que quede debajo del mundo cuando se sube (para que el
// personaje no quede detrás de los subtítulos).
const MUNDOS: Record<Escenario["mundo"], { Fondo: React.FC<FondoProps>; foco: [number, number]; zoom: number; sube: number; personaje: [number, number, number]; vela: string; abajo: string }> = {
  cuarto: { Fondo: Cuarto, foco: [480, 1060], zoom: 1.75, sube: 260, personaje: [400, 1110, 13], vela: "rgba(5,6,9,.55)", abajo: "#050609" },
  calle: { Fondo: Calle, foco: [425, 1250], zoom: 1.65, sube: 120, personaje: [480, 1225, 12], vela: "rgba(20,8,18,.5)", abajo: "#120f16" },
};

// ---------------- Ventanas ----------------
// Medidas de la ventana (en sus propias unidades: 980 de ancho). Fijas para que el cursor llegue
// exacto a cada cosa.
const ANCHO = 980;
const BARRA = 84;
const PAD = { arriba: 30, abajo: 36, lados: 36 };
const UTIL = ANCHO - PAD.lados * 2;
const NOMBRE: Record<Escenario["pantalla"], string> = {
  mundo: "", lista: "Pasos", chips: "Ideas", tarjetas: "Opciones", aviso: "Ojo", guion: "Guion", cierre: "Contacto", web: "inicio", panel: "resumen", crm: "clientes", golpe: "", mosaico: "", perfil: "", proceso: "",
};
const COLUMNAS_CRM = ["Nuevo", "Conversando", "Cliente"];

// El título se parte en renglones aquí (no lo decide el navegador) para saber su alto exacto.
const renglones = (texto: string, tam: number) => {
  const porRenglon = Math.floor(UTIL / (tam * 0.64));
  const salida: string[] = [];
  for (const p of texto.trim().split(/\s+/)) {
    const ultimo = salida.at(-1);
    if (ultimo !== undefined && ultimo.length + 1 + p.length <= porRenglon) salida[salida.length - 1] = `${ultimo} ${p}`;
    else salida.push(p);
  }
  return salida;
};
const tituloDe = (texto: string | null) => {
  if (!texto) return { lineas: [] as string[], tam: 50, alto: 0 };
  let tam = 50;
  let lineas = renglones(texto, tam);
  if (lineas.length > 2) {
    tam = 40;
    lineas = renglones(texto, tam);
  }
  return { lineas, tam, alto: lineas.length * tam * 1.12 + 26 };
};

const cols = (n: number, max: number) => Math.min(max, Math.max(1, n));
// Alto del contenido de cada pantalla.
const altoContenido = (p: Escenario["pantalla"], n: number, sub: string | null) => {
  switch (p) {
    case "lista": return n * 120 + (n - 1) * 18;
    case "chips": { const filas = Math.max(2, Math.ceil(n / 2)); return filas * 250 + (filas - 1) * 20; }
    case "tarjetas": return 520;
    case "aviso": return 30 + 230 + (sub ? 26 + renglones(sub, 40).length * 52 : 0) + 10;
    case "guion": return 450;
    case "cierre": return n * 76 + 10 + 130;
    case "web": { const filas = Math.ceil(n / cols(n, 3)); return 74 + 230 + 40 + filas * 200 + (filas - 1) * 14; }
    case "panel": return 163 + 18 + 274 + 18 + 120;
    case "crm": return 80 + Math.max(3, n) * 118;
    default: return 0;
  }
};

type Objetivo = { f: number; x: number; y: number; clic?: boolean };
// Dónde está cada cosa dentro de la ventana (para que el cursor llegue justo ahí).
const objetivosDe = (p: Escenario["pantalla"], puntos: Punto[], momentos: number[], arriba: number, clicCierre: number): Objetivo[] => {
  const n = puntos.length;
  const f = (i: number) => momentos[i] ?? 10 + i * 14;
  switch (p) {
    case "lista": return puntos.map((_, i) => ({ f: f(i), x: PAD.lados + 664, y: arriba + i * 138 + 52, clic: true }));
    case "chips": return puntos.map((_, i) => ({ f: f(i), x: PAD.lados + (i % 2) * 464 + 300, y: arriba + Math.floor(i / 2) * 270 + 160, clic: true }));
    case "tarjetas": {
      const c = Math.max(2, n), ancho = (UTIL - 36 - 16 * (c - 1)) / c;
      return puntos.map((_, i) => ({ f: f(i), x: PAD.lados + 18 + i * (ancho + 16) + ancho * 0.8, y: arriba + 50 + 120, clic: true }));
    }
    case "cierre": return [
      ...puntos.map((_, i) => ({ f: f(i), x: PAD.lados + 560, y: arriba + i * 76 + 20 })),
      { f: clicCierre, x: ANCHO / 2 + 60, y: arriba + n * 76 + 10 + 55, clic: true },
    ];
    case "web": {
      const c = cols(n, 3), ancho = (UTIL - 40 - 14 * (c - 1)) / c;
      return puntos.map((_, i) => ({ f: f(i), x: PAD.lados + 20 + (i % c) * (ancho + 14) + ancho / 2, y: arriba + 74 + 230 + 20 + Math.floor(i / c) * 214 + 100, clic: true }));
    }
    case "panel": {
      const c = cols(Math.min(3, n), 3), ancho = (UTIL - 14 * (c - 1)) / c;
      return puntos.slice(0, 3).map((_, i) => ({ f: f(i), x: PAD.lados + i * (ancho + 14) + ancho * 0.6, y: arriba + 70, clic: true }));
    }
    case "crm": {
      const colW = (UTIL - 28) / 3;
      return puntos.flatMap((_, i) => {
        const x0 = PAD.lados + colW / 2, y = arriba + 70 + i * 118 + 45;
        return [{ f: f(i) + 18, x: x0, y, clic: true }, { f: f(i) + 32, x: x0 + colW + 14, y }];
      });
    }
    default: return [];
  }
};

const Ventana: React.FC<{ local: number; dur: number; titulo: string; nombre: string | null; hora: string; children: React.ReactNode }> = ({ local, dur, titulo, nombre, hora, children }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const s = spring({ frame: local, fps, config: { damping: 15, stiffness: 140 } });
  const fuera = interpolate(local, [dur - 7, dur], [1, 0], LIMITE);
  const ruta = titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
  const sitio = nombre ? `${nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "")}.com` : "tunegocio.com";
  return (
    <div style={{ width: ANCHO, borderRadius: 30, background: K.ventana, border: `2px solid ${K.linea}`, boxShadow: "0 40px 120px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.03)", overflow: "hidden", opacity: s * fuera, transform: `translateY(${(1 - s) * 60}px) scale(${0.94 + 0.06 * s})`, fontFamily: K.fuente, color: K.texto }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: BARRA, boxSizing: "border-box", padding: "0 28px", background: K.barra, borderBottom: `2px solid ${K.linea}` }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 20, height: 20, borderRadius: "50%", background: c }} />)}
        {K.navegador ? (
          <div style={{ marginLeft: 14, flex: 1, display: "flex", alignItems: "center", gap: 12, height: 54, padding: "0 22px", borderRadius: 999, background: "#120e10", border: `2px solid ${K.linea}`, fontFamily: MONO, fontSize: 26, whiteSpace: "nowrap", overflow: "hidden" }}>
            <Icono nombre="lock" defecto="lock" tam={24} color={K.verde} />
            <span style={{ color: K.texto }}>{sitio}</span>
            <span style={{ color: K.gris }}>/{ruta}</span>
          </div>
        ) : (
          <>
            <span style={{ marginLeft: 12, width: 34, height: 34, borderRadius: 9, background: K.acento, display: "grid", placeItems: "center" }}>
              <Icono nombre="sparkles" defecto="sparkles" tam={20} color="#fff" />
            </span>
            <span style={{ fontSize: 30, fontWeight: 800 }}>{nombre ?? "Mi espacio"}</span>
            <span style={{ fontSize: 30, fontWeight: 700, color: K.gris }}>· {titulo}</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 26, color: K.gris }}>{hora}</span>
          </>
        )}
      </div>
      <div style={{ padding: `${PAD.arriba}px ${PAD.lados}px ${PAD.abajo}px` }}>{children}</div>
    </div>
  );
};

const Encabezado: React.FC<{ e: ElementoApoyo; local: number }> = ({ e, local }) => {
  const K = useTema();
  const t = tituloDe(e.titulo);
  const destacadas = (e.destacar ?? "").toLowerCase().split(/\s+/).map((p) => p.replace(/[¿?¡!,.:]/g, "")).filter(Boolean);
  if (!t.lineas.length) return null;
  return (
    <div style={{ height: t.alto, fontSize: t.tam, fontWeight: 900, lineHeight: 1.12, letterSpacing: "-0.02em", opacity: entra(local, 4), transform: `translateY(${(1 - entra(local, 4)) * 20}px)` }}>
      {t.lineas.map((l, j) => (
        <div key={j} style={{ whiteSpace: "nowrap" }}>
          {l.split(" ").map((p, i) => (
            <span key={i} style={{ color: destacadas.includes(p.replace(/[¿?¡!,.:]/g, "").toLowerCase()) ? K.acento2 : undefined }}>{p} </span>
          ))}
        </div>
      ))}
    </div>
  );
};

type ContenidoProps = { e: ElementoApoyo; m: number[]; local: number };
const activa = (m: number[], i: number, n: number, local: number) => local >= (m[i] ?? 0) && (i === n - 1 || local < (m[i + 1] ?? Infinity));

const Lista: React.FC<ContenidoProps> = ({ e, m, local }) => {
  const K = useTema();
  const n = e.puntos.length;
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {e.puntos.map((it, i) => {
        const d = m[i] ?? 0;
        const v = entra(local, d, 12);
        const lleno = interpolate(local, [d + 4, d + 26], [0, 1], LIMITE);
        const on = activa(m, i, n, local);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, height: 120, boxSizing: "border-box", padding: "0 26px", borderRadius: 20, background: on ? `${K.acento}22` : K.caja, border: `2px solid ${on ? K.acento : K.linea}`, opacity: 0.35 + 0.65 * v, transform: `translateX(${(1 - v) * -30}px)` }}>
            <span style={{ fontFamily: MONO, fontSize: 30, color: K.gris, width: 46 }}>{String(i + 1).padStart(2, "0")}</span>
            <Icono nombre={it.icono} defecto="circle-dot" tam={46} color={on ? K.acento2 : K.texto} />
            <span style={{ fontSize: it.texto.length > 22 ? 34 : 40, fontWeight: 800, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.texto}</span>
            <div style={{ width: 150, height: 14, borderRadius: 8, background: K.linea, overflow: "hidden" }}><div style={{ width: `${lleno * 100}%`, height: "100%", background: K.acento }} /></div>
            <span style={{ width: 44, opacity: lleno >= 1 ? 1 : 0, transform: `scale(${lleno >= 1 ? 1 : 0.4})` }}><Icono nombre="check" defecto="check" tam={40} color={K.verde} /></span>
          </div>
        );
      })}
    </div>
  );
};

const Chips: React.FC<ContenidoProps> = ({ e, m, local }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const huecos = Math.max(4, Math.ceil(e.puntos.length / 2) * 2);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {Array.from({ length: huecos }, (_, i) => {
        const it = e.puntos[i];
        const v = it ? spring({ frame: local - (m[i] ?? 0), fps, config: { damping: 11 } }) : 0;
        return (
          <div key={i} style={{ position: "relative", height: 250, borderRadius: 22, background: K.caja, border: `2px solid ${K.linea}`, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 26, top: 26, width: 150, height: 16, borderRadius: 8, background: K.linea }} />
            <div style={{ position: "absolute", left: 26, top: 54, width: 100, height: 16, borderRadius: 8, background: K.linea }} />
            {it ? (
              <div style={{ position: "absolute", inset: 0, padding: 26, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10, background: `linear-gradient(160deg, ${K.acentoOscuro}66, ${K.caja} 70%)`, borderRadius: 20, border: `2px solid ${K.acento}`, opacity: Math.min(1, v), transform: `scale(${0.7 + 0.3 * v})` }}>
                <span style={{ position: "absolute", top: 22, right: 24 }}><Icono nombre={it.icono} defecto="sparkles" tam={78} color={K.acento2} /></span>
                <span style={{ fontSize: it.texto.length > 18 ? 34 : 40, fontWeight: 900, lineHeight: 1.1 }}>{it.texto}</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const Tarjetas: React.FC<ContenidoProps> = ({ e, m, local }) => {
  const K = useTema();
  const n = e.puntos.length;
  const raya = <div style={{ height: 14, background: `repeating-linear-gradient(90deg, ${K.linea} 0 22px, transparent 22px 40px)` }} />;
  return (
    <div style={{ height: 520, boxSizing: "border-box", background: "#0f0f14", borderRadius: 18, padding: "22px 18px", border: `2px solid ${K.linea}`, display: "flex", flexDirection: "column", gap: 14 }}>
      {raya}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(2, n)}, 1fr)`, gap: 16, height: 420 }}>
        {e.puntos.map((it, i) => {
          const v = entra(local, m[i] ?? 0, 12);
          const on = activa(m, i, n, local);
          return (
            <div key={i} style={{ position: "relative", borderRadius: 16, background: v > 0 ? "linear-gradient(180deg, #24242e, #16161c)" : "#18181f", border: `3px solid ${on ? K.acento : K.linea}`, overflow: "hidden" }}>
              <span style={{ position: "absolute", top: 12, right: 12, padding: "4px 12px", borderRadius: 8, background: K.papel, color: K.tinta, fontFamily: MONO, fontWeight: 700, fontSize: 26 }}>{i + 1}</span>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 18, opacity: v, transform: `translateY(${(1 - v) * 24}px)` }}>
                <Icono nombre={it.icono} defecto="star" tam={n > 2 ? 92 : 110} color={on ? K.acento2 : K.texto} />
                <span style={{ fontSize: n > 2 ? 32 : 40, fontWeight: 900, textAlign: "center", lineHeight: 1.1 }}>{it.texto}</span>
              </div>
              {on && n === 2 ? <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "8px 0", background: K.acento, color: "#fff", textAlign: "center", fontWeight: 900, fontSize: 28, letterSpacing: "0.04em" }}>{i === 0 ? "ANTES" : "DESPUÉS"}</span> : null}
            </div>
          );
        })}
      </div>
      {raya}
    </div>
  );
};

// Lo que dice la persona, escrito al ritmo de su voz, con una onda de sonido.
const Guion: React.FC<{ dichas: NonNullable<ElementoEnEditado["dichas"]>; local: number; dur: number }> = ({ dichas, local, dur }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const dichasYa = dichas.filter((p) => p.frame <= local);
  // Solo los últimos renglones (unas 70 letras), para que no se salga del papel.
  let texto = dichasYa.map((p) => p.texto).join(" ");
  if (texto.length > 90) texto = `…${texto.slice(texto.indexOf(" ", texto.length - 90))}`;
  const hablando = dichas.some((p) => local >= p.frame && local <= p.hasta + 4);
  const t = local / fps;
  return (
    <div style={{ height: 450, boxSizing: "border-box", borderRadius: 24, background: K.papel, color: K.tinta, padding: "26px 30px", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 800 }}>
        <span>Guion</span><span style={{ fontFamily: MONO, fontWeight: 500, color: "#8a8794" }}>00:{String(Math.floor(t)).padStart(2, "0")}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, height: 90, margin: "14px 0 18px" }}>
        {Array.from({ length: 58 }, (_, i) => {
          const base = 0.25 + 0.75 * random(`o${i}`);
          const mov = hablando ? 0.55 + 0.45 * Math.abs(Math.sin(local / 3 + i * 0.7)) : 0.25;
          return <span key={i} style={{ flex: 1, height: `${base * mov * 100}%`, borderRadius: 3, background: K.tinta, opacity: i / 58 < local / dur ? 0.9 : 0.35 }} />;
        })}
      </div>
      <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.3 }}>
        {texto}<span style={{ display: "inline-block", width: 18, height: 44, marginLeft: 6, verticalAlign: "text-bottom", background: K.tinta, opacity: Math.floor(local / 10) % 2 }} />
      </div>
    </div>
  );
};

const Aviso: React.FC<{ e: ElementoApoyo; local: number }> = ({ e, local }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const s = spring({ frame: local - 6, fps, config: { damping: 10 } });
  const sub = e.escenario?.sub ?? null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, padding: "30px 0 10px", textAlign: "center" }}>
      <div style={{ width: 230, height: 230, borderRadius: "50%", display: "grid", placeItems: "center", background: `${K.acento}22`, border: `4px solid ${K.acento}`, transform: `scale(${0.4 + 0.6 * s})`, boxShadow: `0 0 80px ${K.acento}55` }}>
        <Icono nombre={e.icono} defecto="zap" tam={120} color={K.acento2} />
      </div>
      {sub ? <div style={{ fontSize: 40, lineHeight: 1.3, color: K.suave, fontWeight: 700, maxWidth: 840, opacity: entra(local, 18) }}>{sub}</div> : null}
    </div>
  );
};

const Cierre: React.FC<ContenidoProps & { clic: number }> = ({ e, m, local, clic }) => {
  const K = useTema();
  const apretado = local >= clic && local < clic + 6;
  const hecho = local >= clic + 6;
  return (
    <div>
      {e.puntos.map((it, i) => {
        const v = entra(local, m[i] ?? 0, 12);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, height: 52, marginBottom: 24, fontSize: 40, fontWeight: 800, opacity: v, transform: `translateX(${(1 - v) * -24}px)` }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, background: K.acento, display: "grid", placeItems: "center" }}><Icono nombre="check" defecto="check" tam={32} color="#fff" /></span>
            <Icono nombre={it.icono} defecto="circle-dot" tam={40} color={K.acento2} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.texto}</span>
          </div>
        );
      })}
      <div style={{ marginTop: 10, height: 130, borderRadius: 24, display: "flex", gap: 16, alignItems: "center", justifyContent: "center", fontSize: 50, fontWeight: 900, background: hecho ? K.verde : K.papel, color: K.tinta, transform: `scale(${apretado ? 0.95 : 1 + (hecho ? 0 : 0.015 * Math.sin(local / 5))})`, boxShadow: hecho ? `0 0 60px ${K.verde}66` : "none" }}>
        {hecho ? <Icono nombre="check" defecto="check" tam={50} color={K.tinta} /> : null}
        {hecho ? "Listo" : e.escenario?.sub || "Escríbeme"}
      </div>
    </div>
  );
};

// La web armándose por bloques: cada punto es una sección que aparece cuando se nombra.
const Web: React.FC<ContenidoProps> = ({ e, m, local }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const hero = entra(local, 4, 14);
  const c = cols(e.puntos.length, 3);
  const titulo = tituloDe(e.titulo);
  return (
    <div style={{ borderRadius: 18, overflow: "hidden", background: K.papel, color: K.tinta }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: 72, boxSizing: "border-box", padding: "0 24px", borderBottom: "2px solid #e5dccf" }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: K.acento }} />
        <span style={{ fontWeight: 900, fontSize: 30 }}>{e.escenario?.nombre ?? "Inicio"}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 18, fontSize: 22, color: "#8b7d74", fontWeight: 700 }}><span>Inicio</span><span>Productos</span><span>Contacto</span></span>
      </div>
      <div style={{ position: "relative", height: 230, boxSizing: "border-box", background: `linear-gradient(120deg, ${K.acento}, ${K.acentoOscuro})`, color: "#fff", padding: "30px 30px", opacity: hero, overflow: "hidden" }}>
        <div style={{ fontSize: titulo.lineas.length > 1 ? 40 : 46, fontWeight: 900, lineHeight: 1.05, maxWidth: 560, transform: `translateY(${(1 - hero) * 20}px)` }}>{e.titulo}</div>
        <div style={{ marginTop: 16, display: "inline-block", padding: "10px 24px", borderRadius: 999, background: "#fff", color: K.acentoOscuro, fontWeight: 900, fontSize: 24 }}>Escríbenos</div>
        <div style={{ position: "absolute", right: 30, top: 30, width: 230, height: 170, borderRadius: 18, background: "rgba(255,255,255,.2)", display: "grid", placeItems: "center" }}>
          <Icono nombre={e.icono} defecto="shopping-bag" tam={90} color="#fff" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${c}, 1fr)`, gap: 14, padding: 20 }}>
        {e.puntos.map((it, i) => {
          const v = spring({ frame: local - (m[i] ?? 0), fps, config: { damping: 12 } });
          return (
            <div key={i} style={{ position: "relative", height: 200, borderRadius: 16, background: "#efe6d9", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 16, top: 16, right: 60, height: 14, borderRadius: 7, background: "#e0d4c3" }} />
              <div style={{ position: "absolute", inset: 0, padding: 18, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8, background: "#fff", borderRadius: 16, border: `3px solid ${K.acento}`, opacity: Math.min(1, v), transform: `scale(${0.75 + 0.25 * v})` }}>
                <Icono nombre={it.icono} defecto="sparkles" tam={58} color={K.acento} />
                <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{it.texto}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Un tablero: números que cuentan (solo los que dice la persona), una línea y barras.
const Panel: React.FC<ContenidoProps> = ({ e, m, local }) => {
  const K = useTema();
  const tiles = e.puntos.slice(0, 3);
  const linea = interpolate(local, [10, 70], [0, 1], { ...LIMITE, easing: suave });
  // Una línea que se mueve sin subir siempre (es decorado: no debe sugerir ganancias).
  const puntos = Array.from({ length: 12 }, (_, i) => [i * (840 / 11), 95 + 35 * Math.sin(i * 1.1) + 20 * (random(`g${i}`) - 0.5)]);
  const camino = puntos.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, tiles.length)}, 1fr)`, gap: 14 }}>
        {tiles.map((it, i) => {
          const d = m[i] ?? 0;
          const v = entra(local, d, 10);
          const num = Number(String(it.valor ?? "").replace(/\D/g, "")) || 0;
          const cuenta = Math.round(num * interpolate(local, [d, d + 30], [0, 1], { ...LIMITE, easing: suave }));
          return (
            <div key={i} style={{ height: 163, boxSizing: "border-box", padding: "20px 22px", borderRadius: 18, background: K.caja, border: `2px solid ${local >= d ? K.acento : K.linea}`, opacity: 0.35 + 0.65 * v }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 24, color: K.suave, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden" }}><Icono nombre={it.icono} defecto="circle-dot" tam={24} color={K.suave} />{it.texto}</div>
              <div style={{ fontFamily: MONO, fontSize: 58, fontWeight: 700, color: K.acento2 }}>{num ? cuenta.toLocaleString("es-CO") : it.valor || "—"}</div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 274, boxSizing: "border-box", padding: "20px 24px", borderRadius: 18, background: K.caja, border: `2px solid ${K.linea}` }}>
        <div style={{ fontSize: 24, color: K.suave, fontWeight: 700, marginBottom: 8 }}>{e.escenario?.sub ?? "Así va"}</div>
        <svg width="100%" height={190} viewBox="0 0 840 190">
          {[40, 90, 140].map((y) => <line key={y} x1={0} x2={840} y1={y} y2={y} stroke={K.linea} strokeWidth={2} />)}
          <path d={camino} fill="none" stroke={K.acento} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - linea} />
          {puntos.map(([x, y], i) => (i / 11 <= linea ? <circle key={i} cx={x} cy={y} r={7} fill={K.acento2} /> : null))}
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120, padding: "0 8px" }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} style={{ flex: 1, borderRadius: "8px 8px 0 0", background: i % 3 === 0 ? K.acento : K.linea, height: `${(25 + 75 * random(`b${i}`)) * entra(local, 20 + i * 3, 14)}%` }} />
        ))}
      </div>
    </div>
  );
};

// Contactos que entran como "Nuevo" y avanzan de columna.
const Crm: React.FC<ContenidoProps> = ({ e, m, local }) => {
  const K = useTema();
  const n = e.puntos.length;
  const colW = (UTIL - 28) / 3;
  return (
    <div style={{ position: "relative", height: 80 + Math.max(3, n) * 118 }}>
      {COLUMNAS_CRM.map((c, j) => (
        <div key={c} style={{ position: "absolute", left: j * (colW + 14), top: 0, width: colW, bottom: 0, borderRadius: 18, background: K.caja, border: `2px solid ${K.linea}` }}>
          <div style={{ padding: "16px 18px", fontSize: 26, fontWeight: 900, color: j === 2 ? K.verde : K.suave }}>{c}</div>
        </div>
      ))}
      {e.puntos.map((it, i) => {
        const d = m[i] ?? 0;
        const v = entra(local, d, 10);
        const llega = i < Math.ceil(n / 2);
        const paso = interpolate(local, [d + 18, d + 32], [0, 1], { ...LIMITE, easing: suave }) + (llega ? interpolate(local, [d + 46, d + 60], [0, 1], { ...LIMITE, easing: suave }) : 0);
        const mueve = (local > d + 18 && local < d + 32) || (llega && local > d + 46 && local < d + 60);
        return (
          <div key={i} style={{ position: "absolute", left: 10 + paso * (colW + 14), top: 70 + i * 118, width: colW - 20, height: 100, boxSizing: "border-box", borderRadius: 14, background: "#2a2226", border: `2px solid ${mueve ? K.acento : "#3a2f33"}`, padding: "12px 14px", opacity: v, transform: `translateY(${(1 - v) * 20}px) rotate(${mueve ? -2 : 0}deg)`, boxShadow: mueve ? "0 20px 30px rgba(0,0,0,.5)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", background: ["#ff7a59", "#2f8f83", K.acento, "#e7c15a"][i % 4], display: "grid", placeItems: "center", fontSize: 18, fontWeight: 900, color: "#fff" }}>{it.texto.charAt(0).toUpperCase()}</span>
              <span style={{ fontSize: 24, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.texto}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 20, color: K.suave, whiteSpace: "nowrap", overflow: "hidden" }}>
              <Icono nombre={it.icono} defecto="message-circle" tam={20} color={K.suave} />{it.valor ?? "por WhatsApp"}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Etiqueta inclinada que salta encima de la ventana (como un sticker).
const Sticker: React.FC<{ texto: string; desde: number; local: number; y: number }> = ({ texto, desde, local, y }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const s = spring({ frame: local - desde, fps, config: { damping: 9, stiffness: 160 } });
  if (local < desde) return null;
  return (
    <div style={{ position: "absolute", right: 24, top: y, maxWidth: ANCHO - 120, overflow: "hidden", textOverflow: "ellipsis", padding: "14px 34px", borderRadius: 18, background: K.acento, color: "#fff", fontFamily: K.fuente, fontWeight: 900, fontSize: texto.length > 10 ? 44 : 56, letterSpacing: "0.02em", whiteSpace: "nowrap", transform: `rotate(-6deg) scale(${s})`, boxShadow: "0 16px 40px rgba(0,0,0,.5)", border: "4px solid #fff" }}>{texto}</div>
  );
};

// Cursor que va a cada cosa cuando se nombra y "hace clic".
const Cursor: React.FC<{ objetivos: Objetivo[]; local: number; inicio: { x: number; y: number } }> = ({ objetivos, local, inicio }) => {
  const K = useTema();
  if (!objetivos.length) return null;
  const puntos = [{ f: 0, ...inicio }, ...objetivos.map((o) => ({ ...o, f: Math.max(4, o.f - 10) }))];
  let k = 0;
  puntos.forEach((p, i) => { if (local >= p.f) k = i; });
  const de = puntos[k], a = puntos[Math.min(puntos.length - 1, k + 1)];
  const v = a === de ? 1 : interpolate(local, [a.f - 14, a.f], [0, 1], { ...LIMITE, easing: suave });
  const x = de.x + (a.x - de.x) * v, y = de.y + (a.y - de.y) * v;
  const pasados = objetivos.filter((o) => o.clic && local >= o.f);
  const ultimo = pasados.at(-1);
  const onda = ultimo ? local - ultimo.f : 99;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: entra(local, 2, 10) }}>
      {ultimo && onda < 14 ? <div style={{ position: "absolute", left: ultimo.x - 40 - onda * 2, top: ultimo.y - 40 - onda * 2, width: 80 + onda * 4, height: 80 + onda * 4, borderRadius: "50%", border: `4px solid ${K.acento2}`, opacity: 1 - onda / 14 }} /> : null}
      <svg width={70} height={84} viewBox="0 0 24 29" style={{ position: "absolute", left: x, top: y, transform: `scale(${onda < 5 ? 0.85 : 1})`, transformOrigin: "0 0", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.6))" }}>
        <path d="M1 1 L1 22 L7 16.5 L11 26 L15 24.3 L11 15 L19 15 Z" fill={K.acento} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

// Globo de diálogo del personaje (pantalla "mundo").
const Globo: React.FC<{ texto: string; local: number; x: number; y: number; escala: number; ancho: number }> = ({ texto, local, x, y, escala, ancho }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const s = spring({ frame: local - 4, fps, config: { damping: 12 } });
  const n = Math.floor(interpolate(local, [6, 6 + texto.length * 0.9], [0, texto.length], LIMITE));
  const lado = Math.max(70 * (ancho / 1080), 40 * escala);
  const w = Math.min(640 * escala, ancho - lado * 2);
  const izq = Math.min(ancho - lado - w, Math.max(lado, x - w / 2));
  return (
    <div style={{ position: "absolute", left: izq, top: y, width: w, transform: `translateY(-100%) scale(${s})`, transformOrigin: `${x - izq}px 100%` }}>
      <div style={{ padding: `${24 * escala}px ${30 * escala}px`, borderRadius: 30 * escala, background: "#fffaf3", color: "#1d1517", fontFamily: K.fuente, fontWeight: 800, fontSize: 42 * escala, lineHeight: 1.2, boxShadow: "0 20px 50px rgba(0,0,0,.45)", border: `${4 * escala}px solid #1d1517` }}>
        {texto.slice(0, n)}<span style={{ opacity: n < texto.length ? 1 : 0 }}>▍</span>
      </div>
      <div style={{ marginLeft: Math.max(30 * escala, Math.min(w - 60 * escala, x - izq - 22 * escala)), width: 0, height: 0, borderLeft: `${22 * escala}px solid transparent`, borderRight: `${22 * escala}px solid transparent`, borderTop: `${30 * escala}px solid #1d1517` }} />
    </div>
  );
};

// ---------------- Lienzos: pantallas que no son una sola ventana ----------------
// golpe (texto que golpea), mosaico (2×2 ventanitas y un título final), perfil (un celular con un
// perfil de redes y una tarjeta de pasos) y proceso (2×2 tarjetas: guion, voz, dibujo, música).
// Se diseñan en su propio lienzo y se escalan a la zona libre dejando margen a los lados.
const LIENZOS = ["golpe", "mosaico", "perfil", "proceso"] as const;
type Lienzo = (typeof LIENZOS)[number];
const esLienzo = (p: Escenario["pantalla"]): p is Lienzo => (LIENZOS as readonly string[]).includes(p);
// Medidas del lienzo (vertical y horizontal).
const MEDIDA: Record<Lienzo, { v: [number, number]; h: [number, number] }> = {
  golpe: { v: [940, 900], h: [1500, 640] },
  mosaico: { v: [940, 1080], h: [1840, 540] },
  perfil: { v: [940, 960], h: [1240, 820] },
  proceso: { v: [940, 1080], h: [1840, 540] },
};
const VISTAS_DE: Record<"mosaico" | "proceso", NonNullable<Escenario["vistas"]>> = {
  mosaico: ["tienda", "reservas", "panel", "crm"],
  proceso: ["guion", "voz", "dibujo", "musica"],
};
// Redondea escalas y giros: valores diminutos (1e-7) dentro de un lienzo escalado hacían caer
// el render de Chrome con íconos SVG en 16:9.
const rd = (x: number) => Math.round(x * 1000) / 1000;
// Letras de un texto que caben en un ancho (para bajar el tamaño antes de tocar el borde).
const tamQueCabe = (texto: string, ancho: number, maximo: number, factor = 0.66) =>
  Math.max(28, Math.min(maximo, ancho / Math.max(1, texto.length * factor)));
// Momentos de los puntos, sin pasar del punto en que todavía queda tiempo para leer lo último.
export const momentosLegibles = (m: number[], n: number, dur: number, fps: number) => {
  const tope = Math.max(8, dur - Math.round(fps * 1.8));
  return Array.from({ length: n }, (_, i) => Math.min(m[i] ?? 10 + i * 14, tope - (n - 1 - i) * 4));
};
// Cuándo sale el título del final del mosaico: un poco después de la última ventana y con al
// menos 1.8 s para leerlo.
const finalMosaico = (m: number[], dur: number, fps: number) =>
  Math.max(10, Math.min(dur - Math.round(fps * 1.8), Math.max((m.at(-1) ?? 0) + Math.round(fps * 0.9), Math.round(dur * 0.55))));

const Mini: React.FC<{ titulo: string; icono: string; x: number; y: number; w: number; h: number; v: number; rot?: number; children: React.ReactNode }> = ({ titulo, icono, x, y, w, h, v, rot = 0, children }) => {
  const K = useTema();
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 26, background: K.ventana, border: `2px solid ${K.linea}`, overflow: "hidden", boxShadow: `0 30px 80px rgba(0,0,0,.6), 0 0 50px ${K.acento}22`, opacity: Math.min(1, v), transform: `translateY(${rd((1 - v) * 80)}px) scale(${rd(0.85 + 0.15 * v)}) rotate(${rd((1 - v) * rot)}deg)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, height: 56, boxSizing: "border-box", padding: "0 18px", background: K.barra, borderBottom: `2px solid ${K.linea}` }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 13, height: 13, borderRadius: "50%", background: c, flexShrink: 0 }} />)}
        <Icono nombre={icono} defecto="sparkles" tam={22} color={K.acento2} />
        <span style={{ fontSize: 24, fontWeight: 800, color: K.suave, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</span>
      </div>
      <div style={{ position: "relative", height: h - 56 }}>{children}</div>
    </div>
  );
};

// ----- golpe: cada renglón golpea la pantalla cuando se dice -----
const Golpe: React.FC<{ e: ElementoApoyo; m: number[]; local: number; W: number }> = ({ e, m, local, W }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const destacadas = (e.destacar ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const ultimo = m.reduce((k, d, i) => (local >= d ? i : k), -1);
  const temblor = ultimo >= 0 && local - m[ultimo] < 6 ? (6 - (local - m[ultimo])) * 3 : 0;
  const glitch = local % 9 < 2 ? 7 : 0;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 6, transform: `translate(${(random(`gx${local}`) - 0.5) * temblor}px, ${(random(`gy${local}`) - 0.5) * temblor}px)` }}>
      {e.puntos.map((p, i) => {
        if (local < (m[i] ?? 0)) return <div key={i} style={{ height: 0 }} />;
        const fuerte = destacadas.some((d) => p.texto.toLowerCase().includes(d)) || (!destacadas.length && i === e.puntos.length - 1);
        const tam = tamQueCabe(p.texto, W * 0.94, fuerte ? 160 : 112, 0.8);
        const s = spring({ frame: local - (m[i] ?? 0), fps, config: { damping: 9, stiffness: 260 } });
        const color = fuerte ? K.acento2 : K.texto;
        return (
          <div key={i} style={{ maxWidth: W, fontSize: tam, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", textAlign: "center", textTransform: "uppercase", color, whiteSpace: "nowrap", transform: `scale(${interpolate(s, [0, 1], [2.4, 1])})`, opacity: Math.min(1, s * 1.4), textShadow: `${glitch}px 0 #ff4f8b, ${-glitch}px 0 #4fd8ff, 0 0 50px ${color}55` }}>{p.texto}</div>
        );
      })}
    </div>
  );
};

// ----- mosaico: tienda, reservas, panel y CRM; al final, el título grande -----
const VTienda: React.FC<{ local: number; d: number; w: number }> = ({ local, d, w }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const vuela = interpolate(local, [d + 14, d + 30], [0, 1], LIMITE);
  const carrito = local > d + 30 ? 1 + Math.floor((local - d - 30) / 25) : 0;
  const lado = (w - 54) / 2;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 18 }}>
        {["shopping-bag", "headphones", "watch", "shirt"].map((ic, i) => (
          <div key={ic} style={{ height: Math.min(lado, 190), borderRadius: 16, background: K.caja, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ transform: i === 0 ? `translate(${vuela * lado * 0.9}px, ${-vuela * 130}px) scale(${1 - vuela * 0.7})` : undefined, opacity: i === 0 && vuela >= 1 ? 0 : 1 }}><Icono nombre={ic} defecto="package" tam={60} color={K.acento2} /></span>
            <span style={{ padding: "6px 16px", borderRadius: 10, background: K.acento, color: "#fff", fontWeight: 800, fontSize: 20 }}>Agregar</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 18, top: -46 }}>
        <Icono nombre="shopping-cart" defecto="shopping-cart" tam={30} color={K.texto} />
        {carrito ? <span style={{ position: "absolute", right: -12, top: -8, minWidth: 26, height: 26, borderRadius: 13, background: K.acento, color: "#fff", fontSize: 17, fontWeight: 900, display: "grid", placeItems: "center", transform: `scale(${spring({ frame: local - d - 30, fps, config: { damping: 8, stiffness: 260 } })})` }}>{carrito}</span> : null}
      </div>
    </>
  );
};
const VReservas: React.FC<{ local: number; d: number }> = ({ local, d }) => {
  const K = useTema();
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {Array.from({ length: 15 }, (_, i) => {
          const k = [2, 6, 9, 13].indexOf(i);
          const on = k >= 0 && local > d + 8 + k * 6;
          return <div key={i} style={{ height: 50, borderRadius: 10, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22, background: on ? K.acento : K.caja, color: on ? "#fff" : K.suave }}>{i + 10}</div>;
        })}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        {["9:00", "10:30", "15:00"].map((h, i) => {
          const on = i === 1 && local > d + 30;
          return <span key={h} style={{ padding: "8px 14px", borderRadius: 12, border: `2px solid ${K.acento}`, fontWeight: 800, fontSize: 22, background: on ? K.acento : "transparent", color: on ? "#fff" : K.texto }}>{h}</span>;
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, fontSize: 24, fontWeight: 800, color: K.verde, opacity: entra(local, d + 34) }}>
        <Icono nombre="circle-check" defecto="check" tam={26} color={K.verde} />Cita confirmada
      </div>
    </div>
  );
};
const VPanel: React.FC<{ local: number; d: number }> = ({ local, d }) => {
  const K = useTema();
  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", gap: 10 }}>
        {["Visitas", "Pedidos", "Citas"].map((n, i) => (
          <div key={n} style={{ flex: 1, padding: "12px 12px", borderRadius: 14, background: K.caja }}>
            <div style={{ fontSize: 19, color: K.suave, fontWeight: 700 }}>{n}</div>
            <div style={{ marginTop: 10, height: 10, borderRadius: 5, background: K.linea, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(45 + 40 * random(`pn${i}`)) * entra(local, d + i * 5, 24)}%`, background: K.acento2 }} />
            </div>
          </div>
        ))}
      </div>
      {/* Barras que suben y bajan (decorado: no sugiere ganancias) */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 250, marginTop: 22 }}>
        {[55, 80, 50, 75, 60, 85, 65].map((h, i) => <span key={i} style={{ flex: 1, borderRadius: "8px 8px 0 0", background: i % 2 ? K.acento : K.acento2, height: `${h * entra(local, d + i * 3, 12)}%` }} />)}
      </div>
    </div>
  );
};
const VCrm: React.FC<{ local: number; d: number; w: number }> = ({ local, d, w }) => {
  const K = useTema();
  const col = (w - 32 - 16) / 3;
  const nombres = ["Ana", "Luis", "Sara", "Juan"];
  return (
    <div style={{ position: "relative", height: "100%" }}>
      {["Nuevo", "Contacto", "Cliente"].map((c, j) => (
        <div key={c} style={{ position: "absolute", left: 16 + j * (col + 8), top: 14, width: col, bottom: 14, borderRadius: 14, background: K.caja }}>
          <div style={{ padding: "10px 0", textAlign: "center", fontSize: 19, fontWeight: 900, color: j === 2 ? K.verde : K.suave }}>{c}</div>
        </div>
      ))}
      {nombres.map((n, i) => {
        const paso = Math.min(2, Math.max(0, Math.floor((local - d - 10 - i * 6) / 22)));
        const x = interpolate(local, [d + 10 + i * 6 + paso * 22 - 8, d + 10 + i * 6 + paso * 22], [Math.max(0, paso - 1), paso], LIMITE);
        return (
          <div key={n} style={{ position: "absolute", left: 16 + 6 + x * (col + 8), top: 66 + i * 86, width: col - 12, padding: "12px 0", borderRadius: 12, textAlign: "center", fontSize: 22, fontWeight: 900, background: paso === 2 ? K.verde : K.linea, color: paso === 2 ? K.tinta : K.texto, opacity: entra(local, d + i * 3) }}>{n}</div>
        );
      })}
    </div>
  );
};
const Mosaico: React.FC<{ e: ElementoApoyo; m: number[]; local: number; dur: number; horizontal: boolean; W: number; H: number }> = ({ e, m, local, dur, horizontal, W, H }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const vistas = e.escenario?.vistas?.length ? e.escenario.vistas : VISTAS_DE.mosaico;
  const n = e.puntos.length;
  const fin = finalMosaico(m, dur, fps);
  const v = spring({ frame: local - fin, fps, config: { damping: 12, stiffness: 140 } });
  const gap = horizontal ? 24 : 30;
  const w = horizontal ? (W - gap * (n - 1)) / n : (W - gap) / 2;
  const h = horizontal ? H : (H - gap) / 2;
  const icono: Record<string, string> = { tienda: "shopping-cart", reservas: "calendar", panel: "chart-column", crm: "users", guion: "file-text", voz: "mic", dibujo: "brush", musica: "eighth-notes" };
  const titulo = e.titulo ?? "";
  const palabras = titulo.split(/\s+/);
  const corte = Math.ceil(palabras.length / 2);
  const lineas = titulo.length > 14 && palabras.length > 1 ? [palabras.slice(0, corte).join(" "), palabras.slice(corte).join(" ")] : [titulo];
  const tam = Math.min(...lineas.map((l) => tamQueCabe(l, W * 0.92, horizontal ? 120 : 104)));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.68 * Math.min(1, v), filter: local >= fin ? `blur(${Math.min(1, v) * 3}px)` : undefined, transform: `scale(${1 - 0.06 * Math.min(1, v)})` }}>
        {e.puntos.map((p, i) => {
          const d = m[i] ?? 0;
          const x = horizontal ? i * (w + gap) : (i % 2) * (w + gap);
          const y = horizontal ? 0 : Math.floor(i / 2) * (h + gap);
          const vista = vistas[i % vistas.length];
          const vi = spring({ frame: local - d, fps, config: { damping: 12, stiffness: 150 } });
          return (
            <Mini key={i} titulo={p.texto} icono={p.icono ?? icono[vista] ?? "sparkles"} x={x} y={y} w={w} h={h} v={vi} rot={i % 2 ? 7 : -7}>
              {vista === "tienda" ? <VTienda local={local} d={d} w={w} /> : vista === "reservas" ? <VReservas local={local} d={d} /> : vista === "panel" ? <VPanel local={local} d={d} /> : <VCrm local={local} d={d} w={w} />}
            </Mini>
          );
        })}
      </div>
      {local >= fin ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", transform: `scale(${interpolate(Math.min(1, v), [0, 1], [1.3, 1])})`, opacity: Math.min(1, v * 1.5) }}>
          {lineas.map((l, i) => (
            <div key={i} style={{ fontSize: tam, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", textTransform: "uppercase", whiteSpace: "nowrap", color: i === lineas.length - 1 ? K.acento2 : K.texto, textShadow: `0 0 50px ${K.acento}` }}>{l}</div>
          ))}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 14, marginTop: 30, maxWidth: W }}>
            {e.puntos.map((p, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 24px", borderRadius: 999, background: K.ventana, border: `3px solid ${i % 2 ? K.acento2 : K.acento}`, fontSize: 32, fontWeight: 800, color: K.texto, transform: `scale(${spring({ frame: local - fin - 6 - i * 4, fps, config: { damping: 10, stiffness: 220 } })})` }}>
                <Icono nombre={p.icono ?? icono[vistas[i % vistas.length]]} defecto="sparkles" tam={30} color={K.acento2} />{p.texto}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
};

// ----- perfil: celular con un perfil de redes que se llena de videos y una tarjeta de pasos -----
const Perfil: React.FC<{ e: ElementoApoyo; m: number[]; local: number; horizontal: boolean; W: number; H: number }> = ({ e, m, local, horizontal, W, H }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const tel = spring({ frame: local, fps, config: { damping: 13 } });
  const telW = 430, telH = horizontal ? H : 900;
  const cardX = horizontal ? telW + 70 : 390;
  const cardW = W - cardX;
  const handle = `@${(e.escenario?.nombre ?? "tu.cuenta").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9._]/g, "")}`;
  const colores = [K.acento, K.acento2, K.acentoOscuro, K.verde, mezclar(K.acento, "#ff7a59", 0.5), mezclar(K.acento2, "#4fd8ff", 0.5)];
  const iconos = ["clapperboard", "mic", "sparkles", "book-open", "palette", "lightbulb"];
  const desde = (m[0] ?? 10) - 6;
  const titulo = e.titulo ?? "";
  const tamT = Math.min(46, tamQueCabe(titulo, (cardW - 56) * 2, 46, 0.6));
  const vc = entra(local, Math.max(4, desde), 14);
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: horizontal ? 0 : 20, width: telW, height: telH, boxSizing: "border-box", borderRadius: 56, background: "#111018", border: "10px solid #2a2836", boxShadow: "0 40px 100px rgba(0,0,0,.7)", overflow: "hidden", transform: `translateX(${rd((1 - tel) * -500)}px) rotate(${rd((1 - tel) * -10 - 3)}deg)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "42px 22px 16px" }}>
          <div style={{ width: 90, height: 90, flexShrink: 0, borderRadius: "50%", padding: 5, background: `linear-gradient(45deg, ${K.acento2}, ${K.acento})` }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#111018", display: "grid", placeItems: "center" }}><Icono nombre={e.icono} defecto="user" tam={42} color={K.acento2} /></div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 28, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{handle}</div>
            <div style={{ fontSize: 20, color: K.suave }}>creando contenido</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, padding: "8px 5px" }}>
          {Array.from({ length: 12 }, (_, i) => {
            const v = spring({ frame: local - desde - i * 3, fps, config: { damping: 12, stiffness: 200 } });
            return (
              <div key={i} style={{ position: "relative", height: 180, borderRadius: 8, background: `linear-gradient(160deg, ${colores[i % 6]}, #1a1626)`, transform: `scale(${rd(v)})`, display: "grid", placeItems: "center" }}>
                <Icono nombre={iconos[i % 6]} defecto="play" tam={48} color="#fff" />
                <span style={{ position: "absolute", left: 8, bottom: 6 }}><Icono nombre="play" defecto="play" tam={18} color="#fff" /></span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: cardX, top: horizontal ? 120 : 380, width: cardW, boxSizing: "border-box", padding: "26px 28px 12px", borderRadius: 28, background: K.ventana, border: `2px solid ${K.acento}`, boxShadow: `0 30px 80px rgba(0,0,0,.6), 0 0 50px ${K.acento}33`, opacity: vc, transform: `translateX(${(1 - vc) * 260}px)` }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: K.acento2, letterSpacing: "0.06em", textTransform: "uppercase" }}>{e.escenario?.sub ?? "Paso a paso"}</div>
        {titulo ? <div style={{ fontSize: tamT, fontWeight: 900, lineHeight: 1.15, margin: "8px 0 18px" }}>{titulo}</div> : null}
        {e.puntos.map((p, i) => {
          const v = spring({ frame: local - (m[i] ?? 0), fps, config: { damping: 11, stiffness: 180 } });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, opacity: Math.min(1, v * 1.5), transform: `translateX(${(1 - Math.min(1, v)) * 50}px)` }}>
              <span style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: "grid", placeItems: "center", background: K.verde, transform: `scale(${v})` }}><Icono nombre="check" defecto="check" tam={28} color={K.tinta} /></span>
              <span style={{ fontSize: p.texto.length > 24 ? 26 : 30, fontWeight: 700, lineHeight: 1.2 }}>{p.texto}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ----- proceso: guion que se escribe, voz, dibujo que se pinta y música -----
const PIXELES = 14;
const Proceso: React.FC<{ e: ElementoApoyo; m: number[]; local: number; horizontal: boolean; W: number; H: number; dichas: NonNullable<ElementoEnEditado["dichas"]> }> = ({ e, m, local, horizontal, W, H, dichas }) => {
  const K = useTema();
  const { fps } = useVideoConfig();
  const vistas = e.escenario?.vistas?.length ? e.escenario.vistas : VISTAS_DE.proceso;
  const n = e.puntos.length;
  const gap = horizontal ? 24 : 30;
  const w = horizontal ? (W - gap * (n - 1)) / n : (W - gap) / 2;
  const h = horizontal ? H : (H - gap) / 2;
  const icono: Record<string, string> = { guion: "file-text", voz: "mic", dibujo: "brush", musica: "eighth-notes", tienda: "shopping-cart", reservas: "calendar", panel: "chart-column", crm: "users" };
  return (
    <>
      {e.puntos.map((p, i) => {
        const d = m[i] ?? 0;
        const x = horizontal ? i * (w + gap) : (i % 2) * (w + gap);
        const y = horizontal ? 0 : Math.floor(i / 2) * (h + gap);
        const vista = vistas[i % vistas.length];
        const v = spring({ frame: local - d, fps, config: { damping: 13 } });
        let dentro: React.ReactNode = null;
        if (vista === "guion") {
          let texto = dichas.filter((x) => x.frame <= local).map((x) => x.texto).join(" ");
          if (texto.length > 120) texto = `…${texto.slice(texto.indexOf(" ", texto.length - 120))}`;
          dentro = <div style={{ padding: 22, fontFamily: MONO, fontSize: 26, lineHeight: 1.45, color: K.texto }}>{texto || "…"}<span style={{ color: K.acento2, opacity: Math.floor(local / 8) % 2 }}>▍</span></div>;
        } else if (vista === "voz") {
          dentro = (
            <div style={{ position: "absolute", inset: 26, display: "flex", alignItems: "center", gap: 6 }}>
              {Array.from({ length: 28 }, (_, k) => <span key={k} style={{ flex: 1, borderRadius: 6, background: `linear-gradient(180deg, ${K.acento2}, ${K.acento})`, height: `${(12 + 80 * Math.abs(Math.sin(local / 3 + k * 0.6) * random(`w${k}`))) * entra(local, d, 10)}%` }} />)}
            </div>
          );
        } else if (vista === "dibujo") {
          const tam = Math.floor(Math.min(w - 50, h - 110) / PIXELES);
          const pintados = interpolate(local, [d, d + 40], [0, 1], LIMITE);
          dentro = (
            <div style={{ position: "absolute", left: (w - tam * PIXELES) / 2, top: 24, display: "grid", gridTemplateColumns: `repeat(${PIXELES}, ${tam}px)` }}>
              {Array.from({ length: PIXELES * PIXELES }, (_, k) => {
                const cx = k % PIXELES, cy = Math.floor(k / PIXELES);
                let c = mezclar(K.acentoOscuro, "#000000", 0.4 - cy * 0.03);
                if (cy > 9) c = mezclar(K.acentoOscuro, "#000000", 0.55);
                if (cy >= 6 && cy <= 9 && cx >= 3 && cx <= 9) c = cy === 6 ? K.acento : K.caja;
                if (cy >= 7 && cy <= 8 && cx >= 4 && cx <= 5) c = "#ffd99a";
                if ((cx - 11) ** 2 + (cy - 3) ** 2 < 3) c = "#ffd25a";
                const on = random(`px${k}`) < pintados;
                return <span key={k} style={{ width: tam, height: tam, background: c, opacity: on ? 1 : 0.07 }} />;
              })}
            </div>
          );
        } else {
          dentro = (
            <>
              <div style={{ position: "absolute", left: 26, right: 26, bottom: 30, height: "62%", display: "flex", alignItems: "flex-end", gap: 9 }}>
                {Array.from({ length: 11 }, (_, k) => <span key={k} style={{ flex: 1, borderRadius: "8px 8px 0 0", background: k % 3 ? K.acento : K.acento2, height: `${(20 + 80 * Math.abs(Math.sin(local / 4 + k))) * entra(local, d, 8)}%` }} />)}
              </div>
              {[0, 1, 2].map((k) => {
                const c = ((local - d + k * 12) % 36) / 36;
                return local > d ? <span key={k} style={{ position: "absolute", left: 50 + k * (w - 140) / 2, top: 110 - c * 90, opacity: 1 - c }}><Icono nombre="eighth-note" defecto="eighth-notes" tam={44} color={K.acento2} /></span> : null;
              })}
            </>
          );
        }
        return <Mini key={i} titulo={p.texto} icono={p.icono ?? icono[vista]} x={x} y={y} w={w} h={h} v={v} rot={i % 2 ? 8 : -8}>{dentro}</Mini>;
      })}
    </>
  );
};

// Pone el lienzo en la zona libre, escalado y centrado, con margen a los lados.
const LienzoEscena: React.FC<{ e: ElementoApoyo; pantalla: Lienzo; momentos: number[]; local: number; dur: number; area: { x: number; y: number; ancho: number; alto: number }; dichas: NonNullable<ElementoEnEditado["dichas"]> }> = ({ e, pantalla, momentos, local, dur, area, dichas }) => {
  const { width, fps } = useVideoConfig();
  const K = useTema();
  const horizontal = area.ancho > area.alto * 1.25;
  const [W, H] = MEDIDA[pantalla][horizontal ? "h" : "v"];
  const margen = Math.max(70 * (width / 1080), area.x);
  const escala = Math.min((width - margen * 2) / W, (area.alto * 0.96) / H);
  const x = (width - W * escala) / 2;
  const y = area.y + Math.max(0, area.alto - H * escala) * 0.4;
  const m = momentosLegibles(momentos, e.puntos.length, dur, fps);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: W, height: H, transformOrigin: "0 0", transform: `scale(${escala})`, fontFamily: K.fuente, color: K.texto }}>
      {pantalla === "golpe" ? <Golpe e={e} m={m} local={local} W={W} />
        : pantalla === "mosaico" ? <Mosaico e={e} m={m} local={local} dur={dur} horizontal={horizontal} W={W} H={H} />
        : pantalla === "perfil" ? <Perfil e={e} m={m} local={local} horizontal={horizontal} W={W} H={H} />
        : <Proceso e={e} m={m} local={local} horizontal={horizontal} W={W} H={H} dichas={dichas} />}
    </div>
  );
};

// Toma de la cámara: 0 = abierta (todo el mundo), 1 = de cerca (la ventana encima).
const tomaDe = (p: Escenario["pantalla"]) => (p === "mundo" || esLienzo(p) ? 0 : p === "cierre" ? 0.6 : 1);

// ---------------- El escenario completo de una escena ----------------
export const EscenarioAnimado: React.FC<{
  item: ItemEscenario;
  area: { x: number; y: number; ancho: number; alto: number };
  continuidad: Continuidad;
}> = ({ item, area, continuidad }) => {
  const local = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const marca = useMarca();
  const { elemento: e, duracionFrames: dur } = item;
  // Lo último que aparece necesita ~1.8 s para leerse: si se dice muy al final, sale un poco antes.
  const momentos = momentosLegibles(item.momentos, Math.max(item.momentos.length, e.puntos.length), dur, fps);
  // Margen a los lados: ~70 px por cada 1080 de ancho, nunca menos que la zona segura.
  const margen = Math.max(70 * (width / 1080), area.x);
  const ed = e.escenario ?? { mundo: "cuarto", pantalla: "lista", sub: null, nombre: null, abierto: null, busqueda: null, vistas: null };
  const K = temaDe(ed.mundo, marca.colores.primario, marca.fuente);
  const mundo = MUNDOS[ed.mundo];
  const sp = spriteDe(ed.mundo, K);
  const hora = ed.mundo === "cuarto" ? "23:40" : "18:20";
  const dichas = item.dichas ?? [];

  // El mundo (1080×1920) cubre el cuadro, centrado en el foco de la cámara, y sube lo necesario
  // para que el personaje quede parado arriba de los subtítulos (abajo se ve el color del piso).
  const sw = Math.max(width / 1080, height / 1920);
  const ox = (width - 1080 * sw) / 2;
  const [gx, gy, gt] = mundo.personaje;
  const piso = area.y + area.alto;
  const oy = Math.max(
    height - 1920 * sw - 420 * sw,
    Math.min(0, Math.max(height - 1920 * sw, height * 0.55 - mundo.foco[1] * sw), piso - 14 - (gy + 21 * gt) * sw),
  );

  // Cámara: empieza abierta (o donde quedó la escena anterior) y va a la toma de esta pantalla.
  const empieza = continuidad.entra ? 0 : 6;
  const paso = interpolate(local, [empieza, empieza + 18], [0, 1], { ...LIMITE, easing: suave });
  const tomaAntes = continuidad.entra ? (continuidad.cercaAntes ? 1 : 0) : 0;
  const k = tomaAntes + (tomaDe(ed.pantalla) - tomaAntes) * paso;
  // En horizontal la ventana es más chica: la cámara se acerca menos para que el fondo no la tape.
  const zoomCerca = width > height ? 1 + (mundo.zoom - 1) * 0.35 : mundo.zoom;
  const zoom = interpolate(k, [0, 1], [1, zoomCerca]) + (k === 0 ? interpolate(local, [0, dur], [0, 0.04]) : 0);
  const sube = interpolate(zoom, [1, mundo.zoom], [0, mundo.sube], { extrapolateLeft: "clamp" });

  // Luz del negocio (calle): se abre o se cierra en esta escena, o sigue como estaba.
  const luzFinal = ed.abierto === "abrir" ? 1 : ed.abierto === "cerrar" ? 0 : continuidad.luzAntes;
  const luzDesde = ed.abierto === "abrir" ? 0 : continuidad.luzAntes;
  const luz = interpolate(local, [10, 28], [luzDesde, luzFinal], LIMITE);

  // La ventana: cabe en la zona libre (arriba de los subtítulos), con lugar encima para el
  // personaje, que de cerca se para sobre la ventana.
  const lienzo = esLienzo(ed.pantalla) ? ed.pantalla : null;
  const conVentana = ed.pantalla !== "mundo" && !lienzo;
  const titulo = ed.pantalla === "web" ? { alto: 0 } : tituloDe(e.titulo);
  const arribaContenido = BARRA + PAD.arriba + titulo.alto;
  const alto = arribaContenido + altoContenido(ed.pantalla, e.puntos.length, ed.sub) + PAD.abajo;
  const TAM = 8;
  const reserva = 21 * TAM + 10;
  const escala = Math.min((width - margen * 2) / ANCHO, (area.alto * 0.97) / (alto + reserva));
  const izqV = (width - ANCHO * escala) / 2;
  const arribaV = area.y + reserva * escala + Math.max(0, area.alto - (alto + reserva) * escala) * 0.3;
  const desdeVentana = continuidad.entra ? 4 : 14;
  const lv = local - desdeVentana;
  const clicCierre = Math.round(dur * 0.55) - desdeVentana;
  const objetivos = objetivosDe(ed.pantalla, e.puntos, momentos.map((m) => m - desdeVentana), arribaContenido, clicCierre);

  // Personaje: en la toma abierta, parado en el mundo; de cerca, parado sobre la ventana.
  const amplio = { x: ox + gx * sw, y: oy + gy * sw, tam: gt * sw };
  const tamCerca = TAM * escala;
  const cerca = { x: izqV + (ANCHO - 16 * TAM - 50) * escala, y: arribaV - 21 * tamCerca + 3 * escala, tam: tamCerca };
  // El personaje va a la ventana cuando hay ventana (aunque la cámara quede a medio camino).
  const antesP = continuidad.entra && continuidad.cercaAntes ? 1 : 0;
  const kp = antesP + ((conVentana ? 1 : 0) - antesP) * paso;
  const px = interpolate(kp, [0, 1], [amplio.x, cerca.x]);
  const py = interpolate(kp, [0, 1], [amplio.y, cerca.y]);
  const pt = interpolate(kp, [0, 1], [amplio.tam, cerca.tam]);
  const salto = momentos.reduce((s, d) => Math.max(s, local >= d && local < d + 10 ? Math.sin(((local - d) / 10) * Math.PI) : 0), 0);
  const habla = ed.pantalla === "mundo" && dichas.some((p) => local >= p.frame && local <= p.hasta) ? Math.abs(Math.sin(local / 3)) * 0.25 : 0;
  const saluda = (ed.pantalla === "mundo" && local < dur * 0.5) || ed.pantalla === "cierre";

  const destacada = (e.destacar ?? "").split(/\s+/)[0];
  const sticker =
    ed.pantalla === "aviso" ? { texto: (destacada || "ojo").toUpperCase(), desde: 14, y: arribaContenido + 70 }
    : ed.pantalla === "cierre" && ed.nombre ? { texto: ed.nombre.toUpperCase(), desde: 6, y: -60 }
    : null;

  let contenido: React.ReactNode = null;
  const props = { e, m: momentos.map((x) => x - desdeVentana), local: lv };
  switch (ed.pantalla) {
    case "lista": contenido = <Lista {...props} />; break;
    case "chips": contenido = <Chips {...props} />; break;
    case "tarjetas": contenido = <Tarjetas {...props} />; break;
    case "aviso": contenido = <Aviso e={e} local={lv} />; break;
    case "guion": contenido = <Guion dichas={dichas.map((p) => ({ ...p, frame: p.frame - desdeVentana, hasta: p.hasta - desdeVentana }))} local={lv} dur={dur - desdeVentana} />; break;
    case "cierre": contenido = <Cierre {...props} clic={clicCierre} />; break;
    case "web": contenido = <Web {...props} />; break;
    case "panel": contenido = <Panel {...props} />; break;
    case "crm": contenido = <Crm {...props} />; break;
    default: contenido = null;
  }

  return (
    <ContextoTema.Provider value={K}>
      <AbsoluteFill style={{ background: mundo.abajo, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: ox, top: oy, width: 1080, height: 1920, transformOrigin: "0 0", transform: `scale(${sw})` }}>
          <AbsoluteFill style={{ transformOrigin: `${mundo.foco[0]}px ${mundo.foco[1]}px`, transform: `translateY(${sube}px) scale(${zoom})` }}>
            <mundo.Fondo local={local} luz={luz} cerca={k} titulo={e.titulo ?? ""} busqueda={ed.pantalla === "mundo" ? ed.busqueda : null} nombre={ed.nombre} hora={hora} />
          </AbsoluteFill>
        </div>
        <AbsoluteFill style={{ background: mundo.vela, opacity: k * (1 - 0.6 * luz) }} />
        <Personaje sp={sp} x={px} y={py} tam={pt} saluda={saluda} salto={salto + habla} />
        {lienzo ? (
          <>
            <AbsoluteFill style={{ background: lienzo === "golpe" ? "rgba(6,6,10,.82)" : "rgba(6,6,10,.62)", opacity: entra(local, 0, 8) }} />
            <LienzoEscena e={e} pantalla={lienzo} momentos={momentos} local={local} dur={dur} area={area} dichas={dichas} />
            {lienzo === "golpe" ? <AbsoluteFill style={{ background: "#fff", opacity: momentos.reduce((o, d) => Math.max(o, interpolate(local - d, [0, 5], [0.32, 0], LIMITE) * (local >= d ? 1 : 0)), 0) }} /> : null}
          </>
        ) : null}
        {ed.pantalla === "mundo" && e.titulo ? (
          <Globo texto={e.titulo} local={local} x={px + 8 * pt} y={Math.max(area.y + 160 * Math.min(1, sw), py - 16 * sw)} escala={Math.min(1.2, Math.max(0.6, Math.min(width / 1080, area.alto / 1000)))} ancho={width} />
        ) : null}
        {conVentana && lv >= 0 ? (
          <div style={{ position: "absolute", left: izqV, top: arribaV, width: ANCHO, transformOrigin: "0 0", transform: `scale(${escala})` }}>
            <Ventana local={lv} dur={continuidad.sale ? dur - desdeVentana : dur - desdeVentana} titulo={ed.pantalla === "web" ? (e.titulo ?? "inicio").split(" ").slice(0, 2).join(" ") : NOMBRE[ed.pantalla]} nombre={ed.nombre} hora={hora}>
              {ed.pantalla !== "web" ? <Encabezado e={e} local={lv} /> : null}
              {contenido}
            </Ventana>
            {sticker ? <Sticker {...sticker} local={lv} /> : null}
            <Cursor objetivos={objetivos} local={lv} inicio={{ x: ANCHO - 80, y: alto + 160 }} />
          </div>
        ) : null}
      </AbsoluteFill>
    </ContextoTema.Provider>
  );
};

// Cómo se une cada escenario con el anterior y el siguiente (mismo mundo y sin hueco = un solo
// lugar: sin transición, la cámara sigue y la luz del negocio queda como estaba).
export const continuidadEscenarios = (items: ElementoEnEditado[]): Continuidad[] => {
  const orden = items.map((x, i) => i).sort((a, b) => items[a].desdeFrame - items[b].desdeFrame);
  const salida: Continuidad[] = items.map(() => ({ entra: false, sale: false, cercaAntes: false, luzAntes: 1 }));
  let luz = 1;
  let anterior: number | null = null;
  for (const i of orden) {
    const x = items[i].elemento;
    if (x.tipo !== "apoyo" || x.modo !== "escenario" || !x.escenario) {
      anterior = null;
      continue;
    }
    const a = anterior === null ? null : items[anterior];
    const pegada =
      a !== null &&
      a.elemento.tipo === "apoyo" &&
      a.elemento.escenario?.mundo === x.escenario.mundo &&
      items[i].desdeFrame - (a.desdeFrame + a.duracionFrames) <= 3;
    salida[i] = {
      entra: pegada,
      sale: false,
      cercaAntes: pegada && a?.elemento.tipo === "apoyo" ? tomaDe(a.elemento.escenario?.pantalla ?? "lista") > 0.5 : false,
      luzAntes: luz,
    };
    if (pegada && anterior !== null) salida[anterior].sale = true;
    if (x.escenario.abierto === "abrir") luz = 1;
    if (x.escenario.abierto === "cerrar") luz = 0;
    anterior = i;
  }
  return salida;
};

// Frames (relativos a la escena) del clic del botón de cierre y del sticker del aviso.
export const golpesEscenario = (e: ElementoApoyo, duracionFrames: number, momentos: number[] = [], fps = 30) => {
  const p = e.escenario?.pantalla;
  const m = momentosLegibles(momentos, Math.max(momentos.length, e.puntos.length), duracionFrames, fps);
  return p === "cierre" ? [{ frame: Math.round(duracionFrames * 0.55), sonido: "ding" as const }]
    : p === "mosaico" ? [{ frame: finalMosaico(m, duracionFrames, fps), sonido: "brillo" as const }]
    : p === "perfil" ? m.slice(0, e.puntos.length).map((f) => ({ frame: f, sonido: "ding" as const }))
    : p === "aviso" ? [{ frame: 28, sonido: "brillo" as const }]
    : [];
};
