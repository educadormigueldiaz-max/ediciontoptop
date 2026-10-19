---
name: toptop-ritmo
description: Criterio de ritmo y duración de los videos de TopTop Lab (cuánto cortar, pausas, tomas, duración ideal por tipo de video). Úsala al preparar un video, al cortar pausas o cuando pidan "más rápido", "más dinámico" o "más calmado".
---

# Ritmo

## Pausas (`--pausa` en `npm run preparar`)
| Tipo de video | `--pausa` | Sensación |
|---|---|---|
| Anuncio / gancho agresivo | 0.25 | Muy rápido, sin respiros |
| Reel o TikTok de contenido | 0.35 (por defecto) | Dinámico pero natural |
| Tutorial, explicación de producto | 0.5 | Calmado, se entiende cada paso |
| Testimonio o entrevista | 0.7 | Respeta las pausas emocionales |

- `--margen 0.08` deja aire al inicio y al final de cada frase. Si suena "cortado", súbelo a 0.12.
- "Más rápido" = baja la pausa un paso. "Más calmado" = súbela un paso. Para rehacer los cortes
  hay que volver a preparar el video (pregunta antes de usar `--forzar`).

## Duración ideal
- Anuncio: 15–30 s. Si dura más, propone qué quitar.
- Reel / TikTok: 30–60 s.
- Tutorial: hasta 90 s; si es más largo, propone dividirlo en partes.

## Los primeros 3 segundos
- El video empieza en la primera palabra útil, nunca con "hola, ¿qué tal?" ni silencio.
- Si los primeros segundos no enganchan, propone un `gancho` (ver `toptop-estilo`).

## Tomas y errores
- Quita tomas repetidas, frases abandonadas a la mitad y comentarios fuera de guion.
- Nunca cortes en medio de una palabra: usa los tiempos de `palabras`.
- Un tramo de menos de 0.3 s suele ser un ruido: únelo al vecino o quítalo.

## Zoom en cortes
- `zoomEnCortes: true` (por defecto) en videos de una persona hablando: disimula los saltos.
- Desactívalo en grabaciones de pantalla o de producto, donde el zoom recorta información.
