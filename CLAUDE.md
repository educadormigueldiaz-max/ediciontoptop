# TopTop Lab — instrucciones para Claude Code

Este proyecto edita videos con Remotion. La persona que lo usa **no es editora ni programadora**:
pide en español lo que quiere ver ("corta las pausas y pon subtítulos") y tú haces la edición.

- Responde siempre en español, con frases cortas y sin jerga técnica.
- Antes de editar, lee las skills de `.claude/skills/` que apliquen (ritmo, subtítulos, estilo,
  elementos, 3d, movimiento, composición). Son el criterio de edición.
- Si el pedido es ambiguo ("déjalo bonito"), aplica las skills y explica en una línea qué decidiste.

## Flujo de trabajo: Prepara → Pide → Revisa → Reutiliza

1. **Prepara**: el video crudo va en `entrada/`. Ejecuta `npm run preparar -- entrada/<archivo>`.
   Crea `public/proyectos/<id>/` con `video.mp4`, `edicion.json` y `transcripcion.txt`.
2. **Pide**: casi todo pedido se resuelve editando `public/proyectos/<id>/edicion.json`
   (ver "Archivo de edición" abajo). No cambies los componentes de `src/` para un video concreto.
3. **Revisa**: antes de exportar, ejecuta `npm run revisar -- <id>` y mira las imágenes que
   deja en `salida/revision/<id>/` (inicio, cortes, cada elemento gráfico, final y cierre).
   Usa `plantillas/ficha-revision.md`. Dile a la persona que puede verlo en `npm run dev`
   (Remotion Studio en http://localhost:3000; si ya estaba abierto, que recargue la página).
4. **Reutiliza**: `npm run exportar -- <id>` (o `--formato 1:1`, o `--todos`).
   Para variaciones de anuncios: `npm run duplicar -- <id> <id>-b` y cambia el gancho/cierre en la copia.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run instalar` | Instala Whisper y descarga el modelo (solo la primera vez) |
| `npm run actualizar` | Trae la última versión desde GitHub e instala lo nuevo |
| `npm run preparar -- <video> [opciones]` | Convierte, transcribe, corta pausas y ubica la cara. `--ayuda` muestra las opciones |
| `npm run caras -- <id>` | Vuelve a buscar la cara en un proyecto (no toca la edición) |
| `npm run dev` | Abre la vista previa (Remotion Studio) |
| `npm run exportar -- <id> [--formato 9:16\|4:5\|1:1\|16:9] [--todos]` | Exporta a `salida/` |
| `npm run duplicar -- <id> <nuevo>` | Copia la edición usando el mismo video |
| `npm run revisar -- <id> [--formato …]` | Genera cuadros de revisión en `salida/revision/<id>/` |
| `npm run lint` | Revisa el código (ESLint + TypeScript) |

## Archivo de edición (`public/proyectos/<id>/edicion.json`)

Tiempos en **segundos del video original**. El esquema está en `src/edicion/esquema.ts`.

- `segmentos`: tramos que se conservan, en orden. Para quitar una parte, parte o borra el tramo
  que la contiene. Para cambiar el orden, reordena. `zoom` opcional por tramo (1–3).
- `palabras`: transcripción palabra por palabra. Para corregir un subtítulo, cambia solo `texto`
  y no toques los tiempos. Las palabras de partes cortadas desaparecen solas.
- `opciones`:
  - `formato`: "9:16", "4:5", "1:1" o "16:9".
  - `enfoqueX` y `enfoqueY` (0–1): qué parte del video queda al recortar.
  - `subtitulos`, `estiloSubtitulos` ("palabra" o "frase"), `posicionSubtitulos` (0 = arriba, 1 = abajo).
  - `zoomEnCortes`: acercamiento alterno en cada corte.
  - `gancho` (texto o null) y `duracionGancho`: frase de los primeros segundos.
  - `cierre`: `{ "texto": "...", "duracion": 2 }` o null.
- `enfasis`: acercamientos en momentos clave, `[{ "inicio": 12.3, "fin": 13.1, "zoom": 1.15 }]`.
  Para "haz zoom cuando digo X", usa el `inicio` y `fin` de esa palabra en `palabras`.
- `elementos`: gráficos sobre el video: `lista` (motion explicativo), `lettering`, `icono` e
  `imagen`. Formato y criterio en la skill `toptop-elementos`. Las imágenes de la persona van
  en `public/imagenes/`.
- `caras`: dónde está la cara en cada momento. Lo llena el programa; no se edita a mano.
- Usa `transcripcion.txt` para ubicar frases por tiempo (por ejemplo, una toma repetida).

## Reglas

- **La cara de la persona nunca se tapa.** Subtítulos y elementos se acomodan solos alrededor
  de ella. No uses imagen `pantalla-completa` ni lettering con `fondo: "color"` salvo que lo pidan.
- **TopTop Lab nunca aparece en los videos**: ni su nombre ni un logo, en ningún texto, gancho
  o cierre. TopTop Lab es la herramienta, no la marca de los videos.

- **Nunca** ejecutes `preparar --forzar` sobre un proyecto existente sin preguntar: borra las
  ediciones hechas a mano.
- `src/proyectos.ts` se genera solo; no lo edites.
- El estilo visual (colores y fuente) vive en `src/marca.ts`. Si piden cambiar colores o fuente,
  cambia ese archivo, no los componentes.
- No inventes datos en ganchos o cierres (precios, cifras, promesas). Si faltan, pregunta.
- Animaciones: solo con `useCurrentFrame()`, `interpolate()` y `spring()`. Las transiciones o
  animaciones de CSS no se ven en el render.
- Después de cambiar código en `src/`, ejecuta `npm run lint`.
- Los videos (`entrada/`, `public/proyectos/`, `salida/`) no se suben a git.
