import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { VISTAS_3D, type ElementoApoyo } from "../edicion/esquema";
import { useMarca } from "../edicion/estilos";
import type { Marca } from "../marca";
import {
  finalMosaico,
  FRENTE,
  iconoDe,
  mezclar,
  momentosLegibles,
  PIEL,
  tamQueCabe,
  TENDERA,
  TRANSEUNTES,
  type ItemEscenario,
} from "./Escenario";

// Escenarios 3D (`modo: "escenario3d"` de las escenas de apoyo): objetos de cubitos, luces y una
// cámara en 3D (@remotion/three), con los textos en 2D encima. Las pantallas muestran una
// interfaz de verdad: se dibuja en un lienzo 2D con los textos del plan y se pega en la cara de
// la pantalla 3D. Todo se anima con useCurrentFrame (nunca useFrame), para que cada cuadro salga
// igual al renderizar. Se renderiza con --gl=angle (o swangle en servidores sin tarjeta gráfica).

type V3 = [number, number, number];
type Area = { x: number; y: number; ancho: number; alto: number };
type Escena3D = NonNullable<ElementoApoyo["escenario3d"]>;
type Vista = (typeof VISTAS_3D)[number];

const LIMITE = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const suave = Easing.bezier(0.16, 1, 0.3, 1);
const entra = (f: number, desde: number, dur = 14) => interpolate(f, [desde, desde + dur], [0, 1], { ...LIMITE, easing: suave });
const resorte = (f: number, desde: number, fps: number, damping = 12, stiffness = 150) =>
  f < desde ? 0 : spring({ frame: f - desde, fps, config: { damping, stiffness } });

// Colores: los del estilo del video (primario, secundario y acento) y unos fijos para lo demás.
const paletaDe = (marca: Marca) => {
  const acento = marca.colores.primario;
  return {
    acento,
    acento2: marca.colores.secundario,
    amarillo: marca.colores.acento,
    rosa: mezclar(acento, "#ff4f8b", 0.55),
    oscuro: mezclar(acento, "#000000", 0.35),
    verde: "#3ccf91",
    texto: "#f4f2ee",
    suave: "#a6a2b4",
    card: "#16151d",
    card2: "#201e2b",
    linea: "#2c2b36",
    fuente: marca.fuente,
  };
};
type Paleta = ReturnType<typeof paletaDe>;

// ---------------- Piezas 3D ----------------
const Camara: React.FC<{ pos: V3; mira: V3 }> = ({ pos, mira }) => {
  const { camera } = useThree();
  camera.position.set(...pos);
  camera.lookAt(...mira);
  camera.updateMatrixWorld();
  return null;
};

const Lienzo: React.FC<{ x?: number; y?: number; w: number; h: number; cam: V3; mira?: V3; fov?: number; children: React.ReactNode }> = ({ x = 0, y = 0, w, h, cam, mira = [0, 0, 0], fov = 40, children }) => (
  <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{ fov, position: cam, near: 0.1, far: 300 }} style={{ position: "absolute", left: x, top: y }}>
    <Camara pos={cam} mira={mira} />
    {children}
  </ThreeCanvas>
);

const Luces: React.FC<{ tono: string; fuerza?: number }> = ({ tono, fuerza = 1 }) => (
  <>
    <ambientLight intensity={0.55 * fuerza} />
    <hemisphereLight args={["#c9c2ff", "#1a1030", 0.6 * fuerza]} />
    <directionalLight position={[6, 10, 8]} intensity={1.8 * fuerza} />
    <pointLight position={[-8, 3, 6]} intensity={120 * fuerza} color={tono} />
  </>
);

const Caja: React.FC<{ p: V3; t: V3; color: string; r?: V3; brillo?: number; opacidad?: number; metal?: number }> = ({ p, t, color, r = [0, 0, 0], brillo = 0, opacidad = 1, metal = 0.05 }) => (
  <mesh position={p} rotation={r}>
    <boxGeometry args={t} />
    <meshStandardMaterial color={color} roughness={0.5} metalness={metal} emissive={color} emissiveIntensity={brillo} transparent={opacidad < 1} opacity={opacidad} />
  </mesh>
);

// Un dibujo en cubitos a partir de un mapa de letras (cada letra, un color de `pal`).
const Voxeles: React.FC<{
  mapa: string[];
  pal: Record<string, string>;
  prof?: number;
  tam?: number;
  brilloDe?: (c: string) => number;
  posDe?: (x: number, y: number) => { p: V3; r: V3 };
}> = ({ mapa, pal, prof = 1, tam = 1, brilloDe, posDe }) => {
  const h = mapa.length;
  const w = Math.max(...mapa.map((r) => r.length));
  return (
    <group scale={tam}>
      {mapa.flatMap((fila, y) =>
        [...fila].map((c, x) => {
          const col = pal[c];
          if (c === "." || !col) return null;
          const base: V3 = [x - (w - 1) / 2, (h - 1) / 2 - y, 0];
          const extra = posDe?.(x, y);
          return (
            <mesh key={`${x}-${y}`} position={extra ? [base[0] + extra.p[0], base[1] + extra.p[1], base[2] + extra.p[2]] : base} rotation={extra?.r ?? [0, 0, 0]}>
              <boxGeometry args={[0.96, 0.96, prof]} />
              <meshStandardMaterial color={col} roughness={0.5} metalness={0.05} emissive={col} emissiveIntensity={brilloDe?.(c) ?? 0} />
            </mesh>
          );
        }),
      )}
    </group>
  );
};

const CHECK = [".......##", "......##.", "##...##..", ".##.##...", "..###....", "...#....."];
const CORAZON = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
const COHETE = [
  "......ww......", ".....wwww.....", "....wwwwww....", "....wwbbww....", "....wbccbw....", "....wbccbw....", "....wwbbww....",
  "....wwwwww....", "...rwwwwwwr...", "..rrwwwwwwrr..", "..rr.wwww.rr..", ".....oooo.....",
];
const paletaPersona = (P: Paleta) => ({ ...PIEL, h: "#2a1c14", p: P.acento, P: P.oscuro, k: "#ffffff", j: "#2b3c63", z: "#efefef", Z: P.acento2 });
const paletaTendera = (P: Paleta) => ({ h: "#6a2f1c", s: "#c98d64", S: "#a8714d", e: "#18161a", w: "#f4f4f4", m: "#8a3f2c", p: "#2f8f83", P: "#22685f", a: "#f3e6cf", k: P.acento, j: "#3a3346", z: "#f0f0f0", Z: P.acento });

// Píxeles por unidad del mundo con la cámara a distancia D (fov vertical en grados).
const pxPorUnidad = (D: number, alto: number, fov = 40) => alto / (2 * D * Math.tan(((fov / 2) * Math.PI) / 180));
// De un punto de la pantalla (px) a coordenadas del mundo en el plano z = 0.
const aMundo = (px: number, py: number, D: number, w: number, h: number, fov = 40): [number, number] => {
  const k = pxPorUnidad(D, h, fov);
  return [(px - w / 2) / k, (h / 2 - py) / k];
};

// ---------------- Interfaces dibujadas en un lienzo 2D ----------------
const PW = 1024;
const PH = 860;
type Ctx = CanvasRenderingContext2D;
const letra = (P: Paleta, peso: number, tam: number) => `${peso} ${tam}px "${P.fuente}", sans-serif`;
const rect = (x: Ctx, X: number, Y: number, W: number, H: number, r: number, fondo: string, borde?: string) => {
  x.beginPath();
  x.roundRect(X, Y, W, H, r);
  x.fillStyle = fondo;
  x.fill();
  if (borde) {
    x.lineWidth = 4;
    x.strokeStyle = borde;
    x.stroke();
  }
};
// Escribe un texto; si no cabe en `max`, baja la letra y, si aún no cabe, lo corta con "…".
const escribir = (x: Ctx, P: Paleta, t: string, X: number, Y: number, peso: number, tam: number, color: string, alinear: CanvasTextAlign = "left", max = Infinity) => {
  let s = tam;
  x.font = letra(P, peso, s);
  while (s > tam * 0.7 && x.measureText(t).width > max) {
    s -= 2;
    x.font = letra(P, peso, s);
  }
  let texto = t;
  while (texto.length > 1 && x.measureText(texto).width > max) texto = `${texto.slice(0, -2)}…`;
  x.fillStyle = color;
  x.textAlign = alinear;
  x.textBaseline = "middle";
  x.fillText(texto, X, Y);
};
// Un texto en hasta dos renglones dentro de `max`.
const dosRenglones = (x: Ctx, P: Paleta, t: string, X: number, Y: number, peso: number, tam: number, color: string, max: number, alto: number) => {
  x.font = letra(P, peso, tam);
  const palabras = t.split(/\s+/);
  let uno = "";
  let i = 0;
  while (i < palabras.length && x.measureText(`${uno} ${palabras[i]}`.trim()).width <= max) uno = `${uno} ${palabras[i++]}`.trim();
  const dos = palabras.slice(i).join(" ");
  if (!uno) return escribir(x, P, t, X, Y, peso, tam, color, "left", max);
  escribir(x, P, uno, X, dos ? Y - alto / 2 : Y, peso, tam, color, "left", max);
  if (dos) escribir(x, P, dos, X, Y + alto / 2, peso, tam, color, "left", max);
};
const chulo = (x: Ctx, cx: number, cy: number, s: number, color: string) => {
  x.beginPath();
  x.moveTo(cx - s * 0.5, cy);
  x.lineTo(cx - s * 0.12, cy + s * 0.36);
  x.lineTo(cx + s * 0.5, cy - s * 0.38);
  x.lineWidth = s * 0.2;
  x.lineCap = "round";
  x.lineJoin = "round";
  x.strokeStyle = color;
  x.stroke();
};
const carrito = (x: Ctx, cx: number, cy: number, color: string) => {
  x.beginPath();
  x.moveTo(cx - 34, cy - 22);
  x.lineTo(cx - 22, cy - 22);
  x.lineTo(cx - 12, cy + 12);
  x.lineTo(cx + 24, cy + 12);
  x.lineTo(cx + 32, cy - 12);
  x.lineTo(cx - 17, cy - 12);
  x.lineWidth = 6;
  x.lineJoin = "round";
  x.strokeStyle = color;
  x.stroke();
  for (const dx of [-8, 20]) {
    x.beginPath();
    x.arc(cx + dx, cy + 24, 6, 0, Math.PI * 2);
    x.fillStyle = color;
    x.fill();
  }
};
const marco = (x: Ctx, P: Paleta, titulo: string, color: string, derecha = 0) => {
  x.clearRect(0, 0, PW, PH);
  rect(x, 0, 0, PW, PH, 36, P.card);
  x.save();
  x.beginPath();
  x.roundRect(0, 0, PW, 110, [36, 36, 0, 0]);
  x.fillStyle = P.card2;
  x.fill();
  x.restore();
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    x.beginPath();
    x.arc(46 + i * 40, 55, 13, 0, Math.PI * 2);
    x.fillStyle = c;
    x.fill();
  });
  escribir(x, P, titulo, 180, 57, 800, 50, color, "left", PW - 220 - derecha);
};
const suaveEntre = (t: number) => t * t * (3 - 2 * t);
// "Nombre: nota" → ["Nombre", "nota"].
const partir = (fila: string): [string, string | null] => {
  const i = fila.indexOf(":");
  return i > 0 ? [fila.slice(0, i).trim(), fila.slice(i + 1).trim() || null] : [fila.trim(), null];
};

const POR_DEFECTO: Record<Vista, { titulo: string; filas: string[] }> = {
  tienda: { titulo: "Tienda en línea", filas: ["Camisa", "Zapatos", "Bolso", "Gorra"] },
  reservas: { titulo: "Reservas", filas: ["9:00", "10:30", "15:00", "17:30"] },
  panel: { titulo: "Panel", filas: ["Visitas", "Pedidos", "Citas"] },
  crm: { titulo: "Clientes", filas: ["Ana: Pidió información", "Luis: Agendó una cita", "Sara: Ya es cliente", "Juan: Escribió por WhatsApp"] },
};
type DatosPantalla = { vista: Vista; titulo: string; filas: string[]; nota: string | null };

// Momentos (frames desde que aparece la pantalla) de lo que pasa adentro.
const T_TIENDA = (i: number) => 16 + i * 10;
const T_RESERVA = { dia: 8, hora: 20, listo: 32 };
const T_CRM = (k: number) => 8 + k * 9;

const dibujarTienda = (x: Ctx, P: Paleta, d: DatosPantalla, t: number) => {
  const productos = d.filas.slice(0, 4);
  const listos = productos.filter((_, i) => t > T_TIENDA(i) + 10).length;
  marco(x, P, d.titulo, P.amarillo, 120);
  carrito(x, PW - 90, 52, P.texto);
  if (listos) {
    x.beginPath();
    x.arc(PW - 52, 30, 24, 0, Math.PI * 2);
    x.fillStyle = P.rosa;
    x.fill();
    escribir(x, P, String(listos), PW - 52, 31, 800, 28, "#fff", "center");
  }
  const filas = Math.ceil(productos.length / 2);
  const alto = (PH - 140 - (filas - 1) * 20) / filas;
  const colores = [P.acento, P.acento2, P.amarillo, P.rosa];
  productos.forEach((n, i) => {
    const X = 36 + (i % 2) * 486;
    const Y = 128 + Math.floor(i / 2) * (alto + 20);
    rect(x, X, Y, 466, alto, 26, P.card2);
    const foto = alto - 190;
    const g = x.createLinearGradient(X, Y, X + 466, Y + foto);
    g.addColorStop(0, colores[i % 4]);
    g.addColorStop(1, mezclar(colores[i % 4], "#000000", 0.45));
    rect(x, X + 22, Y + 22, 422, foto, 20, "#000");
    x.fillStyle = g;
    x.beginPath();
    x.roundRect(X + 22, Y + 22, 422, foto, 20);
    x.fill();
    escribir(x, P, n.slice(0, 1).toUpperCase(), X + 233, Y + 22 + foto / 2 + 4, 800, Math.min(110, foto * 0.7), "rgba(255,255,255,.9)", "center");
    escribir(x, P, n, X + 233, Y + foto + 64, 800, 46, P.texto, "center", 420);
    const ok = t > T_TIENDA(i);
    rect(x, X + 70, Y + alto - 82, 326, 62, 18, ok ? P.verde : P.amarillo);
    if (ok) {
      chulo(x, X + 140, Y + alto - 51, 30, "#06210f");
      escribir(x, P, "Agregado", X + 250, Y + alto - 50, 800, 34, "#06210f", "center");
    } else escribir(x, P, "Agregar", X + 233, Y + alto - 50, 800, 36, "#2a1f00", "center");
  });
};

const dibujarReservas = (x: Ctx, P: Paleta, d: DatosPantalla, t: number) => {
  const horas = d.filas.slice(0, 4);
  const elegida = Math.min(1, horas.length - 1);
  marco(x, P, d.titulo, P.acento2);
  escribir(x, P, "Elige el día", 50, 160, 800, 42, P.texto);
  ["L", "M", "M", "J", "V", "S", "D"].forEach((l, i) => escribir(x, P, l, 108 + i * 136, 222, 800, 32, P.suave, "center"));
  for (let k = 0; k < 14; k++) {
    const X = 50 + (k % 7) * 136;
    const Y = 252 + Math.floor(k / 7) * 92;
    const sel = k === 10 && t > T_RESERVA.dia;
    rect(x, X, Y, 116, 76, 16, sel ? P.acento2 : P.card2);
    escribir(x, P, String(k + 9), X + 58, Y + 40, 800, 34, sel ? "#04202a" : P.texto, "center");
  }
  const ancho = (924 - (horas.length - 1) * 20) / horas.length;
  horas.forEach((h, i) => {
    const sel = i === elegida && t > T_RESERVA.hora;
    rect(x, 50 + i * (ancho + 20), 462, ancho, 80, 18, sel ? P.acento2 : P.card, P.acento2);
    escribir(x, P, h, 50 + i * (ancho + 20) + ancho / 2, 503, 800, 38, sel ? "#04202a" : P.texto, "center", ancho - 20);
  });
  if (t > T_RESERVA.listo) {
    rect(x, 50, 584, 924, 226, 26, "#123a2a", P.verde);
    chulo(x, 200, 650, 46, P.verde);
    escribir(x, P, "Cita confirmada", 545, 652, 800, 52, P.verde, "center", 640);
    escribir(x, P, d.nota ?? `Tu cliente · ${horas[elegida] ?? ""}`, 512, 742, 700, 38, P.texto, "center", 860);
  } else {
    rect(x, 50, 584, 924, 110, 22, P.card2);
    escribir(x, P, t > T_RESERVA.hora ? "Confirmando…" : "Elige una hora", 512, 640, 700, 38, P.suave, "center");
  }
};

const dibujarPanel = (x: Ctx, P: Paleta, d: DatosPantalla, t: number, fps: number) => {
  const metricas = d.filas.slice(0, 3).map(partir);
  const colores = [P.acento2, P.amarillo, P.rosa];
  marco(x, P, d.titulo, P.acento);
  const cuenta = interpolate(t, [4, 34], [0, 1], LIMITE);
  const ancho = (952 - (metricas.length - 1) * 20) / metricas.length;
  metricas.forEach(([n, valor], i) => {
    const X = 36 + i * (ancho + 20);
    rect(x, X, 136, ancho, 176, 22, P.card2);
    escribir(x, P, n, X + 26, 182, 700, 36, P.suave, "left", ancho - 52);
    const num = valor && /^[\d.,\s]+$/.test(valor) ? Number(valor.replace(/[.,\s]/g, "")) : null;
    if (num !== null && Number.isFinite(num)) escribir(x, P, Math.round(num * cuenta).toLocaleString("es-CO"), X + 26, 256, 800, 62, colores[i], "left", ancho - 52);
    else if (valor) escribir(x, P, valor, X + 26, 256, 800, 54, colores[i], "left", ancho - 52);
    else {
      // Sin número: una línea que se dibuja.
      x.beginPath();
      const pts = [0.2, 0.35, 0.3, 0.55, 0.5, 0.72, 0.8];
      pts.forEach((p, k) => {
        const px = X + 26 + (k / (pts.length - 1)) * (ancho - 52) * cuenta;
        const py = 292 - p * 60;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      });
      x.lineWidth = 7;
      x.lineCap = "round";
      x.strokeStyle = colores[i];
      x.stroke();
    }
  });
  escribir(x, P, d.nota ?? "Esta semana", 40, 364, 800, 38, P.texto, "left", 900);
  [40, 65, 50, 80, 60, 90, 75].forEach((h, i) => {
    const k = resorte(t, 8 + i * 3, fps, 12);
    const alto = (h / 100) * 330 * k;
    const X = 70 + i * 132;
    rect(x, X, 772 - alto, 84, Math.max(1, alto), 12, i === 5 ? P.acento : mezclar(P.acento, "#ffffff", 0.35));
    escribir(x, P, ["L", "M", "M", "J", "V", "S", "D"][i], X + 42, 812, 800, 30, P.suave, "center");
  });
};

const columnaCrm = (t: number, k: number) => {
  const c = Math.min(2, Math.max(0, (t - T_CRM(k)) / 20));
  const n = Math.floor(c);
  return n + suaveEntre(Math.min(1, (c - n) * 1.6));
};
const dibujarCrm = (x: Ctx, P: Paleta, d: DatosPantalla, t: number) => {
  const gente = d.filas.slice(0, 4).map(partir);
  marco(x, P, d.titulo, P.rosa);
  const cols = ["Nuevo", "En contacto", "Cliente"];
  const cuantos = [0, 0, 0];
  gente.forEach((_, k) => cuantos[Math.round(columnaCrm(t, k))]++);
  cols.forEach((c, i) => {
    rect(x, 26 + i * 328, 128, 316, 714, 22, "#1c1a26");
    escribir(x, P, `${c} (${cuantos[i]})`, 184 + i * 328, 174, 800, 32, i === 2 ? P.verde : P.suave, "center", 290);
  });
  const alto = Math.min(150, (640 - (gente.length - 1) * 14) / Math.max(1, gente.length));
  gente.forEach(([n, nota], k) => {
    const col = columnaCrm(t, k);
    const X = 38 + col * 328;
    const Y = 212 + k * (alto + 14);
    const cliente = col > 1.95;
    rect(x, X, Y, 292, alto, 18, cliente ? "#163d2c" : "#2b2938", cliente ? P.verde : undefined);
    escribir(x, P, n, X + 22, Y + (nota ? 40 : alto / 2), 800, 40, P.texto, "left", 250);
    if (nota) dosRenglones(x, P, nota, X + 22, Y + 40 + (alto - 40) / 2 + 4, 700, 27, P.suave, 252, 32);
  });
};

const useInterfaz = (dibujar: (x: Ctx) => void, w = PW, h = PH) => {
  const { lienzo, tex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { lienzo: c, tex: t };
  }, [w, h]);
  const x = lienzo.getContext("2d");
  if (x) dibujar(x);
  tex.needsUpdate = true;
  return tex;
};

// Una pantalla 3D (6.2 × 5.2) con su interfaz pegada en la cara de adelante.
const Pantalla: React.FC<{ p: V3; r: V3; escala: number; color: string; dibujar: (x: Ctx) => void; children?: React.ReactNode }> = ({ p, r, escala, color, dibujar, children }) => {
  const tex = useInterfaz(dibujar);
  return (
    <group position={p} rotation={r} scale={Math.max(0.001, escala)}>
      <Caja p={[0, 0, -0.2]} t={[6.45, 5.45, 0.1]} color={color} brillo={1.3} />
      <Caja p={[0, 0, 0]} t={[6.2, 5.2, 0.3]} color="#15141d" metal={0.3} />
      <mesh position={[0, 0, 0.152]}>
        <planeGeometry args={[6.2, 5.2]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
      {children}
    </group>
  );
};
// De un punto del lienzo de la interfaz (px) a la cara de la pantalla.
const enPantalla = (cx: number, cy: number): [number, number] => [(cx / PW - 0.5) * 6.2, (0.5 - cy / PH) * 5.2];

// ---------------- Textos en 2D encima ----------------
// Divide un título en dos renglones parecidos.
const enDos = (t: string) => {
  const p = t.trim().split(/\s+/);
  if (p.length < 2 || t.length < 12) return [t.trim()];
  let mejor = 1;
  for (let i = 1; i < p.length; i++) {
    const a = p.slice(0, i).join(" ").length;
    const b = p.slice(i).join(" ").length;
    const m = p.slice(0, mejor).join(" ").length;
    if (Math.abs(a - b) < Math.abs(m - p.slice(mejor).join(" ").length)) mejor = i;
  }
  return [p.slice(0, mejor).join(" "), p.slice(mejor).join(" ")];
};

const Icono: React.FC<{ nombre: string | null; defecto: string; tam: number; color: string }> = ({ nombre, defecto, tam, color }) => {
  const C = (nombre && iconoDe(nombre)) || iconoDe(defecto);
  return C ? <C size={tam} color={color} strokeWidth={2.4} style={{ flexShrink: 0 }} /> : null;
};

const TituloGrande: React.FC<{ texto: string; P: Paleta; ancho: number; maximo: number; v: number; colores?: [string, string] }> = ({ texto, P, ancho, maximo, v, colores }) => {
  const lineas = enDos(texto.toUpperCase());
  return (
    <div style={{ textAlign: "center", fontFamily: P.fuente, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.08, opacity: Math.min(1, v * 1.5), transform: `scale(${interpolate(v, [0, 1], [1.3, 1])})` }}>
      {lineas.map((l, i) => (
        <div
          key={i}
          style={{
            fontSize: tamQueCabe(l, ancho, maximo, 0.72),
            whiteSpace: "nowrap",
            ...(i === lineas.length - 1 && lineas.length > 1
              ? { background: `linear-gradient(90deg, ${colores?.[0] ?? P.acento2}, ${colores?.[1] ?? P.rosa})`, WebkitBackgroundClip: "text", color: "transparent" }
              : { color: P.texto, textShadow: `0 0 50px ${P.acento}` }),
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
};

type Props = { e: ElementoApoyo; ed: Escena3D; m: number[]; local: number; dur: number; area: Area; P: Paleta };
// Tamaño de letra base según el espacio (1 = el de un video vertical de 1080 de ancho).
const unidad = (area: Area) => (area.ancho > area.alto * 1.25 ? Math.min(1, area.alto / 680, area.ancho / 1500) : Math.min(1.1, area.ancho / 920, area.alto / 1100));

// ---------------- plataformas: pantallas 3D con su interfaz ----------------
const Plataformas: React.FC<Props> = ({ e, ed, m, local, dur, area, P }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  const n = Math.min(4, Math.max(2, e.puntos.length));
  const datos: DatosPantalla[] = Array.from({ length: n }, (_, i) => {
    const propia = ed.pantallas?.[i];
    const vista = propia?.vista ?? VISTAS_3D[i % 4];
    return {
      vista,
      titulo: e.puntos[i]?.texto ?? POR_DEFECTO[vista].titulo,
      filas: propia?.filas.length ? propia.filas : POR_DEFECTO[vista].filas,
      nota: propia?.nota ?? null,
    };
  });
  const horizontal = area.ancho > area.alto * 1.25;
  const cols = horizontal ? n : 2;
  const filas = horizontal ? 1 : Math.ceil(n / 2);
  const cw = area.ancho / cols;
  const ch = area.alto / filas;
  const asp = 6.2 / 5.2;
  const chica = Math.min(cw * 0.94, ch * 0.9 * asp);
  const grande = Math.min(area.ancho * 0.94, area.alto * (horizontal ? 0.96 : 0.66) * asp);
  const D = 34;
  const k = pxPorUnidad(D, H);
  const fin = finalMosaico(m, dur, fps);
  const vf = resorte(local, fin, fps, 14, 90);
  const u = unidad(area);
  const colorDe: Record<Vista, string> = { tienda: P.amarillo, reservas: P.acento2, panel: P.acento, crm: P.rosa };

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 30%, ${mezclar(P.acento, "#07070c", 0.7)}, #07070c 70%)` }} />
      <Lienzo w={W} h={H} cam={[Math.sin(local / 60) * 0.8, 0, D]}>
        <Luces tono={P.acento2} />
        <group position={[0, 0, -vf * 6]}>
          {datos.map((d, i) => {
            const desde = m[i] ?? 10 + i * 14;
            const v = resorte(local, desde, fps, 12, 150);
            if (v <= 0.001) return null;
            const t = local - desde;
            // Primero sale grande en el centro (para leerla) y luego va a su lugar.
            const suelta = Math.min(m[i + 1] ?? Infinity, desde + 48, fin);
            const a = interpolate(local, [suelta, suelta + 14], [0, 1], { ...LIMITE, easing: suave });
            const c = i % cols;
            const f = Math.floor(i / cols);
            const ultimaFila = f === filas - 1 && n % cols !== 0 && !horizontal;
            const sx = area.x + (ultimaFila ? area.ancho / 2 : cw * (c + 0.5));
            const sy = area.y + ch * (f + 0.5);
            const px = interpolate(a, [0, 1], [area.x + area.ancho / 2, sx]);
            const py = interpolate(a, [0, 1], [area.y + area.alto * (horizontal ? 0.5 : 0.46), sy]);
            const tam = interpolate(a, [0, 1], [grande, chica]);
            const z = (1 - a) * 3;
            const lejos = (D - z) / D;
            const [wx, wy] = aMundo(px, py, D, W, H);
            const giro = horizontal ? (c - (cols - 1) / 2) * -0.2 : ultimaFila ? 0 : c === 0 ? 0.26 : -0.26;
            const dibujar = (x: Ctx) =>
              d.vista === "tienda" ? dibujarTienda(x, P, d, t)
              : d.vista === "reservas" ? dibujarReservas(x, P, d, t)
              : d.vista === "panel" ? dibujarPanel(x, P, d, t, fps)
              : dibujarCrm(x, P, d, t);
            // Lo que sale de la pantalla: la caja que vuela al carrito o el chulito de listo.
            let fuera: React.ReactNode = null;
            if (d.vista === "tienda") {
              const j = d.filas.slice(0, 4).findIndex((_, q) => t >= T_TIENDA(q) && t < T_TIENDA(q) + 10);
              if (j >= 0) {
                const q = (t - T_TIENDA(j)) / 10;
                const filasT = Math.ceil(Math.min(4, d.filas.length) / 2);
                const altoT = (PH - 140 - (filasT - 1) * 20) / filasT;
                const [x0, y0] = enPantalla(36 + (j % 2) * 486 + 233, 128 + Math.floor(j / 2) * (altoT + 20) + altoT / 2);
                const [x1, y1] = enPantalla(PW - 90, 52);
                fuera = <Caja p={[x0 + (x1 - x0) * q, y0 + (y1 - y0) * q + Math.sin(q * Math.PI) * 1.2, 0.6 + Math.sin(q * Math.PI) * 1.4]} t={[0.55, 0.55, 0.55]} r={[q * 4, q * 3, 0]} color={P.amarillo} brillo={0.5} />;
              }
            } else if (d.vista === "reservas" && t > T_RESERVA.listo) {
              fuera = (
                <group position={[2.5, -1.5, 1]} scale={resorte(t, T_RESERVA.listo, fps, 9, 200) * 0.14} rotation={[0, Math.sin(local / 8) * 0.4, 0]}>
                  <Voxeles mapa={CHECK} pal={{ "#": P.verde }} prof={1.5} brilloDe={() => 0.6} />
                </group>
              );
            } else if (d.vista === "crm") {
              const primero = d.filas.slice(0, 4).findIndex((_, q) => columnaCrm(t, q) > 1.95);
              if (primero >= 0) {
                const desdeC = T_CRM(primero) + 40;
                fuera = (
                  <group position={[2.6, 1.6, 1]} scale={resorte(t, desdeC, fps, 9, 200) * 0.12} rotation={[0, Math.sin(local / 8) * 0.4, 0]}>
                    <Voxeles mapa={CORAZON} pal={{ "#": P.rosa }} prof={1.4} brilloDe={() => 0.5} />
                  </group>
                );
              }
            }
            return (
              <Pantalla key={i} p={[wx * lejos, wy * lejos, z]} r={[0.04, giro * a + Math.sin(local / 30 + i) * 0.04, 0]} escala={(v * tam * lejos) / k / 6.2} color={colorDe[d.vista]} dibujar={dibujar}>
                {fuera}
              </Pantalla>
            );
          })}
        </group>
      </Lienzo>
      <AbsoluteFill style={{ background: "rgba(7,7,12,.72)", opacity: vf }} />
      {local >= fin && e.titulo ? (
        <div style={{ position: "absolute", left: area.x, top: area.y, width: area.ancho, height: area.alto, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 34 * u }}>
          <TituloGrande texto={e.titulo} P={P} ancho={area.ancho * 0.94} maximo={112 * u} v={vf} />
          <div style={{ display: "flex", justifyContent: "center", gap: 14 * u, flexWrap: "wrap", maxWidth: area.ancho }}>
            {datos.map((d, i) => (
              <span key={i} style={{ padding: `${14 * u}px ${26 * u}px`, borderRadius: 999, background: P.card, border: `3px solid ${colorDe[d.vista]}`, fontFamily: P.fuente, fontWeight: 800, fontSize: 36 * u, color: P.texto, whiteSpace: "nowrap", transform: `scale(${resorte(local, fin + 6 + i * 4, fps, 10, 220)})` }}>
                {d.titulo}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// Tarjeta 2D con un título y puntos que aparecen cuando se dicen (cuarto y celular).
const Tarjeta: React.FC<{ e: ElementoApoyo; m: number[]; local: number; P: Paleta; x: number; y: number; ancho: number; u: number; color: string; tipo: "ideas" | "pasos"; etiqueta: string | null }> = ({ e, m, local, P, x, y, ancho, u, color, tipo, etiqueta }) => {
  const { fps } = useVideoConfig();
  const v0 = entra(local, 2);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: ancho, boxSizing: "border-box", padding: `${30 * u}px ${32 * u}px ${18 * u}px`, borderRadius: 30 * u, background: "rgba(20,19,27,.94)", border: `2px solid ${color}`, boxShadow: `0 30px 80px rgba(0,0,0,.55), 0 0 50px ${color}33`, fontFamily: P.fuente, color: P.texto, opacity: v0, transform: `translateY(${(1 - v0) * 60 * u}px)` }}>
      {etiqueta ? <div style={{ fontSize: 28 * u, fontWeight: 800, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{etiqueta}</div> : null}
      {e.titulo ? <div style={{ fontSize: tamQueCabe(e.titulo, (ancho - 64 * u) * 1.9, 66 * u, 0.62), fontWeight: 900, lineHeight: 1.12, margin: `${8 * u}px 0 ${20 * u}px` }}>{e.titulo}</div> : null}
      {e.puntos.slice(0, 4).map((p, k) => {
        const v = resorte(local, m[k] ?? 10 + k * 10, fps, 11);
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 18 * u, padding: `${16 * u}px ${20 * u}px`, marginBottom: 14 * u, borderRadius: 20 * u, background: P.card2, border: `2px solid ${tipo === "ideas" ? color : "transparent"}`, opacity: Math.min(1, v * 1.4), transform: `translateX(${(1 - v) * -80 * u}px)` }}>
            {tipo === "pasos" ? (
              <span style={{ width: 60 * u, height: 60 * u, borderRadius: 16 * u, flexShrink: 0, display: "grid", placeItems: "center", background: P.verde }}>
                <Icono nombre="check" defecto="check" tam={40 * u} color="#06210f" />
              </span>
            ) : (
              <>
                <span style={{ fontSize: 32 * u, fontWeight: 800, color: P.suave }}>0{k + 1}</span>
                <Icono nombre={p.icono} defecto="sparkles" tam={50 * u} color={color} />
              </>
            )}
            <span style={{ fontSize: 46 * u, fontWeight: 800, lineHeight: 1.15 }}>{p.texto}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------- cuarto: un cuarto de noche en 3D ----------------
const Cuarto: React.FC<Props> = ({ e, m, local, area, P }) => {
  const { width: W, height: H } = useVideoConfig();
  const horizontal = area.ancho > area.alto * 1.25;
  const u = unidad(area) * (horizontal ? 0.95 : 1);
  const n = Math.min(4, e.puntos.length);
  const altoTarjeta = (e.titulo ? 200 : 70) * u + n * 122 * u;
  const tarjeta = horizontal
    ? { x: area.x, y: area.y + Math.max(0, (area.alto - altoTarjeta) * 0.4), ancho: area.ancho * 0.48 }
    : { x: area.x, y: area.y, ancho: area.ancho };
  const lienzo = horizontal ? { x: W * 0.42, y: 0, w: W * 0.58, h: H } : { x: 0, y: Math.min(H * 0.5, area.y + altoTarjeta - H * 0.04), w: W, h: 0 };
  if (!horizontal) lienzo.h = H - lienzo.y;
  const ang = 0.75 + local / 300;
  const persona = paletaPersona(P);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #0a0c1f, #05060c)" }} />
      <Lienzo x={lienzo.x} y={lienzo.y} w={lienzo.w} h={lienzo.h} cam={[Math.sin(ang) * 22, 11, Math.cos(ang) * 22]} mira={[0, 4.2, 0]} fov={36}>
        <ambientLight intensity={0.3} />
        <hemisphereLight args={["#4a5cff", "#0a0612", 0.5]} />
        <pointLight position={[2.5, 3.2, 0.5]} intensity={60} color="#ffb86b" />
        <pointLight position={[-1, 2.2, 1.5]} intensity={40} color={P.acento2} />
        <directionalLight position={[-6, 8, -10]} intensity={0.6} color="#8fa2ff" />
        <Caja p={[0, -0.25, 0]} t={[10, 0.5, 10]} color="#3a2f4f" />
        <Caja p={[0, 3.5, -5]} t={[10, 8, 0.4]} color="#2a2342" />
        <Caja p={[-5, 3.5, 0]} t={[0.4, 8, 10]} color="#251f3b" />
        <Caja p={[1.5, 4.8, -4.75]} t={[4, 3, 0.1]} color="#101845" brillo={0.5} />
        <mesh position={[2.6, 5.6, -4.65]}>
          <sphereGeometry args={[0.55, 24, 24]} />
          <meshStandardMaterial color="#fff6d6" emissive="#fff6d6" emissiveIntensity={1.5} />
        </mesh>
        {Array.from({ length: 10 }, (_, i) => (
          <Caja key={i} p={[-0.2 + random(`sx${i}`) * 3.4, 3.6 + random(`sy${i}`) * 2.4, -4.68]} t={[0.08, 0.08, 0.02]} color="#ffffff" brillo={Math.abs(Math.sin(local / 10 + i)) * 2} />
        ))}
        <Caja p={[1.5, 4.8, -4.6]} t={[4.2, 0.15, 0.2]} color="#4a3f66" />
        <Caja p={[1.5, 4.8, -4.6]} t={[0.15, 3.2, 0.2]} color="#4a3f66" />
        <Caja p={[1, 2, -2.5]} t={[6, 0.3, 2.6]} color="#7a5a43" />
        {[[-1.7, -3.5], [3.7, -3.5], [-1.7, -1.5], [3.7, -1.5]].map(([x, z], i) => (
          <Caja key={i} p={[x, 0.9, z]} t={[0.25, 1.9, 0.25]} color="#5d4332" />
        ))}
        <Caja p={[1, 2.22, -2.3]} t={[2.4, 0.12, 1.6]} color="#2b2a33" metal={0.6} />
        <group position={[1, 3.1, -3.05]} rotation={[-0.25, 0, 0]}>
          <Caja p={[0, 0, 0]} t={[2.4, 1.6, 0.1]} color="#2b2a33" metal={0.6} />
          <Caja p={[0, 0, 0.06]} t={[2.2, 1.4, 0.02]} color={P.acento2} brillo={1.2} />
        </group>
        <mesh position={[3.4, 2.6, -3]}>
          <cylinderGeometry args={[0.08, 0.08, 1, 8]} />
          <meshStandardMaterial color="#444" />
        </mesh>
        <mesh position={[3.4, 3.2, -3]}>
          <coneGeometry args={[0.45, 0.6, 16, 1, true]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ffb86b" emissiveIntensity={1.2} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-3.6, 0.5, -3.6]}>
          <cylinderGeometry args={[0.5, 0.4, 1, 16]} />
          <meshStandardMaterial color="#b0603f" />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => (
          <Caja key={i} p={[-3.6 + Math.cos(i) * 0.4, 1.3 + i * 0.25, -3.6 + Math.sin(i * 2) * 0.4]} t={[0.4, 0.4, 0.4]} r={[i, i * 2, 0]} color={P.verde} />
        ))}
        <Caja p={[1, 1.2, -0.6]} t={[1.6, 0.25, 1.4]} color="#3b3550" />
        <group position={[1, 3.2, -0.4]} rotation={[0, Math.PI, 0]}>
          <Voxeles mapa={FRENTE} pal={persona} tam={0.2} prof={1.6} />
        </group>
        <Caja p={[-1, 0.02, 1.8]} t={[4, 0.06, 2.6]} color={P.acento} />
      </Lienzo>
      <Tarjeta e={e} m={m} local={local} P={P} x={tarjeta.x} y={tarjeta.y} ancho={tarjeta.ancho} u={u} color={P.acento} tipo="ideas" etiqueta={null} />
    </AbsoluteFill>
  );
};

// ---------------- calle: un negocio que se enciende al atardecer ----------------
const Calle: React.FC<Props> = ({ e, ed, m, local, dur, area, P }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  const enciende = m[0] ?? Math.round(dur * 0.3);
  const luz = interpolate(local, [enciende - 4, enciende + 10], [0, 1], LIMITE);
  const t = interpolate(local, [0, Math.max(60, dur)], [0, 1], { ...LIMITE, easing: (x) => 1 - (1 - x) ** 2 });
  const nombre = (ed.nombre ?? "Tu negocio").toUpperCase();
  const letrero = useInterfaz((x) => {
    x.clearRect(0, 0, 1024, 190);
    rect(x, 0, 0, 1024, 190, 28, luz > 0.5 ? P.rosa : "#4a2a3a");
    x.shadowColor = "#ffffff";
    x.shadowBlur = luz > 0.5 ? 30 : 0;
    escribir(x, P, nombre, 512, 98, 900, 104, luz > 0.5 ? "#ffffff" : "#8d6a7a", "center", 940);
    x.shadowBlur = 0;
  }, 1024, 190);
  const u = unidad(area);
  const busca = ed.sub;
  const letras = busca ? Math.floor(interpolate(local, [6, 6 + busca.length * 1.4], [0, busca.length], LIMITE)) : 0;
  const tendera = paletaTendera(P);
  const ancho = Math.min(area.ancho, 900 * u);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #2a1d4a 0%, #5a2d63 35%, #c4506a 62%, #ff9a5a 80%)" }} />
      <Lienzo w={W} h={H} cam={[interpolate(t, [0, 1], [-10, 5]), interpolate(t, [0, 1], [6, 4]), interpolate(t, [0, 1], [42, 33])]} mira={[0, 3.6, 0]} fov={38}>
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#ffb38a", "#2a1d3a", 0.8]} />
        <directionalLight position={[10, 6, 8]} intensity={1.4} color="#ffb070" />
        <pointLight position={[0, 6.2, 3.5]} intensity={150 * luz} color={P.rosa} />
        <pointLight position={[-1.5, 2.5, 3]} intensity={90 * luz} color="#ffd99a" />
        <Caja p={[0, -0.6, 16]} t={[90, 0.2, 36]} color="#2c2432" />
        <Caja p={[0, -0.25, 2.2]} t={[60, 0.5, 3.4]} color="#5d4f5f" />
        {Array.from({ length: 8 }, (_, i) => (
          <Caja key={i} p={[-21 + i * 6, -0.48, 7.5]} t={[2.4, 0.04, 0.3]} color="#e8d9a8" />
        ))}
        <Caja p={[0, 4, -2]} t={[10, 9, 5]} color="#7a3f3f" />
        <Caja p={[0, 8.7, -2]} t={[10.6, 0.5, 5.6]} color="#5a2c2c" />
        <group position={[0, 6.6, 0.6]}>
          <Caja p={[0, 0, 0]} t={[7.2, 1.45, 0.4]} color="#2a1a22" />
          <mesh position={[0, 0, 0.21]}>
            <planeGeometry args={[7, 1.3]} />
            <meshBasicMaterial map={letrero} toneMapped={false} />
          </mesh>
        </group>
        {Array.from({ length: 10 }, (_, i) => (
          <Caja key={i} p={[-4.5 + i, 5.35, 1.2]} t={[1, 0.25, 2]} r={[0.45, 0, 0]} color={i % 2 ? "#f3e6cf" : P.acento} />
        ))}
        <Caja p={[-1.6, 2.3, 0.55]} t={[5, 3.4, 0.15]} color={luz > 0.3 ? "#ffd99a" : "#2b2533"} brillo={luz * 0.9} />
        {[[-3.2, 3], [-2, 3], [-0.8, 3], [-3.2, 1.8], [-2, 1.8], [-0.8, 1.8]].map(([x, y], i) => (
          <Caja key={i} p={[x, y, 0.75]} t={[0.7, 0.7, 0.3]} color={[P.rosa, "#f3e6cf", P.verde][i % 3]} />
        ))}
        <Caja p={[3, 1.8, 0.55]} t={[2, 3.6, 0.15]} color="#3a2533" />
        <Caja p={[3, 2.6, 0.68]} t={[1.3, 0.6, 0.06]} color={luz > 0.5 ? P.verde : "#e0524a"} brillo={0.8} />
        {([[-11, 6, "#3b2547"], [11, 7, "#3b2547"], [-19, 9, "#2d1d3a"], [19, 8, "#2d1d3a"]] as const).map(([x, h, c], q) => (
          <group key={q}>
            <Caja p={[x, h / 2 - 0.5, -3]} t={[7, h, 5]} color={c} />
            {Array.from({ length: 6 }, (_, i) => (
              <Caja key={i} p={[x - 2 + (i % 3) * 2, 1.5 + Math.floor(i / 3) * 2.4, -0.45]} t={[1, 1.3, 0.1]} color="#ffd99a" brillo={random(`v${q}${i}`) > 0.4 ? 0.9 : 0} />
            ))}
          </group>
        ))}
        <mesh position={[-7, 3, 2.5]}>
          <cylinderGeometry args={[0.12, 0.15, 7, 10]} />
          <meshStandardMaterial color="#2a2530" />
        </mesh>
        <mesh position={[-7, 6.6, 2.5]}>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshStandardMaterial color="#ffe7a8" emissive="#ffe7a8" emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[14, 4 - t * 2, -30]}>
          <sphereGeometry args={[4, 32, 32]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ffb35a" emissiveIntensity={1.4} />
        </mesh>
        <group position={[1, 1.15 + (luz > 0.5 && local - enciende < 12 ? Math.sin(((local - enciende) / 12) * Math.PI) * 0.8 : 0), 2.2]}>
          <Voxeles mapa={TENDERA} pal={tendera} tam={0.13} prof={1.6} />
        </group>
        {TRANSEUNTES.slice(0, 2).map((s, i) => (
          <group key={i} position={[(i ? 12 : -14) + (i ? -1 : 1) * local * 0.08, 1.15 + Math.abs(Math.sin(local / 4 + i)) * 0.15, 3.2 + i]} rotation={[0, (i ? -1 : 1) * 0.9, 0]}>
            <Voxeles mapa={s.frente} pal={s.paleta} tam={0.12} prof={1.6} />
          </group>
        ))}
      </Lienzo>
      {busca ? (
        <div style={{ position: "absolute", left: area.x + (area.ancho - ancho) / 2, width: ancho, top: area.y, boxSizing: "border-box", padding: `${22 * u}px ${30 * u}px`, borderRadius: 28 * u, background: "#fbf3ea", color: "#1d1517", fontFamily: P.fuente, boxShadow: "0 30px 60px rgba(0,0,0,.45)", opacity: entra(local, 2), transform: `translateY(${(1 - entra(local, 2)) * -30 * u}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 * u, fontSize: 38 * u, fontWeight: 700 }}>
            <Icono nombre="search" defecto="search" tam={38 * u} color="#1d1517" />
            <span>{busca.slice(0, letras)}</span>
          </div>
          <div style={{ marginTop: 10 * u, fontSize: 32 * u, fontWeight: 800, color: luz > 0.5 ? "#1f9a5f" : "#b0453d", display: "flex", alignItems: "center", gap: 10 * u }}>
            {luz > 0.5 ? <Icono nombre="check" defecto="check" tam={34 * u} color="#1f9a5f" /> : null}
            {luz > 0.5 ? `${ed.nombre ?? "Tu negocio"} · abierto ahora` : "Buscando…"}
          </div>
        </div>
      ) : null}
      {e.titulo && luz > 0.5 ? (
        <div style={{ position: "absolute", left: area.x, width: area.ancho, top: area.y + (busca ? 230 * u : 40 * u) }}>
          <div style={{ textAlign: "center", fontFamily: P.fuente, fontWeight: 900, fontSize: tamQueCabe(e.titulo, area.ancho * 1.8, 72 * u, 0.62), lineHeight: 1.1, color: "#fff", textShadow: `0 0 30px ${P.rosa}, 0 0 60px ${P.rosa}`, opacity: entra(local, enciende, 8), transform: `scale(${interpolate(resorte(local, enciende, fps, 10, 180), [0, 1], [0.7, 1])})` }}>
            {e.titulo}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------- celular: un perfil que se llena de videos ----------------
const Celular: React.FC<Props> = ({ e, ed, m, local, area, P }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  const horizontal = area.ancho > area.alto * 1.25;
  const u = unidad(area) * (horizontal ? 0.95 : 0.95);
  const n = Math.min(4, e.puntos.length);
  const altoTarjeta = (e.titulo ? 220 : 90) * u + n * 118 * u;
  const caja = horizontal
    ? { x: area.x, y: area.y, w: area.ancho * 0.4, h: area.alto }
    : { x: area.x, y: area.y, w: area.ancho, h: Math.max(area.alto * 0.42, area.alto - altoTarjeta - 30 * u) };
  const tarjeta = horizontal
    ? { x: area.x + area.ancho * 0.42, y: area.y + Math.max(0, (area.alto - altoTarjeta) * 0.45), ancho: area.ancho * 0.58 }
    : { x: area.x, y: caja.y + caja.h + 20 * u, ancho: area.ancho };
  const D = 30;
  const k = pxPorUnidad(D, H);
  const alto = Math.min(caja.h * 0.94, caja.w * 0.94 * 2);
  const escala = alto / k / 11.2;
  const [px, py] = aMundo(caja.x + caja.w / 2, caja.y + caja.h / 2, D, W, H);
  const tel = resorte(local, 0, fps, 13, 90);
  const llena = m[0] ?? 10;
  const colores = [P.acento, P.rosa, P.acento2, P.amarillo, P.verde, mezclar(P.acento, "#ff8a5c", 0.5)];
  const cuenta = ed.nombre ? (ed.nombre.startsWith("@") ? ed.nombre : `@${ed.nombre.replace(/\s+/g, "").toLowerCase()}`) : "@tu.cuenta";
  const pantalla = useInterfaz((x) => {
    x.clearRect(0, 0, 520, 1080);
    rect(x, 0, 0, 520, 1080, 40, "#0e0d14");
    x.beginPath();
    x.arc(92, 120, 54, 0, Math.PI * 2);
    x.fillStyle = P.rosa;
    x.fill();
    escribir(x, P, cuenta, 168, 100, 800, 38, P.texto, "left", 330);
    rect(x, 168, 136, 150, 50, 14, P.acento);
    escribir(x, P, "Seguir", 243, 162, 800, 26, "#fff", "center");
    for (let i = 0; i < 12; i++) rect(x, 26 + (i % 3) * 160, 230 + Math.floor(i / 3) * 206, 148, 194, 12, "#1d1b26");
  }, 520, 1080);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 30%, ${mezclar(P.rosa, "#07070c", 0.7)}, #07070c 70%)` }} />
      <Lienzo w={W} h={H} cam={[0, 0, D]}>
        <Luces tono={P.rosa} />
        <group scale={escala} position={[px + (1 - tel) * -14, py, 0]} rotation={[0.06, 0.32 + Math.sin(local / 30) * 0.1 - (1 - tel) * 2, -0.04]}>
          <Caja p={[0, 0, 0]} t={[5.6, 11.2, 0.5]} color="#1a1824" metal={0.6} />
          <mesh position={[0, 0, 0.26]}>
            <planeGeometry args={[5.2, 10.8]} />
            <meshBasicMaterial map={pantalla} toneMapped={false} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const v = resorte(local, llena + 4 + i * 3, fps, 10, 180);
            // Del lienzo de la pantalla (520 × 1080) a la cara del celular (5.2 × 10.8).
            const cx = ((26 + (i % 3) * 160 + 74) / 520 - 0.5) * 5.2;
            const cy = (0.5 - (230 + Math.floor(i / 3) * 206 + 97) / 1080) * 10.8;
            return v > 0.001 ? <Caja key={i} p={[cx, cy, 0.3 + v * 0.35 * (1 + Math.sin(local / 8 + i) * 0.3)]} t={[1.45 * v, 1.9 * v, 0.3]} color={colores[i % 6]} brillo={0.25} /> : null;
          })}
        </group>
        {local >= llena
          ? Array.from({ length: 8 }, (_, i) => {
              const c = ((local - llena + i * 13) % 90) / 90;
              return (
                <group key={i} position={[px + (random(`hx${i}`) - 0.5) * 14, -12 + c * 26, -4 + random(`hz${i}`) * 6]} rotation={[0, local / 15 + i, 0]} scale={0.32 * Math.sin(c * Math.PI)}>
                  <Voxeles mapa={CORAZON} pal={{ "#": i % 3 ? P.rosa : "#ff4d6d" }} prof={1.2} brilloDe={() => 0.4} />
                </group>
              );
            })
          : null}
      </Lienzo>
      <Tarjeta e={e} m={m} local={local} P={P} x={tarjeta.x} y={tarjeta.y} ancho={tarjeta.ancho} u={u} color={P.rosa} tipo="pasos" etiqueta={null} />
    </AbsoluteFill>
  );
};

// ---------------- cohete: despega con una frase ----------------
const Cohete: React.FC<Props> = ({ e, ed, m, local, dur, area, P }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  const D = 30;
  const k = pxPorUnidad(D, H);
  // Despega cuando se dice (o a la mitad), nunca en los primeros cuadros ni al final.
  const despega = Math.max(20, Math.min(Math.max(m[0] ?? 0, Math.round(dur * 0.55)), dur - 30));
  const flota = interpolate(local, [0, despega], [0, 1.2], LIMITE);
  const sube = interpolate(local, [despega, despega + 60], [0, H / k + 10], { ...LIMITE, easing: (x) => x * x });
  const tiembla = local < despega ? (random(`e${local}`) - 0.5) * 0.25 : 0;
  const tamPx = Math.min(area.ancho * 0.42, area.alto * 0.36);
  const escala = tamPx / k / 14;
  const [, cy] = aMundo(W / 2, area.y + area.alto * 0.7, D, W, H);
  const pal = { w: "#f4f2ff", b: P.acento2, c: mezclar(P.acento2, "#ffffff", 0.6), r: P.rosa, o: P.amarillo };
  const u = unidad(area);
  const v = resorte(local, 2, fps, 9, 200);
  const ancho = W / k;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, #050412, ${mezclar(P.acento, "#050412", 0.75)} 70%, ${mezclar(P.acento, "#050412", 0.55)})` }} />
      <Lienzo w={W} h={H} cam={[tiembla, tiembla, D]}>
        <Luces tono={P.rosa} />
        {Array.from({ length: 30 }, (_, i) => {
          const y = 25 - ((random(`ey${i}`) * 50 + local * (0.6 + random(`ev${i}`) * 0.8)) % 50);
          return <Caja key={i} p={[(random(`ex${i}`) - 0.5) * ancho, y, -14 + random(`ez${i}`) * 10]} t={[0.07, 0.6 + random(`el${i}`) * 1.2, 0.07]} color="#ffffff" brillo={1} opacidad={0.6} />;
        })}
        <group position={[0, cy + flota + sube, 0]} rotation={[0.15, Math.sin(local / 14) * 0.45, 0]} scale={escala}>
          <Voxeles mapa={COHETE} pal={pal} prof={3} brilloDe={(c) => (c === "o" ? 1 : c === "b" ? 0.4 : 0)} />
          {Array.from({ length: 18 }, (_, i) => {
            const c = ((local * 3 + i * 7) % 30) / 30;
            const col = c < 0.3 ? "#fff6c2" : c < 0.6 ? P.amarillo : P.rosa;
            const s = 1.2 * (1 - c) + 0.2;
            return <Caja key={i} p={[(random(`fx${i}`) - 0.5) * 3 * c, -7 - c * 9, (random(`fz${i}`) - 0.5) * 3 * c]} t={[s, s, s]} r={[c * 5, c * 3, 0]} color={col} brillo={2} opacidad={1 - c * 0.8} />;
          })}
        </group>
        <pointLight position={[0, cy + flota + sube - 5, 3]} intensity={50} color={P.amarillo} />
      </Lienzo>
      <div style={{ position: "absolute", left: area.x, width: area.ancho, top: area.y + area.alto * 0.04 }}>
        <TituloGrande texto={e.titulo ?? ""} P={P} ancho={area.ancho * 0.94} maximo={118 * u} v={v} colores={[P.amarillo, P.rosa]} />
        {ed.sub ? <div style={{ marginTop: 24 * u, textAlign: "center", fontFamily: P.fuente, fontWeight: 800, fontSize: tamQueCabe(ed.sub, area.ancho * 1.6, 44 * u, 0.58), color: P.suave, opacity: entra(local, 14) }}>{ed.sub}</div> : null}
      </div>
      <AbsoluteFill style={{ background: "#fff", opacity: interpolate(local, [0, 6], [0.4, 0], LIMITE) }} />
    </AbsoluteFill>
  );
};

// ---------------- confeti: personajes, confeti y la invitación final ----------------
const Confeti: React.FC<Props> = ({ e, ed, m, local, area, P }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  const D = 30;
  const k = pxPorUnidad(D, H);
  const elenco = useMemo(
    () => [
      { mapa: FRENTE, pal: paletaPersona(P) },
      { mapa: TENDERA, pal: paletaTendera(P) },
      ...[TRANSEUNTES[0], TRANSEUNTES[2]].map((s) => ({ mapa: s.frente, pal: s.paleta })),
    ],
    [P],
  );
  const altoPx = Math.min(area.alto * (area.ancho > area.alto * 1.25 ? 0.28 : 0.24), (area.ancho / 4.6) * (21 / 16));
  const tam = altoPx / k / 21;
  const [, fy] = aMundo(W / 2, area.y + area.alto - altoPx * 0.62, D, W, H);
  const anchoMundo = W / k;
  const paso = Math.min(anchoMundo * 0.22, area.ancho / k / 4, (altoPx / k) * 1.15);
  const boton = resorte(local, m[0] ?? 14, fps, 9, 200);
  const u = unidad(area);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${mezclar(P.acento, "#07070c", 0.6)}, #07070c 75%)` }} />
      <Lienzo w={W} h={H} cam={[Math.sin(local / 40) * 0.6, 0, D]}>
        <Luces tono={P.acento} />
        {local > 6
          ? Array.from({ length: 90 }, (_, i) => {
              // Primero una explosión y después sigue cayendo confeti.
              const t = i < 45 ? local - 6 : (local - 6 + random(`ct${i}`) * 120) % 120;
              const x = (random(`cx${i}`) - 0.5) * anchoMundo * 1.1 * (i < 45 ? Math.min(1, t / 18) : 1);
              const y = H / k / 2 + 2 + random(`cy${i}`) * 6 - t * t * 0.004 * (0.5 + random(`cg${i}`)) + (i < 45 ? Math.min(1, t / 10) * 4 : 0);
              return <Caja key={i} p={[x, y, (random(`cz${i}`) - 0.5) * 12]} t={[0.35, 0.55, 0.04]} r={[t * 0.2 * random(`r1${i}`), t * 0.15, t * 0.1 * random(`r2${i}`)]} color={[P.acento, P.rosa, P.amarillo, P.acento2, P.verde][i % 5]} brillo={0.3} />;
            })
          : null}
        {elenco.map((s, i) => {
          const v = resorte(local, 10 + i * 5, fps, 10);
          return (
            <group key={i} position={[(i - 1.5) * paso, fy - (1 - v) * 14 + Math.max(0, Math.sin(local / 6 + i)) * 0.6, 0]} rotation={[0, Math.sin(local / 15 + i) * 0.4, 0]}>
              <Voxeles mapa={s.mapa} pal={s.pal} tam={tam} prof={1.6} />
            </group>
          );
        })}
      </Lienzo>
      <div style={{ position: "absolute", left: area.x, width: area.ancho, top: area.y + area.alto * 0.06, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 * u }}>
        <TituloGrande texto={e.titulo ?? ""} P={P} ancho={area.ancho * 0.94} maximo={110 * u} v={entra(local, 0, 12)} />
        {ed.sub ? (
          <div style={{ maxWidth: area.ancho, boxSizing: "border-box", padding: `${26 * u}px ${56 * u}px`, borderRadius: 999, background: `linear-gradient(90deg, ${P.acento}, ${P.rosa})`, fontFamily: P.fuente, fontWeight: 900, fontSize: tamQueCabe(ed.sub, area.ancho * 0.86, 76 * u, 0.66), color: "#fff", whiteSpace: "nowrap", transform: `scale(${boton * (1 + 0.03 * Math.sin(local / 4))}) perspective(700px) rotateX(${(1 - boton) * 60}deg)`, boxShadow: `0 14px 0 ${P.oscuro}, 0 0 90px ${P.rosa}88` }}>
            {ed.sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const ESCENAS: Record<Escena3D["escena"], React.FC<Props>> = { plataformas: Plataformas, cuarto: Cuarto, calle: Calle, celular: Celular, cohete: Cohete, confeti: Confeti };

export const Escenario3D: React.FC<{ item: ItemEscenario; area: Area }> = ({ item, area }) => {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const P = useMemo(() => paletaDe(marca), [marca]);
  const { elemento: e, duracionFrames: dur } = item;
  const ed: Escena3D = e.escenario3d ?? { escena: "plataformas", pantallas: null, nombre: null, sub: null };
  // Lo último que aparece necesita ~1.8 s para leerse.
  const m = momentosLegibles(item.momentos, Math.max(item.momentos.length, e.puntos.length), dur, fps);
  const Escena = ESCENAS[ed.escena];
  return <Escena e={e} ed={ed} m={m} local={local} dur={dur} area={area} P={P} />;
};

// Sonidos propios de cada escena 3D (frames relativos a la escena).
export const golpesEscenario3D = (e: ElementoApoyo, dur: number, momentos: number[] = [], fps = 30) => {
  const q = e.escenario3d?.escena;
  const m = momentosLegibles(momentos, Math.max(momentos.length, e.puntos.length), dur, fps);
  return q === "plataformas" ? [{ frame: finalMosaico(m, dur, fps), sonido: "brillo" as const }]
    : q === "calle" ? [{ frame: m[0] ?? Math.round(dur * 0.3), sonido: "brillo" as const }]
    : q === "celular" ? m.slice(0, e.puntos.length).map((f) => ({ frame: f, sonido: "ding" as const }))
    : q === "cohete" ? [{ frame: Math.max(20, Math.min(Math.max(m[0] ?? 0, Math.round(dur * 0.55)), dur - 30)), sonido: "whoosh" as const }]
    : q === "confeti" && e.escenario3d?.sub ? [{ frame: m[0] ?? 14, sonido: "ding" as const }]
    : [];
};
