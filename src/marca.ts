import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fuentes guardadas en public/fuentes (funcionan sin internet).
// Para usar la fuente de tu marca: copia sus archivos .woff2 o .ttf a public/fuentes,
// cámbialos aquí abajo y cambia FUENTE.
const FUENTE = "Montserrat";
for (const peso of ["700", "800", "900"]) {
  loadFont({ family: FUENTE, url: staticFile(`fuentes/Montserrat-${peso}.woff2`), weight: peso });
}

// Identidad visual de TopTop Lab. Todos los videos leen de aquí:
// cambia un color o la fuente y se actualizan todos.
export const marca = {
  nombre: "TopTop Lab",
  fuente: FUENTE,
  colores: {
    primario: "#7C3AED", // fondo de ganchos y cierres
    secundario: "#22D3EE", // detalles y degradados
    acento: "#FFD60A", // palabra que se está diciendo en los subtítulos
    texto: "#FFFFFF",
    contorno: "#0A0A0A",
    fondo: "#0D0B14",
  },
  // Ruta dentro de public/, por ejemplo "marca/logo.png". null = se muestra el nombre en texto.
  logo: null as string | null,
};
