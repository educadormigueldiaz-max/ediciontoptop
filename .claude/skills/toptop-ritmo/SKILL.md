---
name: toptop-ritmo
description: Criterio de ritmo y duración de los videos de TopTop Lab (cuánto cortar, pausas, tomas, duración ideal por tipo de video). Úsala al preparar un video, al cortar pausas o cuando pidan "más rápido", "más dinámico" o "más calmado".
---

# Ritmo

## Pausas (`--pausa` en `npm run preparar`)
| Tipo de video | `--pausa` | Sensación |
|---|---|---|
| Anuncio / gancho agresivo | 0.25 | Muy rápido, sin respiros |
| Reel o TikTok de contenido | 0.35 | Dinámico pero natural |
| Tutorial, explicación de producto, y **por defecto** | 0.5 | Calmado, se entiende cada paso |
| Testimonio o entrevista | 0.7 | Respeta las pausas emocionales |

- La persona prefiere el **ritmo calmado** (pausa 0.5 y margen 0.12, los valores por defecto):
  úsalo siempre, salvo que pida algo más rápido para un video concreto ("anuncio agresivo").
- `--margen 0.12` deja aire al inicio y al final de cada frase. Si suena "cortado", súbelo a 0.15.
- Los cortes de silencio nunca se comen una palabra (se ajustan a los tiempos de `palabras`).
- En un proyecto ya preparado, "menos agresivo" = junta los cortes que solo quitan una pausa de
  menos de 0.4 s y alarga cada tramo hasta el final de su última palabra (+0.06 s), sin
  rehacer el proyecto.
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
