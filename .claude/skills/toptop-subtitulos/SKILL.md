---
name: toptop-subtitulos
description: Criterio para los subtítulos de TopTop Lab (estilo, posición, corrección de palabras, nombres propios). Úsala cuando pidan subtítulos, corregir lo que dicen, moverlos o cambiar cómo se ven.
---

# Subtítulos

## Estilo (`opciones.estiloSubtitulos`)
- `"palabra"`: 1 a 3 palabras en mayúsculas, la palabra que se dice se resalta con el color de
  acento. Para reels, TikTok y anuncios.
- `"frase"`: frases completas, más pequeñas, sin mayúsculas. Para tutoriales, LinkedIn,
  YouTube horizontal (16:9) y videos largos.

## Posición (`opciones.posicionSubtitulos`, 0 = arriba, 1 = abajo)
| Formato | Valor recomendado | Motivo |
|---|---|---|
| 9:16 | 0.68–0.72 | Encima de los botones y la descripción de Reels y TikTok |
| 4:5 | 0.75 | |
| 1:1 | 0.78 | |
| 16:9 | 0.85 | Tercio inferior clásico |

- Nunca tapan la cara: si en algún momento la posición elegida la toca, se mueven solos debajo
  o encima de ella (necesita `caras` en `edicion.json`; si falta, `npm run caras -- <id>`).
- Mientras se ve un lettering o un elemento que necesita su espacio, se esconden solos.
- Revisa con `npm run revisar -- <id>` después de moverlos.

## Corregir lo que dicen
- Cambia solo `palabras[i].texto` en `edicion.json`; no toques `inicio` ni `fin`.
- Revisa siempre: nombres de personas, lugares, marcas o productos que se mencionen, precios,
  cifras, siglas y palabras en inglés.
- Si una palabra quedó partida en dos entradas ("Top" + "Top"), únelas en una sola:
  texto "TopTop", `inicio` de la primera, `fin` de la segunda, y borra la segunda.
- Si Whisper juntó o separó mal varias palabras, puedes reescribir el texto de una entrada
  con varias palabras ("Top Lab"): se muestran juntas durante el tiempo de esa entrada.
- Signos: deja `.`, `?` y `!` al final de las frases (cortan la página del subtítulo).
  Quita muletillas escritas ("eh", "este...") si quedaron.

## Cuándo no poner subtítulos
- Si el pedido es solo música o producto sin voz: `"subtitulos": false`.
