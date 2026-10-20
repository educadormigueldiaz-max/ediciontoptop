import { loadFont } from "@remotion/fonts";
import { createContext, useContext } from "react";
import { staticFile } from "remotion";
import { z } from "zod";
import { marca, type Marca } from "../marca";

// Estilos por cliente: cada archivo estilos/<cliente>.json cambia los colores y las fuentes del
// estilo predeterminado (src/marca.ts). edicion.json elige uno con "estilo": "<cliente>".

declare global {
  interface ImportMeta {
    webpackContext(
      carpeta: string,
      opciones: { recursive: boolean; regExp: RegExp },
    ): { keys(): string[]; (archivo: string): unknown };
  }
}

export const PREDETERMINADO = "predeterminado";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Usa un color como #E30613");

const esquemaFuente = z.object({
  // Nombre de la fuente, por ejemplo "Bebas Neue".
  familia: z.string().min(1),
  // Archivos .woff2, .ttf u .otf de public/fuentes. Si son varios grosores, di cuál es cada uno:
  // { "archivo": "fuentes/Marca-Black.ttf", "peso": "900" }. Sin archivos, la fuente tiene que
  // estar ya cargada en src/marca.ts.
  archivos: z
    .array(z.union([z.string(), z.object({ archivo: z.string(), peso: z.string() })]))
    .default([]),
  cursiva: z.boolean().default(false),
});
type Fuente = z.infer<typeof esquemaFuente>;

export const esquemaEstilo = z.object({
  // Nombre del cliente, solo para leerlo.
  nombre: z.string().optional(),
  colores: z
    .object({
      primario: color,
      secundario: color,
      acento: color,
      textoSobreAcento: color,
      texto: color,
      contorno: color,
      fondo: color,
    })
    .partial()
    .default({}),
  fuente: esquemaFuente.nullable().default(null),
  fuenteAlterna: esquemaFuente.nullable().default(null),
});

type Estilo = { marca: Marca; fuentes: Fuente[] } | { error: string };

// La carpeta estilos/ se lee al armar la vista previa; si cambia un archivo, se actualiza sola.
const archivos = import.meta.webpackContext("../../estilos", { recursive: false, regExp: /\.json$/ });

const estilos: Record<string, Estilo> = Object.fromEntries(
  archivos.keys().map((archivo) => {
    const nombre = archivo.replace(/^\.\//, "").replace(/\.json$/, "");
    const resultado = esquemaEstilo.safeParse(archivos(archivo));
    if (!resultado.success) {
      return [nombre, { error: `estilos/${nombre}.json tiene un error:\n${z.prettifyError(resultado.error)}` }];
    }
    const { colores, fuente, fuenteAlterna } = resultado.data;
    return [
      nombre,
      {
        marca: {
          fuente: fuente?.familia ?? marca.fuente,
          fuenteAlterna: fuenteAlterna?.familia ?? marca.fuenteAlterna,
          colores: { ...marca.colores, ...colores },
        },
        fuentes: [fuente, fuenteAlterna].filter((f): f is Fuente => f !== null),
      },
    ];
  }),
);

export const nombresDeEstilos = [PREDETERMINADO, ...Object.keys(estilos).filter((n) => n !== PREDETERMINADO)] as [
  string,
  ...string[],
];

// Devuelve el estilo o un error en palabras simples (estilo que no existe o mal escrito).
export const buscarEstilo = (nombre: string): { marca: Marca; fuentes: Fuente[] } => {
  if (nombre === PREDETERMINADO) return { marca, fuentes: [] };
  const estilo = estilos[nombre];
  if (!estilo) {
    throw new Error(
      `No existe el estilo "${nombre}". Crea estilos/${nombre}.json o usa uno de: ${nombresDeEstilos.join(", ")}`,
    );
  }
  if ("error" in estilo) throw new Error(estilo.error);
  return estilo;
};

// Las fuentes de un cliente se cargan solo cuando un video usa su estilo.
const cargadas = new Set<string>();
const cargarFuentes = (fuentes: Fuente[]) => {
  for (const fuente of fuentes) {
    fuente.archivos.forEach((a) => {
      const archivo = typeof a === "string" ? a : a.archivo;
      const clave = `${fuente.familia}|${archivo}`;
      if (cargadas.has(clave)) return;
      cargadas.add(clave);
      loadFont({
        family: fuente.familia,
        url: staticFile(archivo),
        // Un archivo sin peso sirve para todos los grosores.
        weight: typeof a === "string" ? "100 900" : a.peso,
        style: fuente.cursiva ? "italic" : "normal",
      });
    });
  }
};

const ContextoMarca = createContext<Marca>(marca);

// Colores y fuentes del estilo del video que se está dibujando.
export const useMarca = () => useContext(ContextoMarca);

export const ConEstilo: React.FC<{ estilo: string; children: React.ReactNode }> = ({ estilo, children }) => {
  const elegido = buscarEstilo(estilo);
  cargarFuentes(elegido.fuentes);
  return <ContextoMarca.Provider value={elegido.marca}>{children}</ContextoMarca.Provider>;
};
