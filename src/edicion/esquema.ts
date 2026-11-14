import { z } from "zod";
import { ENTRADAS, FONDOS, TRANSICIONES } from "./variantes";
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
// igual que las palabras, así que siguen a los cortes. `sonido: false` apaga su efecto de sonido.
const tramo = {
  inicio: z.number().min(0),
  fin: z.number().positive(),
  sonido: z.boolean().default(true),
};

const nombreIcono = z.string().refine((n) => buscarIcono(n) !== null, {
  message:
    "Ícono desconocido: usa un nombre en español de src/componentes/iconos.ts o uno de lucide.dev/icons",
});

// Ilustración animada de una escena de apoyo. Tiempos `t` en segundos desde que empieza la escena;
// `x` e `y` de 0 a 1 en el cuadro (0,0 = arriba a la izquierda); `ancho` en partes del ancho.
const punto = { t: z.number().min(0), x: z.number(), y: z.number() };
export const esquemaEscenaIlustrada = z.object({
  fondo: z
    .enum(["marca", "cielo", "atardecer", "noche", "claro"])
    .default("marca"),
  // La cámara recorre la escena: hacia dónde mira y cuánto se acerca en cada momento.
  camara: z
    .array(z.object({ ...punto, zoom: z.number().min(0.5).max(4).default(1) }))
    .default([]),
  capas: z
    .array(
      z.object({
        // SVG dentro de public/ (por ejemplo "proyectos/<id>/dibujos/formula1.svg").
        dibujo: z.string().min(1),
        x: z.number(),
        y: z.number(),
        ancho: z.number().positive().max(4),
        // -1 = al fondo (se mueve menos con la cámara y se ve un poco borroso), 1 = adelante.
        profundidad: z.number().min(-1).max(1).default(0),
        entrada: z
          .enum([
            "aparece",
            "abajo",
            "arriba",
            "izquierda",
            "derecha",
            "zoom",
            "ninguna",
          ])
          .default("aparece"),
        // Segundo (desde el inicio de la escena) en que entra; null = una tras otra al empezar.
        en: z.number().min(0).nullable().default(null),
        // Recorrido: a dónde va y cuándo (además de x/y del inicio).
        recorrido: z
          .array(
            z.object({
              ...punto,
              escala: z.number().positive().default(1),
              giro: z.number().default(0),
            }),
          )
          .default([]),
        efecto: z
          .enum(["flotar", "vibrar", "latir", "balanceo"])
          .nullable()
          .default(null),
        voltear: z.boolean().default(false),
        // Fondo que llena todo el cuadro (paisaje, pista, ciudad): se ignoran x, y y ancho.
        cubrir: z.boolean().default(false),
        // Partes del dibujo que se mueven solas: el `id` de un grupo <g> del SVG.
        partes: z
          .array(
            z.object({
              id: z.string().min(1),
              efecto: z.enum([
                "girar",
                "latir",
                "parpadear",
                "balanceo",
                "vibrar",
              ]),
              // Vueltas o ciclos por segundo.
              velocidad: z.number().positive().default(1.5),
            }),
          )
          .default([]),
      }),
    )
    .min(1)
    .max(10),
});

// Escenario animado de una escena de apoyo (`modo: "escenario"`): un mundo dibujado (un cuarto
// de noche o una calle al atardecer) con un personaje en pixeles, una cámara que va de la toma
// abierta a la de cerca y una ventana de app o navegador con lo que se dice; un cursor toca cada
// punto cuando la persona dice su `cue`. Las escenas seguidas del mismo mundo se sienten un solo lugar.
export const MUNDOS = ["cuarto", "calle"] as const;
export const PANTALLAS = ["mundo", "lista", "chips", "tarjetas", "aviso", "guion", "cierre", "web", "panel", "crm", "golpe", "mosaico", "perfil", "proceso"] as const;
// Qué muestra cada ventanita de `mosaico` (tienda, reservas, panel, crm) y de `proceso` (guion,
// voz, dibujo, musica), en el orden de los puntos. null = el orden de siempre.
export const VISTAS = ["tienda", "reservas", "panel", "crm", "guion", "voz", "dibujo", "musica"] as const;
export const esquemaEscenario = z.object({
  mundo: z.enum(MUNDOS).default("cuarto"),
  // mundo: solo el lugar y el personaje con un globo (el título). guion: lo que se dice, escrito
  // al ritmo de la voz. Las demás son ventanas con los puntos (ver la skill bydzyne-apoyo).
  pantalla: z.enum(PANTALLAS).default("lista"),
  // Texto de abajo en "aviso" y del botón en "cierre".
  sub: z.string().nullable().default(null),
  // Nombre del negocio o la página, solo si la persona lo dice (letrero de la calle, la web).
  nombre: z.string().max(24).nullable().default(null),
  // Calle: el negocio se abre (CERRADO → ABIERTO, se prenden las luces) o se cierra en esta escena.
  abierto: z.enum(["abrir", "cerrar"]).nullable().default(null),
  // Calle: una búsqueda que se escribe y no encuentra nada (por ejemplo "tu negocio cerca de mí").
  busqueda: z.string().max(40).nullable().default(null),
  vistas: z.array(z.enum(VISTAS)).max(4).nullable().default(null),
});

// Escenarios 3D (`modo: "escenario3d"`): escenas con objetos de cubitos y cámara en 3D, y los textos
// en 2D encima. plataformas: 2–4 pantallas 3D con su interfaz (tienda, reservas, panel, crm) y un
// título grande al final. cuarto: un cuarto de noche con una tarjeta de ideas. calle: un negocio
// que se enciende al atardecer. celular: un perfil que se llena de videos, con pasos. cohete: un
// cohete que despega con una frase. confeti: confeti, personajes y una invitación final.
export const ESCENAS_3D = ["plataformas", "cuarto", "calle", "celular", "cohete", "confeti"] as const;
export const VISTAS_3D = ["tienda", "reservas", "panel", "crm"] as const;
export const esquemaEscenario3D = z.object({
  escena: z.enum(ESCENAS_3D).default("plataformas"),
  // plataformas: qué interfaz muestra cada pantalla (en el orden de los puntos) y lo que se lee en
  // ella. tienda: productos. reservas: horas (y en `nota`, la cita confirmada). panel: métricas
  // ("Visitas" o "Visitas: 120", nunca dinero; en `nota`, el título de la gráfica). crm:
  // clientes "Nombre: lo que hizo".
  pantallas: z
    .array(
      z.object({
        vista: z.enum(VISTAS_3D),
        filas: z.array(z.string().max(40)).max(4).default([]),
        nota: z.string().max(40).nullable().default(null),
      }),
    )
    .max(4)
    .nullable()
    .default(null),
  // Letrero del negocio (calle), cuenta del perfil (celular), solo si la persona lo dice.
  nombre: z.string().max(24).nullable().default(null),
  // Calle: lo que se busca. confeti: el botón final. cohete: la línea de abajo.
  sub: z.string().max(60).nullable().default(null),
});
// Dónde va la escena de apoyo: completa (tapa el video y se oye la voz), encima (una tarjeta
// sobre el video, sin tapar la cara) o dividida (la animación arriba y la persona abajo; en
// horizontal, lado a lado).
export const UBICACIONES = ["completa", "encima", "dividida"] as const;

export const esquemaElemento = z.discriminatedUnion("tipo", [
  // Motion explicativo: título + puntos que aparecen uno a uno.
  z.object({
    tipo: z.literal("lista"),
    ...tramo,
    titulo: z.string().nullable().default(null),
    puntos: z
      .array(z.object({ texto: z.string(), en: z.number() }))
      .min(1)
      .max(6),
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
    posicion: z
      .enum(["arriba-derecha", "arriba-izquierda", "arriba", "centro"])
      .default("arriba-derecha"),
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
    etiquetas: z
      .array(z.object({ texto: z.string(), en: z.number() }))
      .max(5)
      .default([]),
  }),

  // --- Escena de apoyo: animación a pantalla completa, hecha por capas con profundidad, que
  // ilustra lo que se dice (como un video de apoyo). Tapa a la persona mientras dura: va en
  // momentos en que no hace falta verla. En los proyectos de solo audio llenan casi todo. ---
  z
    .object({
      tipo: z.literal("apoyo"),
      ...tramo,
      // concepto: ícono grande y título. dato: una cifra grande (siempre una que se dice).
      // pasos: 2–4 tarjetas que aparecen una a una. comparar: dos tarjetas, antes y después.
      // frase: cita grande palabra por palabra. imagen: una foto de public/ que flota en 3D.
      // camino: 2–4 pasos sobre un camino punteado que se dibuja de uno a otro.
      // escena: una ilustración animada (dibujos hechos para este video, por capas, con cámara).
      // video: un trozo de un video de apoyo (`npm run videos-apoyo`), desde el segundo `desde`.
      // escenario: un mundo con personaje, ventanas y cursor (ver `escenario`).
      modo: z
        .enum([
          "concepto",
          "dato",
          "pasos",
          "camino",
          "comparar",
          "frase",
          "imagen",
          "escena",
          "video",
          "escenario",
          "escenario3d",
        ])
        .default("concepto"),
      titulo: z.string().nullable().default(null),
      texto: z.string().nullable().default(null),
      destacar: z.string().nullable().default(null),
      icono: nombreIcono.nullable().default(null),
      cifra: z.string().max(14).nullable().default(null),
      puntos: z
        .array(
          z.object({
            texto: z.string().min(1),
            icono: nombreIcono.nullable().default(null),
            // Segundo en que aparece (null = se reparten solos, o cuando se dice `cue`).
            en: z.number().nullable().default(null),
            // Palabras exactas que dice la persona cuando aparece (escenarios).
            cue: z.string().nullable().default(null),
            // Número que se muestra (pantalla "panel"), solo uno que la persona dice.
            valor: z.string().max(16).nullable().default(null),
          }),
        )
        .max(4)
        .default([]),
      archivo: z.string().nullable().default(null),
      escena: esquemaEscenaIlustrada.nullable().default(null),
      escenario: esquemaEscenario.nullable().default(null),
      escenario3d: esquemaEscenario3D.nullable().default(null),
      ubicacion: z.enum(UBICACIONES).default("completa"),
      // Solo en modo video: segundo del video de apoyo donde empieza el trozo y su volumen
      // (0 = sin sonido: se escucha solo la voz).
      desde: z.number().min(0).default(0),
      volumen: z.number().min(0).max(1).default(0),
      // Variedad (opcional; null = se reparten solas para que no se repitan): cómo entra y sale
      // la escena, qué fondo lleva y cómo llegan sus textos y tarjetas. Ver src/edicion/variantes.ts.
      transicion: z.enum(TRANSICIONES).nullable().default(null),
      fondoEscena: z.enum(FONDOS).nullable().default(null),
      entrada: z.enum(ENTRADAS).nullable().default(null),
    })
    .superRefine((e, ctx) => {
      const falta = (mensaje: string) =>
        ctx.addIssue({
          code: "custom",
          message: `Apoyo "${e.modo}": ${mensaje}`,
        });
      if (e.modo === "concepto" && !e.titulo && !e.texto)
        falta('necesita "titulo" o "texto"');
      if (e.modo === "dato" && !e.cifra) falta('necesita "cifra"');
      if ((e.modo === "pasos" || e.modo === "camino") && e.puntos.length < 2)
        falta('necesita de 2 a 4 "puntos"');
      if (e.modo === "comparar" && e.puntos.length !== 2)
        falta('necesita exactamente 2 "puntos"');
      if (e.modo === "frase" && !e.texto) falta('necesita "texto"');
      if (e.modo === "imagen" && !e.archivo)
        falta('necesita "archivo" (por ejemplo "imagenes/foto.jpg")');
      if (e.modo === "escena" && !e.escena)
        falta('necesita "escena" con sus "capas"');
      if (e.modo === "escenario") {
        const p = e.escenario?.pantalla;
        if (!p) falta('necesita "escenario" con su "mundo" y su "pantalla"');
        else if (["lista", "chips", "web", "panel", "crm", "golpe", "perfil"].includes(p) && e.puntos.length < 1)
          falta(`la pantalla "${p}" necesita "puntos"`);
        else if (p === "tarjetas" && e.puntos.length < 2) falta('la pantalla "tarjetas" necesita de 2 a 4 "puntos"');
        else if ((p === "mosaico" || p === "proceso") && e.puntos.length < 2) falta(`la pantalla "${p}" necesita de 2 a 4 "puntos"`);
        else if (p === "mosaico" && !e.titulo) falta('la pantalla "mosaico" necesita "titulo" (el título grande del final)');
        else if (p === "mundo" && !e.titulo) falta('la pantalla "mundo" necesita "titulo" (lo que dice el globo)');
      }
      if (e.modo === "escenario3d") {
        const q = e.escenario3d?.escena;
        if (!q) falta('necesita "escenario3d" con su "escena"');
        else if (q === "plataformas" && e.puntos.length < 2) falta('la escena 3D "plataformas" necesita de 2 a 4 "puntos"');
        else if (q === "plataformas" && !e.titulo) falta('la escena 3D "plataformas" necesita "titulo" (el título grande del final)');
        else if ((q === "cuarto" || q === "celular") && e.puntos.length < 1) falta(`la escena 3D "${q}" necesita "puntos"`);
        else if ((q === "cohete" || q === "confeti") && !e.titulo) falta(`la escena 3D "${q}" necesita "titulo"`);
      }
      if (e.modo === "video" && !e.archivo)
        falta('necesita "archivo" (por ejemplo "videos-apoyo/f1/video.mp4")');
    }),

  // --- Recorte de fondo: la persona se separa del fondo (`npm run recortar`). ---

  // Texto detrás de la persona, como en las portadas de revista.
  z.object({
    tipo: z.literal("detras"),
    ...tramo,
    texto: z.string().min(1),
    destacar: z.string().nullable().default(null),
    // "arriba" = detrás de la cabeza; "centro" = detrás del cuerpo.
    posicion: z.enum(["arriba", "centro"]).default("arriba"),
  }),
  // Cambia el fondo por un color o un degradado de src/marca.ts, o por una imagen.
  z
    .object({
      tipo: z.literal("fondo"),
      ...tramo,
      estilo: z.enum(["color", "degradado", "imagen"]).default("degradado"),
      archivo: z.string().nullable().default(null),
    })
    .refine((e) => e.estilo !== "imagen" || e.archivo, {
      message:
        'El fondo con estilo "imagen" necesita "archivo" (por ejemplo "imagenes/oficina.jpg")',
    }),
  // La persona recortada sale de un círculo o una tarjeta de color, con lettering detrás.
  z.object({
    tipo: z.literal("marco"),
    ...tramo,
    forma: z.enum(["circulo", "tarjeta"]).default("circulo"),
    texto: z.string().nullable().default(null),
    destacar: z.string().nullable().default(null),
  }),
  // Algo que sale de detrás de la persona (el fondo del video se queda): rayos de luz que giran,
  // ondas que se expanden o íconos que suben desde sus hombros.
  z
    .object({
      tipo: z.literal("efecto"),
      ...tramo,
      efecto: z.enum(["rayos", "ondas", "iconos"]).default("rayos"),
      // Para "iconos": de 1 a 5 nombres de src/componentes/iconos.ts o lucide.dev/icons.
      iconos: z.array(nombreIcono).max(5).default([]),
    })
    .refine((e) => e.efecto !== "iconos" || e.iconos.length > 0, {
      message: 'El efecto "iconos" necesita "iconos" (por ejemplo ["dinero", "cohete"])',
    }),

  // --- Color de un momento: cambia el color del video (no el de los textos) mientras dura. ---
  z.object({
    tipo: z.literal("color"),
    ...tramo,
    sonido: z.boolean().default(false),
    // "blanco-y-negro" (suspenso, algo serio), "sepia" (recuerdo, el pasado), "dramatico"
    // (casi sin color y con mucho contraste) o "intenso" (más color: emoción, energía).
    efecto: z
      .enum(["blanco-y-negro", "sepia", "dramatico", "intenso"])
      .default("blanco-y-negro"),
  }),
]);

export type Elemento = z.infer<typeof esquemaElemento>;

export const TIPOS_ESCENA = [
  "capas",
  "perspectiva",
  "tutorial",
  "objeto3d",
] as const;
export type ElementoEscena = Extract<
  Elemento,
  { tipo: (typeof TIPOS_ESCENA)[number] }
>;
export const TIPOS_RECORTE = ["detras", "fondo", "marco", "efecto"] as const;
export type ElementoRecorte = Extract<
  Elemento,
  { tipo: (typeof TIPOS_RECORTE)[number] }
>;
export type ElementoApoyo = Extract<Elemento, { tipo: "apoyo" }>;
export type ElementoColor = Extract<Elemento, { tipo: "color" }>;
export type ElementoSobreVideo = Exclude<
  Elemento,
  ElementoEscena | ElementoRecorte | ElementoApoyo | ElementoColor
>;

// Estructura de public/proyectos/<id>/edicion.json (la crea `npm run preparar`).
// Tiempos en segundos del video original.
export const esquemaEdicion = z.object({
  version: z.literal(1),
  id: z.string(),
  video: z.string(),
  ancho: z.number().positive(),
  alto: z.number().positive(),
  duracion: z.number().positive(),
  // Colores y fuentes: "predeterminado" (src/marca.ts) o un cliente de estilos/<cliente>.json.
  estilo: z.string().min(1).default("predeterminado"),
  // Música de fondo (una canción de public/musica/). Baja sola cuando la persona habla.
  musica: z
    .object({
      archivo: z.string().min(1),
      // Volumen en las pausas, el gancho y el cierre (0 a 1).
      volumen: z.number().min(0).max(1).default(0.25),
      // Mientras la persona habla, la música baja a esta parte del volumen (0.3 = 30 %).
      alHablar: z.number().min(0).max(1).default(0.3),
      // Segundo de la canción donde empieza (para saltar una introducción larga).
      desde: z.number().min(0).default(0),
    })
    .nullable()
    .default(null),
  opciones: z.object({
    formato: z.enum(formatos),
    // Punto del video que queda centrado al recortar (0 = izquierda/arriba, 1 = derecha/abajo).
    // "auto" = sigue a la cara (necesita `caras`); sin cara, centra.
    enfoqueX: z.union([z.number().min(0).max(1), z.literal("auto")]),
    enfoqueY: z.union([z.number().min(0).max(1), z.literal("auto")]),
    subtitulos: z.boolean(),
    // "claves" = solo las palabras marcadas con `clave` en `palabras`.
    estiloSubtitulos: z.enum(["palabra", "frase", "claves"]),
    // Altura del centro de los subtítulos (0 = arriba, 1 = abajo).
    posicionSubtitulos: z.number().min(0).max(1),
    // Alterna un acercamiento en cada corte para disimular los saltos.
    zoomEnCortes: z.boolean(),
    // Acercamiento lento y continuo dentro de cada tramo (como una cámara que se mueve).
    empuje: z.boolean().default(true),
    // Retoque de color de la imagen: "natural" (un poco más de contraste y color), "vivo" o "ninguno".
    color: z.enum(["natural", "vivo", "ninguno"]).default("natural"),
    // Proyecto hecho con solo un audio: no hay imagen de la persona, se ve un fondo animado y
    // las escenas de apoyo (lo marca `npm run preparar` al recibir un audio).
    soloAudio: z.boolean().default(false),
    gancho: z.string().nullable(),
    duracionGancho: z.number().positive(),
    cierre: z
      .object({ texto: z.string(), duracion: z.number().positive() })
      .nullable(),
    // Efectos de sonido (whoosh, pop, click) al aparecer listas, íconos, lettering, imágenes,
    // recortes y escenas 3D.
    sonidos: z.boolean().default(true),
    volumenSonidos: z.number().min(0).max(1).default(0.25),
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
  palabras: z.array(
    z.object({
      texto: z.string(),
      inicio: z.number(),
      fin: z.number(),
      // Palabra clave: es la que se muestra con el estilo de subtítulos "claves".
      clave: z.boolean().optional(),
      // "alterna" = se muestra con la segunda letra (marca.fuenteAlterna).
      letra: z.literal("alterna").optional(),
    }),
  ),
  // Acercamientos de énfasis (por ejemplo, cuando se dice una palabra clave).
  enfasis: z
    .array(
      z.object({
        inicio: z.number(),
        fin: z.number(),
        zoom: z.number().min(1).max(2),
      }),
    )
    .default([]),
  elementos: z.array(esquemaElemento).default([]),
  // Cara principal cada `cada` segundos: [x, y, ancho, alto] en fracciones del video original.
  // La llena `npm run preparar` o `npm run caras`; no se edita a mano.
  caras: z
    .object({
      cada: z.number().positive(),
      cuadros: z.array(
        z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
      ),
    })
    .nullable()
    .default(null),
  // Subtítulos que el video ya trae pegados en la imagen (los detecta `npm run preparar`):
  // altura de su centro (0 = arriba, 1 = abajo). Con ellos, `opciones.subtitulos` va en false.
  subtitulosEnVideo: z
    .object({ altura: z.number().min(0).max(1) })
    .nullable()
    .default(null),
  // Máscaras de la persona para los elementos de recorte: carpeta (dentro de public/) y tramos
  // [desde, hasta) de cuadros del video original que ya tienen máscara.
  // La llena `npm run recortar` (o revisar y exportar); no se edita a mano.
  recorte: z
    .object({
      carpeta: z.string(),
      cuadros: z.array(z.tuple([z.number(), z.number()])),
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

// `dibujos`: el SVG de cada dibujo de las escenas ilustradas (los lee calcularMetadatos).
export type PropsEditado = z.infer<typeof esquemaProps> & {
  edicion?: Edicion;
  dibujos?: Record<string, string>;
};
