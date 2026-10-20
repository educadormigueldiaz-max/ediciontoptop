# TopTop Lab

Edita videos pidiéndolo en español. Claude Code hace los cortes, los subtítulos y las
animaciones con [Remotion](https://www.remotion.dev); tú revisas en el navegador y exportas.

> "Corta las pausas y pon subtítulos" → video listo para Reels, TikTok, feed o YouTube.

## Qué hace hoy

- **Crudo → editado**: quita silencios y muletillas, ajusta a vertical, cuadrado u horizontal.
- **Subtítulos automáticos** (Whisper, en tu computadora, sin subir nada a internet), palabra por
  palabra con la palabra activa resaltada, o por frases.
- **Gancho** al inicio, **cierre** con una llamada a la acción, **zoom** en los cortes y en palabras clave.
- **Motion explicativo**: listas de puntos que aparecen al ritmo de lo que dices.
- **Lettering**: frases clave en letras grandes a pantalla completa.
- **Íconos animados** y **fotos o capturas** que aparecen justo cuando las mencionas.
- **Recorte de fondo**: textos detrás de ti (estilo portada de revista), cambiar el fondo por un
  color, un degradado o una imagen, y salir de un círculo o una tarjeta de color. Se calcula en tu
  Mac, sin internet, solo en los momentos que lo necesitan.
- **Escenas 3D**: montaje en capas, perspectiva, tutorial con capturas en un celular o navegador,
  y objetos que giran con etiquetas.
- **Tu cara nunca se tapa**: el programa detecta dónde está, acomoda textos y gráficos alrededor
  y ajusta el recorte para que siempre quede en cuadro.
- **Variaciones** de un mismo video para probar anuncios.
- **Skills de criterio** para Claude Code: estilo, ritmo, subtítulos, elementos, 3D, recorte,
  movimiento y composición.

## Instalación en Mac (una sola vez)

1. **Herramientas de Apple** (si ya las tienes, dirá que están instaladas):
   ```bash
   xcode-select --install
   ```
2. **Node.js 20 o más nuevo.** Revisa con `node -v`. Si no lo tienes, descárgalo de
   https://nodejs.org (versión LTS) o, con Homebrew, `brew install node`.
3. **Descarga el proyecto e instala:**
   ```bash
   git clone https://github.com/educadormigueldiaz-max/ediciontoptop.git
   cd ediciontoptop
   npm install
   npm run instalar
   ```
   `npm run instalar` compila Whisper y descarga el modelo de español (~1.5 GB). Tarda unos
   minutos y solo se hace una vez. Para un modelo más liviano: `npm run instalar -- small`.

## Uso diario

1. Copia tu grabación a la carpeta `entrada/`.
2. Abre Claude Code en la carpeta del proyecto:
   ```bash
   cd ediciontoptop
   claude
   ```
3. Pide lo que quieres. Ejemplos listos en **[GUIA-DE-PEDIDOS.md](GUIA-DE-PEDIDOS.md)**:
   > Prepara el video `entrada/take-01.mov` para un reel vertical. Corta las pausas y las muletillas y pon subtítulos.
4. Revisa en el navegador: en otra terminal ejecuta `npm run dev` y abre http://localhost:3000.
   Cada video aparece en la carpeta **Proyectos** de la izquierda.
5. Pide cambios ("sube los subtítulos", "pon este gancho…") y cuando te guste:
   > Exporta el video en todos los formatos.

   Los archivos quedan en `salida/`.

## Actualizar

Cuando haya mejoras nuevas, dentro de la carpeta del proyecto:
```bash
npm run actualizar
```

## Comandos (si prefieres hacerlo sin Claude)

| Comando | Qué hace |
|---|---|
| `npm run preparar -- entrada/video.mov` | Convierte, transcribe y corta pausas (`--ayuda` para opciones) |
| `npm run dev` | Vista previa en http://localhost:3000 |
| `npm run exportar -- <proyecto>` | Exporta a `salida/` (`--formato 1:1` o `--todos`) |
| `npm run duplicar -- <proyecto> <nuevo>` | Copia la edición para hacer otra versión |
| `npm run revisar -- <proyecto>` | Saca cuadros de revisión a `salida/revision/` |
| `npm run caras -- <proyecto>` | Vuelve a buscar dónde está la cara |
| `npm run recortar -- <proyecto>` | Separa a la persona del fondo donde haga falta |

## Carpetas

```
entrada/                 Tus grabaciones crudas (no se suben a git)
salida/                  Videos exportados (no se suben a git)
public/proyectos/<id>/   Video de trabajo + edicion.json + transcripcion.txt + recorte/ (no se suben a git)
public/imagenes/         Tus fotos y capturas para insertar en los videos (no se suben a git)
public/fuentes/          Fuentes de los videos
modelos/                 Detector de caras (corre en tu computadora)
src/marca.ts             Colores y fuente de los videos
src/componentes/         Subtítulos, gancho, cierre, encuadre
src/estilos/             Composiciones: video editado y muestras
.claude/skills/          Criterio de edición que usa Claude Code
plantillas/              Brief y ficha de revisión
GUIA-DE-PEDIDOS.md       Pedidos listos para copiar
```

## Personalizar el estilo

El nombre y el logo de TopTop Lab **nunca** aparecen en los videos. Los colores y la fuente se
cambian en `src/marca.ts` (o pídeselo a Claude). Las muestras
**Muestra-Subtitulos**, **Muestra-Elementos**, **Muestra-3D**, **Muestra-Recorte** y **Muestra-Cierre** en la vista previa sirven
para ver los cambios sin necesidad de un video.

## Licencia de Remotion

Remotion es gratis para personas y empresas de hasta 3 empleados. Si tu empresa es más grande,
necesita una licencia: https://www.remotion.pro/license

## Próximas fases

- Video semanal automático con el Top 10 de artistas desde Google Sheets.
