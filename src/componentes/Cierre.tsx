import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Bookmark, Calendar, Check, Globe, Heart, Link, MessageCircle, MessageSquareText, Phone, Pointer, Share2,
  ShoppingCart, Sparkles, UserPlus, type LucideIcon,
} from "lucide-react";
import { useMarca } from "../edicion/estilos";

// Tarjeta final con la llamada a la acción que escribió la persona, con diseño (sin nombre ni logo
// de ByDzyne). Del texto se adivina la acción (WhatsApp, seguir, comentar, link en la bio…) para
// poner un ícono y un botón que se "toca". Las palabras entre comillas o en MAYÚSCULAS (y la red o
// la acción, si se nombra) van resaltadas. Si no se reconoce la acción, va sin botón.

type Accion = { icono: LucideIcon; boton: string | null; color: string | null; clave: RegExp | null };

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ACCIONES: { si: RegExp; a: Accion }[] = [
  { si: /whats|wasap|wpp|\bwa\b/, a: { icono: MessageCircle, boton: "WhatsApp", color: "#25D366", clave: /whats\w*|wasap|wpp/i } },
  { si: /coment/, a: { icono: MessageSquareText, boton: "Comentar", color: null, clave: /coment\w*/i } },
  { si: /\bsigu|\bsiga|\bseguir|follow/, a: { icono: UserPlus, boton: "Seguir", color: null, clave: /s[ií]gue\w*|siga\w*|seguir\w*/i } },
  { si: /\blink\b|enlace|\bbio\b/, a: { icono: Link, boton: "Link en la bio", color: null, clave: /link|enlace|bio/i } },
  { si: /llam|telefon|\bcel\b/, a: { icono: Phone, boton: "Llamar", color: null, clave: /ll[aá]m\w*/i } },
  { si: /agend|\bcita|reserv/, a: { icono: Calendar, boton: "Agendar", color: null, clave: /agend\w*|cita|reserv\w*/i } },
  { si: /compr|pedid|\bpide|ordena|tienda/, a: { icono: ShoppingCart, boton: "Pedir ahora", color: null, clave: /compr\w*|pid\w*|pedid\w*|ordena\w*/i } },
  { si: /guard/, a: { icono: Bookmark, boton: "Guardar", color: null, clave: /guard\w*/i } },
  { si: /compart/, a: { icono: Share2, boton: "Compartir", color: null, clave: /compart\w*/i } },
  { si: /\bweb\b|\.com|pagina/, a: { icono: Globe, boton: "Visitar", color: null, clave: /web|\S+\.com\S*/i } },
  { si: /\blike\b|me gusta|dale/, a: { icono: Heart, boton: "Me gusta", color: "#ff4d6d", clave: /like|gusta/i } },
];

export const accionDe = (texto: string): Accion => {
  const t = sinTildes(texto);
  return ACCIONES.find((x) => x.si.test(t))?.a ?? { icono: Sparkles, boton: null, color: null, clave: null };
};

// Partes del texto: resaltadas las palabras entre comillas, en MAYÚSCULAS o la palabra clave de la acción.
const partir = (texto: string, clave: RegExp | null) => {
  const entreComillas = new Set<string>();
  for (const m of texto.matchAll(/["“«]([^"”»]{1,30})["”»]/g)) for (const p of m[1].split(/\s+/)) entreComillas.add(p);
  const partes = texto
    .replace(/["“”«»]/g, "")
    .trim()
    .split(/\s+/)
    .map((p) => {
      const limpia = p.replace(/[.,:;!¡?¿]/g, "");
      const mayus = limpia.length >= 2 && limpia === limpia.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(limpia);
      return { p, limpia, propia: entreComillas.has(limpia) || mayus };
    });
  // Si la persona ya marcó algo (comillas o MAYÚSCULAS), solo eso; si no, la palabra de la acción.
  const marco = partes.some((x) => x.propia);
  return partes.map((x) => ({ p: x.p, resaltar: marco ? x.propia : Boolean(clave && clave.test(x.limpia)) }));
};

const CierreCorto: React.FC<{ texto: string }> = ({ texto }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const vertical = height > width;
  const accion = accionDe(texto);
  const Icono = accion.icono;
  const colorAccion = accion.color ?? marca.colores.acento;
  const sobreAccion = accion.color ? "#ffffff" : marca.colores.textoSobreAcento;
  const partes = partir(texto, accion.clave);
  const larga = texto.length > 45;

  const icono = spring({ frame, fps, config: { damping: 11, stiffness: 160 } });
  const anillo = frame > 8 ? ((frame - 8) % 30) / 30 : 0;
  const palabra = (i: number) => spring({ frame: frame - 5 - i * 2, fps, config: { damping: 14 } });
  const inicioBoton = 12 + partes.length * 2;
  const boton = spring({ frame: frame - inicioBoton, fps, config: { damping: 12 } });
  const toque = inicioBoton + 14;
  const mano = interpolate(frame, [inicioBoton + 4, toque], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const aprieta = interpolate(frame, [toque - 2, toque + 2, toque + 7], [1, 0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const onda = interpolate(frame, [toque, toque + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const late = frame > toque + 7 ? 1 + 0.035 * Math.sin((frame - toque) / 4) : 1;

  const tamIcono = base * (vertical ? 0.22 : 0.17);
  const tamTexto = base * (larga ? 0.068 : vertical ? 0.088 : 0.075);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: `radial-gradient(circle at 50% 38%, ${marca.colores.primario}, ${marca.colores.fondo} 72%)`,
        fontFamily: marca.fuente,
        color: marca.colores.texto,
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Brillos que flotan al fondo */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = ((i * 137) % 100) / 100;
        const y = ((i * 71 + 13) % 100) / 100;
        const t = base * (0.012 + ((i * 7) % 5) * 0.004);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x * width,
              top: y * height - ((frame * (0.6 + (i % 3) * 0.3)) % (height * 0.2)),
              width: t,
              height: t,
              borderRadius: t * 0.25,
              rotate: `${frame * 2 + i * 30}deg`,
              background: i % 2 ? marca.colores.acento : marca.colores.texto,
              opacity: 0.18,
            }}
          />
        );
      })}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: base * 0.05, padding: `0 ${width * 0.08}px`, maxWidth: width }}>
        {/* Ícono de la acción con anillo que late */}
        <div style={{ position: "relative", width: tamIcono, height: tamIcono, scale: String(icono) }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `${base * 0.008}px solid ${colorAccion}`, scale: String(1 + anillo * 0.6), opacity: 1 - anillo }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: colorAccion,
              display: "grid",
              placeItems: "center",
              boxShadow: `0 0 ${base * 0.08}px ${colorAccion}99`,
            }}
          >
            <Icono size={tamIcono * 0.52} color={sobreAccion} strokeWidth={2.2} />
          </div>
        </div>

        {/* La frase, palabra por palabra, con las claves resaltadas */}
        <div style={{ fontSize: tamTexto, fontWeight: 900, lineHeight: 1.18, display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: tamTexto * 0.28, rowGap: tamTexto * 0.12 }}>
          {partes.map(({ p, resaltar }, i) => {
            const v = palabra(i);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: v,
                  translate: `0 ${(1 - v) * tamTexto * 0.6}px`,
                  ...(resaltar
                    ? { background: colorAccion, color: sobreAccion, padding: `0 ${tamTexto * 0.18}px`, borderRadius: tamTexto * 0.18, rotate: "-2deg" }
                    : {}),
                }}
              >
                {p}
              </span>
            );
          })}
        </div>

        {/* Botón que se "toca" */}
        {accion.boton && (
          <div style={{ position: "relative", opacity: boton, scale: String(interpolate(boton, [0, 1], [0.6, 1]) * aprieta * late) }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 999, border: `${base * 0.006}px solid ${colorAccion}`, scale: String(1 + onda * 0.35), opacity: onda > 0 ? 1 - onda : 0 }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: base * 0.02,
                padding: `${base * 0.028}px ${base * 0.06}px`,
                borderRadius: 999,
                background: colorAccion,
                color: sobreAccion,
                fontSize: base * 0.05,
                fontWeight: 800,
                boxShadow: `0 ${base * 0.015}px ${base * 0.05}px ${colorAccion}88`,
              }}
            >
              <Icono size={base * 0.055} strokeWidth={2.4} />
              {accion.boton}
            </div>
            <Pointer
              size={base * 0.085}
              color="#ffffff"
              fill="#111111"
              strokeWidth={1.6}
              style={{
                position: "absolute",
                right: -base * 0.03,
                bottom: -base * 0.06,
                translate: `${mano * base * 0.12}px ${mano * base * 0.16}px`,
                opacity: interpolate(boton, [0.5, 1], [0, 1], { extrapolateLeft: "clamp" }),
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,.5))",
              }}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Texto largo con varias líneas (por ejemplo una lista con ✅): se muestra COMPLETO como tarjeta de lista.
// Arriba el título (lo que va antes de la lista), luego cada punto con su chulo, apareciendo uno por uno,
// y abajo las notas y la firma. La letra se achica sola para que todo quepa.
const MARCA_PUNTO = /^\s*(?:[✅✔☑✓•·▪►➤➡*-]|\d+[.)])\uFE0F?\s*/u;
export const esCierreLargo = (texto: string) => texto.split("\n").filter((l) => l.trim()).length >= 2;

export const partirLargo = (texto: string) => {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const primero = lineas.findIndex((l) => MARCA_PUNTO.test(l));
  let ultimo = -1;
  lineas.forEach((l, i) => { if (MARCA_PUNTO.test(l)) ultimo = i; });
  if (primero === -1) return { titulo: lineas[0], puntos: [] as string[], notas: lineas.slice(1) };
  return {
    titulo: lineas.slice(0, primero).join(" "),
    puntos: lineas.slice(primero, ultimo + 1).map((l) => l.replace(MARCA_PUNTO, "")).filter(Boolean),
    notas: lineas.slice(ultimo + 1),
  };
};

const CierreLargo: React.FC<{ texto: string }> = ({ texto }) => {
  const marca = useMarca();
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const base = Math.min(width, height);
  const { titulo, puntos, notas } = partirLargo(texto);
  const acento = marca.colores.acento;
  const sobre = marca.colores.textoSobreAcento;

  // Tamaño de letra: el más grande con el que todo cabe en el alto disponible.
  const util = width * 0.8;
  const altoDe = (t: number) => {
    const filas = (txt: string, tam: number, ancho: number) => Math.max(1, Math.ceil((txt.length * tam * 0.56) / ancho));
    const tTitulo = t * 1.25;
    return (
      (titulo ? filas(titulo, tTitulo, util) * tTitulo * 1.2 + t * 0.9 : 0) +
      puntos.reduce((n, p) => n + filas(p, t, util - t * 1.9) * t * 1.28 + t * 0.55, 0) +
      notas.reduce((n, p) => n + filas(p, t * 0.85, util) * t * 0.85 * 1.3 + t * 0.4, 0)
    );
  };
  let tam = base * 0.06;
  while (tam > base * 0.022 && altoDe(tam) > height * 0.8) tam *= 0.95;

  const total = Math.max(1, puntos.length + notas.length);
  const finEntrada = Math.max(20, durationInFrames * 0.5);
  const paso = (finEntrada - 12) / total;
  const entra = (i: number) => spring({ frame: frame - 12 - i * paso, fps, config: { damping: 14 } });
  const tituloV = spring({ frame, fps, config: { damping: 13 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: `radial-gradient(circle at 50% 30%, ${marca.colores.primario}, ${marca.colores.fondo} 75%)`,
        fontFamily: marca.fuente,
        color: marca.colores.texto,
        overflow: "hidden",
      }}
    >
      <div style={{ width: util, display: "flex", flexDirection: "column", gap: tam * 0.55 }}>
        {titulo && (
          <div
            style={{
              fontSize: tam * 1.25,
              fontWeight: 900,
              lineHeight: 1.2,
              marginBottom: tam * 0.35,
              opacity: tituloV,
              translate: `0 ${(1 - tituloV) * tam}px`,
            }}
          >
            {titulo}
          </div>
        )}
        {puntos.map((p, i) => {
          const v = entra(i);
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: tam * 0.5, opacity: v, translate: `${(1 - v) * -tam * 1.5}px 0` }}>
              <div
                style={{
                  flex: "none",
                  width: tam * 1.25,
                  height: tam * 1.25,
                  borderRadius: "50%",
                  background: acento,
                  display: "grid",
                  placeItems: "center",
                  scale: String(0.6 + 0.4 * v),
                  marginTop: tam * 0.02,
                }}
              >
                <Check size={tam * 0.85} color={sobre} strokeWidth={3.2} />
              </div>
              <div style={{ fontSize: tam, fontWeight: 700, lineHeight: 1.28 }}>{p}</div>
            </div>
          );
        })}
        {notas.map((n, j) => {
          const v = entra(puntos.length + j);
          const firma = j === notas.length - 1 && notas.length > 1;
          return (
            <div
              key={j}
              style={{
                fontSize: tam * 0.85,
                lineHeight: 1.3,
                fontWeight: firma ? 800 : 600,
                marginTop: j === 0 ? tam * 0.4 : 0,
                opacity: v,
                ...(firma
                  ? { color: acento }
                  : { padding: `${tam * 0.35}px ${tam * 0.5}px`, borderRadius: tam * 0.35, background: "rgba(255,255,255,0.08)", borderLeft: `${tam * 0.12}px solid ${acento}` }),
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Cierre: React.FC<{ texto: string }> = ({ texto }) =>
  esCierreLargo(texto) ? <CierreLargo texto={texto} /> : <CierreCorto texto={texto} />;

