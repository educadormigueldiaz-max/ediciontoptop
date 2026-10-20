---
name: toptop-composicion
description: Criterio de encuadre y composición para TopTop Lab (zonas seguras por red social, tamaños de texto, recorte de horizontal a vertical, foco visual). Úsala al cambiar el formato, el encuadre, posiciones de textos o al diseñar cualquier escena nueva.
---

# Composición

## Zonas seguras (video de 1080 px de ancho)
| Formato | Mantén los textos importantes fuera de… |
|---|---|
| 9:16 (Reels, TikTok, Shorts) | 220 px de arriba, 380 px de abajo, 140 px a la derecha (botones) |
| 4:5 (feed de Instagram) | 100 px arriba y abajo |
| 1:1 | 90 px en cada borde |
| 16:9 (YouTube, LinkedIn) | 100 px en cada borde |

## Tamaños mínimos de texto (escala con el ancho)
- Título o gancho: 84 px.
- Texto de apoyo: 44 px.
- Nunca más de 2 líneas en el gancho ni más de 3 en un subtítulo.

## Recorte de horizontal a vertical
- El video llena el formato y se recorta lo que sobra.
- `enfoqueX` / `enfoqueY` en `"auto"` (por defecto) hacen que el recorte siga a la cara: queda
  centrada a lo ancho y a la altura de los ojos. Solo pon un número (0 = izquierda/arriba,
  1 = derecha/abajo) si la persona pide un encuadre distinto.
- Verifica siempre con `npm run revisar -- <id> --formato <formato>` después de cambiar el formato.

## La cara nunca se tapa
- `npm run preparar` guarda dónde está la cara (`caras` en `edicion.json`); en proyectos viejos,
  `npm run caras -- <id>`.
- Subtítulos y elementos gráficos se acomodan solos alrededor de ella.
- Al cambiar `enfoqueX`/`enfoqueY` o el formato, revisa con `npm run revisar` que la cara siga
  dentro del cuadro.

## Foco
- Cada momento tiene una sola cosa principal: la cara, el producto o el texto.
- El texto nunca tapa la cara ni el producto.
- Contraste: texto claro con contorno oscuro (o al revés) sobre cualquier imagen.
