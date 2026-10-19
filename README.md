# TopTop Lab

Edita videos pidiéndolo en español. Claude Code hace los cortes, los subtítulos y las
animaciones con [Remotion](https://www.remotion.dev); tú revisas en el navegador y exportas.

> "Corta las pausas y pon subtítulos" → video listo para Reels, TikTok, feed o YouTube.

## Qué hace hoy

- **Crudo → editado**: quita silencios y muletillas, ajusta a vertical, cuadrado u horizontal.
- **Subtítulos automáticos** (Whisper, en tu computadora, sin subir nada a internet), palabra por
  palabra con la palabra activa resaltada, o por frases.
- **Gancho** al inicio, **cierre** con la marca, **zoom** en los cortes y en palabras clave.
- **Motion explicativo**: listas de puntos que aparecen al ritmo de lo que dices.
- **Lettering**: frases clave en letras grandes a pantalla completa.
- **Íconos animados** y **fotos o capturas** que aparecen justo cuando las mencionas.
- **Variaciones** de un mismo video para probar anuncios.
- **5 skills de criterio** para Claude Code: estilo, ritmo, subtítulos, movimiento y composición.

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

## Carpetas

```
entrada/                 Tus grabaciones crudas (no se suben a git)
salida/                  Videos exportados (no se suben a git)
public/proyectos/<id>/   Video de trabajo + edicion.json + transcripcion.txt (no se suben a git)
public/imagenes/         Tus fotos y capturas para insertar en los videos (no se suben a git)
public/fuentes/          Fuentes de la marca
public/marca/            Logo y recursos de la marca
src/marca.ts             Colores, fuente y logo de TopTop Lab
src/componentes/         Subtítulos, gancho, cierre, encuadre
src/estilos/             Composiciones: video editado y muestras
.claude/skills/          Criterio de edición que usa Claude Code
plantillas/              Brief y ficha de revisión
GUIA-DE-PEDIDOS.md       Pedidos listos para copiar
```

## Personalizar la marca

Edita `src/marca.ts` (o pídeselo a Claude): nombre, colores, fuente y logo. Las muestras
**Muestra-Subtitulos**, **Muestra-Elementos** y **Muestra-Cierre** en la vista previa sirven
para ver los cambios sin necesidad de un video.

## Licencia de Remotion

Remotion es gratis para personas y empresas de hasta 3 empleados. Si tu empresa es más grande,
necesita una licencia: https://www.remotion.pro/license

## Próximas fases

- Montaje y perspectiva 3D, recorte de fondo.
- Video semanal automático con el Top 10 de artistas desde Google Sheets.
