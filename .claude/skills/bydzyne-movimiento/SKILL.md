---
name: bydzyne-movimiento
description: Criterio de animación y movimiento en Remotion para ByDzyne (entradas, salidas, zooms, velocidad, curvas). Úsala al crear o modificar cualquier animación, componente nuevo o efecto de movimiento.
---

# Movimiento

## Técnica (obligatorio)
- Todo se anima con `useCurrentFrame()` + `interpolate()` o `spring()`.
- Nada de `transition`, `animation` ni `@keyframes` de CSS: no salen en el render.
- Usa las propiedades `scale`, `translate`, `rotate` en `style`, no `transform`.
- Siempre `extrapolateLeft: "clamp"` y `extrapolateRight: "clamp"` en `interpolate()`.

## Tiempos (a 30 fps)
| Elemento | Entrada | Salida |
|---|---|---|
| Subtítulo | 3–6 frames | corte seco |
| Gancho / título | 8–12 frames (spring con rebote leve) | 6–8 frames de fundido |
| Ícono o imagen | 8–12 frames | 6 frames |
| Cierre | 15–20 frames escalonados | — |

## Curvas
- Suave y elegante: `Easing.bezier(0.16, 1, 0.3, 1)`.
- Con "pop" (subtítulos, íconos): `Easing.bezier(0.34, 1.56, 0.64, 1)` o
  `spring({ config: { damping: 12–15 } })`.
- Movimiento lineal solo para cosas que se desplazan todo el tiempo (fondos).

## Reglas de criterio
- Un solo movimiento protagonista a la vez: si entra un gancho, el resto queda quieto.
- El movimiento acompaña lo que se dice: el zoom o el ícono aparece en la palabra clave
  (usa los tiempos de `palabras`).
- Zoom de énfasis: 1.08–1.15. Más de 1.2 se ve pixelado en videos de celular.
  Se agrega en `enfasis` de `edicion.json` con los tiempos de la palabra clave.
  Máximo uno cada 5–8 segundos; si todo tiene énfasis, nada lo tiene.
- Nada debe moverse durante una frase importante si distrae de la cara.
