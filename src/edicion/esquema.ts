import { z } from "zod";
import { buscarIcono } from "../componentes/iconos";

export const FPS = 30;

export const formatos = ["9:16", "4:5", "1:1", "16:9"] as const;
export type Formato = (typeof formatos)[number];

export const DIMENSIONES: Record<Formato, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

// Elementos gráficos sobre el video. `inicio`, `fin` y `en` son segundos del video original,
// igual que las palabras, así que siguen a los cortes.
const tramo = { inicio: z.number().min(0), fin: z.number().positive() };

const nombreIcono = z.string().refine((n) => buscarIcono(n) !== null, {
  message: "Ícono desconocido: usa un nombre en español de src/componentes/iconos.ts o uno de lucide.dev/icons",
});

export const esquemaElemento = z.discriminatedUnion("tipo", [
  // Motion explicativo: título + puntos que aparecen uno a uno.
  z.object({
    tipo: z.literal("lista"),
    ...tramo,
    titulo: z.string().nullable().default(null),
    puntos: z.array(z.object({ texto: z.string(), en: z.number() })).min(1).max(6),
  }),
  // Lettering: frase grande a pantalla completa.
  z.object({
    tipo: z.literal("lettering"),
    ...tramo,
    texto: z.string().min(1),
    // Palabra(s) que van en color de acento.
    destacar: z.string().nullable().default(null),
    // "video" = sobre el video, junto a la cara; "color" = tarjeta de color a pantalla completa.
    // ("marca" es el nombre anterior de "color".)
    fondo: z
      .enum(["video", "color", "marca"])
      .default("video")
      .transform((f) => (f === "marca" ? "color" : f)),
  }),
  // Ícono animado con etiqueta opcional.
  z.object({
    tipo: z.literal("icono"),
    ...tramo,
    icono: nombreIcono,
    texto: z.string().nullable().default(null),
    posicion: z.enum(["arriba-derecha", "arriba-izquierda", "arriba", "centro"]).default("arriba-derecha"),
  }),
  // Foto, captura o imagen de public/ (por ejemplo "imagenes/producto.jpg").
  z.object({
    tipo: z.literal("imagen"),
    ...tramo,
    archivo: z.string().min(1),
    modo: z.enum(["tarjeta", "pantalla-completa"]).default("tarjeta"),
    texto: z.string().nullable().default(null),
  }),

  // --- Escenas 3D: el video entero se transforma (la cara siempre queda a la vista). ---

  // Montaje en capas 3D: el video se vuelve una tarjeta que gira, con título e íconos en capas.
  z.object({
    tipo: z.literal("capas"),
    ...tramo,
    titulo: z.string().min(1),
    iconos: z.array(nombreIcono).max(3).default([]),
  }),
  // Perspectiva 3D: el video se pliega hacia un lado y una frase grande ocupa el otro.
  z.object({
    tipo: z.literal("perspectiva"),
    ...tramo,
    texto: z.string().min(1),
    destacar: z.string().nullable().default(null),
    // Lado donde va la frase.
    lado: z.enum(["izquierda", "derecha"]).default("izquierda"),
  }),
  // Tutorial 3D: capturas dentro de un celular o navegador en 3D; la persona en una ventana.
  z.object({
    tipo: z.literal("tutorial"),
    ...tramo,
    titulo: z.string().nullable().default(null),
    marco: z.enum(["celular", "navegador"]).default("celular"),
    pasos: z
      .array(
        z.object({
          archivo: z.string().min(1),
          texto: z.string().nullable().default(null),
          en: z.number(),
        }),
      )
      .min(1)
      .max(6),
  }),
  // 3D explicativo: una imagen (objeto, maqueta, producto) que gira en 3D, con etiquetas.
  z.object({
    tipo: z.literal("objeto3d"),
    ...tramo,
    archivo: z.string().min(1),
    titulo: z.string().nullable().default(null),
    etiquetas: z.array(z.object({ texto: z.string(), en: z.number() })).max(5).default([]),
  }),
]);

export type Elemento = z.infer<typeof esquemaElemento>;

export const TIPOS_ESCENA = ["capas", "perspectiva", "tutorial", "objeto3d"] as const;
export type ElementoEscena = Extract<Elemento, { tipo: (typeof TIPOS_ESCENA)[number] }>;
export type ElementoSobreVideo = Exclude<Elemento, ElementoEscena>;

// Estructura de public/proyectos/<id>/edicion.json (la crea `npm run preparar`).
// Tiempos en segundos del video original.
export const esquemaEdicion = z.object({
  version: z.literal(1),
  id: z.string(),
  video: z.string(),
  ancho: z.number().positive(),
  alto: z.number().positive(),
  duracion: z.number().positive(),
  opciones: z.object({
    formato: z.enum(formatos),
    // Punto del video que queda centrado al recortar (0 = izquierda/arriba, 1 = derecha/abajo).
    // "auto" = sigue a la cara (necesita `caras`); sin cara, centra.
    enfoqueX: z.union([z.number().min(0).max(1), z.literal("auto")]),
    enfoqueY: z.union([z.number().min(0).max(1), z.literal("auto")]),
    subtitulos: z.boolean(),
    estiloSubtitulos: z.enum(["palabra", "frase"]),
    // Altura del centro de los subtítulos (0 = arriba, 1 = abajo).
    posicionSubtitulos: z.number().min(0).max(1),
    // Alterna un acercamiento en cada corte para disimular los saltos.
    zoomEnCortes: z.boolean(),
    gancho: z.string().nullable(),
    duracionGancho: z.number().positive(),
    cierre: z
      .object({ texto: z.string(), duracion: z.number().positive() })
      .nullable(),
  }),
  segmentos: z
    .array(
      z.object({
        inicio: z.number().min(0),
        fin: z.number().positive(),
        // Opcional: acercamiento propio de este tramo (1 = sin zoom, 1.2 = 20 % más cerca).
        zoom: z.number().min(1).max(3).optional(),
      }),
    )
    .min(1),
  palabras: z.array(z.object({ texto: z.string(), inicio: z.number(), fin: z.number() })),
  // Acercamientos de énfasis (por ejemplo, cuando se dice una palabra clave).
  enfasis: z
    .array(z.object({ inicio: z.number(), fin: z.number(), zoom: z.number().min(1).max(2) }))
    .default([]),
  elementos: z.array(esquemaElemento).default([]),
  // Cara principal cada `cada` segundos: [x, y, ancho, alto] en fracciones del video original.
  // La llena `npm run preparar` o `npm run caras`; no se edita a mano.
  caras: z
    .object({
      cada: z.number().positive(),
      cuadros: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable()),
    })
    .nullable()
    .default(null),
});

export type Edicion = z.infer<typeof esquemaEdicion>;

// Props editables desde Remotion Studio.
export const esquemaProps = z.object({
  proyecto: z.string(),
  // null = usa el formato guardado en edicion.json
  formato: z.enum(formatos).nullable(),
});

export type PropsEditado = z.infer<typeof esquemaProps> & { edicion?: Edicion };
