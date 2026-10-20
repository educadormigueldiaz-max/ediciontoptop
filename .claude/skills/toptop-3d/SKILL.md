---
name: toptop-3d
description: Escenas 3D de TopTop Lab - montaje en capas 3D, perspectiva 3D, tutorial 3D (capturas en un celular o navegador) y 3D explicativo (objeto que gira con etiquetas). Úsala cuando pidan algo "en 3D", "en capas", "con profundidad", mostrar una app o página paso a paso, o explicar un objeto, producto o maqueta.
---

# Escenas 3D

Van en `elementos` de `public/proyectos/<id>/edicion.json`, como los demás elementos, con tiempos
en **segundos del video original** (búscalos en `palabras`). Durante una escena 3D el video entero
se transforma y la cara **siempre queda a la vista**: en una tarjeta que gira, en una ventana
plegada o en una ventana pequeña centrada en la cara. Los subtítulos se esconden mientras dura.

Para verlas sin video: composición **Muestra-3D** en la vista previa.

## Los 4 tipos

### Montaje en capas (`capas`)
El video se vuelve una tarjeta que gira, con tarjetas de color detrás, un título arriba e íconos
flotando. Ideal para la apertura o para anunciar un tema.
```json
{ "tipo": "capas", "inicio": 0.4, "fin": 3.4, "titulo": "Edita videos con IA", "iconos": ["video", "idea", "rayo"] }
```
- `titulo`: 2–6 palabras. `iconos`: 0 a 3 nombres (los mismos que en la skill de elementos).

### Perspectiva 3D (`perspectiva`)
El video se pliega hacia un lado (como una página) y una frase grande, con volumen, ocupa el otro.
```json
{ "tipo": "perspectiva", "inicio": 20.1, "fin": 23.0, "texto": "Más alcance cada día", "destacar": "alcance", "lado": "izquierda" }
```
- `texto`: 2–4 palabras cortas (una por línea; las de más de 9 letras salen pequeñas).
- `lado`: dónde va la frase (`izquierda` o `derecha`).

### Tutorial 3D (`tutorial`)
Capturas de una app o página dentro de un celular o una ventana de navegador que flota en 3D;
la persona sigue hablando en una ventana pequeña arriba. Cada paso cambia la pantalla.
```json
{ "tipo": "tutorial", "inicio": 30.0, "fin": 41.0, "titulo": "Así se publica", "marco": "celular",
  "pasos": [
    { "archivo": "imagenes/paso-1.png", "texto": "Abre la app", "en": 30.0 },
    { "archivo": "imagenes/paso-2.png", "texto": "Toca Subir", "en": 34.5 } ] }
```
- `marco`: `celular` (capturas verticales) o `navegador` (capturas de computadora).
- `en`: cuando empieza a explicar ese paso. Textos de 2–4 palabras.

### 3D explicativo (`objeto3d`)
Una imagen (producto, maqueta, diagrama, plano) gira suavemente sobre su sombra y aparecen
etiquetas a los lados mientras se explica.
```json
{ "tipo": "objeto3d", "inicio": 50.2, "fin": 56.0, "archivo": "imagenes/casa.png", "titulo": "Luz todo el día",
  "etiquetas": [ { "texto": "Ventanas grandes", "en": 51.0 }, { "texto": "Techo alto", "en": 53.2 } ] }
```
- Funciona mejor con imágenes de fondo transparente (PNG) o fondo liso.
- Hasta 5 etiquetas de 1–3 palabras.

## Criterio
- Las imágenes las pone la persona en `public/imagenes/`. Verifica que existan; si faltan, pídelas.
- **Duración**: capas y perspectiva, 2.5–4 s. Tutorial, 2–4 s por paso. Objeto, 4–8 s.
- **Densidad**: máximo una escena 3D cada 15–20 s. No pongas otros elementos (lista, ícono,
  lettering, recortes de la skill `toptop-recorte`) al mismo tiempo que una escena 3D, ni
  durante el gancho.
- Deja al menos 0.5 s de video normal entre dos escenas.
- Los textos dicen lo mismo que la voz; no inventes datos.
- "Hazlo en 3D" sin más detalles: apertura con `capas` usando el tema del video y una
  `perspectiva` con la frase más fuerte. Explica qué pusiste.
- **Sonido**: cada escena entra con un whoosh; los pasos del tutorial hacen click y las
  etiquetas del objeto 3D, pop. `"sonido": false` lo apaga en esa escena (`toptop-produccion`).

## Revisar
`npm run revisar -- <id>` deja un cuadro de la mitad de cada escena. Verifica que la cara se vea
bien en la ventana, que los textos se lean y que las capturas se entiendan.
