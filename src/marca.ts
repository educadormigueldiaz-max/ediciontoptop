import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fuentes guardadas en public/fuentes (funcionan sin internet).
// Para usar otra fuente: copia sus archivos .woff2 o .ttf a public/fuentes,
// cámbialos aquí abajo y cambia FUENTE.
const FUENTE = "Montserrat";
for (const peso of ["700", "800", "900"]) {
  loadFont({ family: FUENTE, url: staticFile(`fuentes/Montserrat-${peso}.woff2`), weight: peso });
}
// Segunda letra, para alternar de vez en cuando en las palabras clave.
const FUENTE_ALTERNA = "Playfair Display";
loadFont({
  family: FUENTE_ALTERNA,
  url: staticFile("fuentes/PlayfairDisplay-Italic.ttf"),
  weight: "400 900",
  style: "italic",
});

export type Marca = {
  fuente: string;
  fuenteAlterna: string;
  colores: {
    primario: string;
    secundario: string;
    acento: string;
    textoSobreAcento: string;
    texto: string;
    contorno: string;
    fondo: string;
  };
};

// Estilo "predeterminado" de los videos (colores y fuente). Lo usan todos los videos que no
// eligen otro estilo: cambia un color o la fuente y se actualizan todos.
// Cada cliente puede tener su propio estilo en estilos/<cliente>.json (ver estilos/ejemplo.json);
// lo que ese archivo no diga se toma de aquí.
// ByDzyne es el nombre de la herramienta: su nombre o logo NUNCA aparecen en los videos.
export const marca: Marca = {
  fuente: FUENTE,
  fuenteAlterna: FUENTE_ALTERNA,
  colores: {
    primario: "#7C3AED", // fondo de ganchos, cierres y escenas 3D
    secundario: "#22D3EE", // detalles y degradados
    acento: "#FFD60A", // palabra que se está diciendo en los subtítulos
    textoSobreAcento: "#0A0A0A", // letras encima de un fondo de color acento
    texto: "#FFFFFF",
    contorno: "#0A0A0A",
    fondo: "#0D0B14",
  },
};
