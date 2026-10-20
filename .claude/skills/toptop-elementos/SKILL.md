---
name: toptop-elementos
description: Cómo y cuándo agregar elementos gráficos sobre el video en TopTop Lab - motion explicativo (lista de puntos), lettering (frase grande), íconos animados e imágenes insertadas. Úsala cuando pidan explicar con puntos, destacar una frase, poner íconos, mostrar fotos o capturas, o "hacerlo más visual".
---

# Elementos gráficos

Se agregan en `elementos` de `public/proyectos/<id>/edicion.json`. Los tiempos (`inicio`, `fin`,
`en`) son **segundos del video original**, como en `palabras`: búscalos ahí, nunca los adivines.
Así siguen funcionando aunque cambien los cortes.

## Regla de oro: la cara nunca se tapa
El programa sabe dónde está la cara en cada momento (`caras` en `edicion.json`) y coloca cada
elemento solo en el espacio libre: arriba o abajo de la cara en vertical y cuadrado, a un lado
en horizontal. Si no cabe junto a los subtítulos, los subtítulos se esconden mientras dura el
elemento; la cara nunca.
- Si `edicion.json` no tiene `caras`, ejecuta `npm run caras -- <id>` antes de agregar elementos.
- No hace falta (ni sirve) acomodar posiciones a mano: no inventes coordenadas.
- Lo único que tapa a la persona es `"modo": "pantalla-completa"` en imágenes y `"fondo": "color"`
  en lettering. Úsalos **solo** si la persona lo pide con esas palabras.

## Los 4 tipos

### Motion explicativo (`lista`)
Para cuando la persona enumera pasos, errores, beneficios ("tres cosas…", "primero…").
```json
{ "tipo": "lista", "inicio": 12.4, "fin": 24.0, "titulo": "3 errores comunes",
  "puntos": [
    { "texto": "No tener gancho", "en": 13.1 },
    { "texto": "Videos muy largos", "en": 17.8 },
    { "texto": "Sin llamada a la acción", "en": 21.5 } ] }
```
- `en` = cuando empieza a decir ese punto (la primera palabra del punto en `palabras`).
- Textos de máximo 4–5 palabras. De 2 a 5 puntos (en 16:9, máximo 4).
- `fin` = cuando termina de hablar del último punto, más 1–2 s para que se lea.

### Lettering (`lettering`)
Una frase corta y potente en letras grandes. Máximo 1 cada 20–30 s.
```json
{ "tipo": "lettering", "inicio": 31.2, "fin": 33.4, "texto": "La idea gana", "destacar": "gana" }
```
- Copia **exactamente** las palabras que se dicen (de `palabras`), de 2 a 5 palabras. Así el
  programa lo alinea solo: empieza justo cuando se empieza a decir la frase y esas palabras se
  quitan de los subtítulos (no aparecen dos veces).
- `inicio` aproximado (el de la primera palabra) basta; `fin`, cuando termina la frase.
- `fondo`: `"video"` (por defecto: sobre el video, en el espacio libre junto a la cara) o
  `"color"` (tarjeta de color a pantalla completa; solo si la piden).
- Los subtítulos se ocultan solos mientras dura.
- Dura entre 1.5 y 3 s.

### Ícono animado (`icono`)
Refuerza una palabra concreta: dinero, tiempo, error, idea, etc.
```json
{ "tipo": "icono", "inicio": 8.2, "fin": 10.0, "icono": "dinero", "texto": "Ahorra", "posicion": "arriba-derecha" }
```
- `icono`: un nombre en español de `src/componentes/iconos.ts` (dinero, tiempo, idea, check,
  error, alerta, cohete, grafica, subir, bajar, equipo, persona, whatsapp, telefono, correo,
  calendario, ubicacion, estrella, regalo, carrito, corazon, trofeo, meta, rayo, justicia, juez,
  ley, gobierno, documento, libro, musica, video, microfono, empresa, negocio, trato, pago…)
  o cualquiera de https://lucide.dev/icons ("trending-up").
- `posicion`: de qué lado va dentro del espacio libre: `arriba-derecha` (por defecto),
  `arriba-izquierda`, `arriba` (al centro) o `centro`.
- `texto` opcional: 1–2 palabras.
- Aparece justo en la palabra (su `inicio` en `palabras`) y dura 1.5–2.5 s.

### Imagen insertada (`imagen`)
Fotos de producto, capturas, logos de clientes, documentos que se mencionan.
```json
{ "tipo": "imagen", "inicio": 40.1, "fin": 44.0, "archivo": "imagenes/producto.jpg", "modo": "tarjeta", "texto": "Nuevo menú" }
```
- La persona pone sus imágenes en `public/imagenes/`. Antes de usar una, verifica que el archivo
  exista; si no está, pídela. Nunca uses imágenes de internet sin permiso.
- `modo`: `"tarjeta"` (por defecto: flota en el espacio libre y se ve la persona) o
  `"pantalla-completa"` (tapa a la persona mientras se escucha su voz; solo si la piden).
- Dura 2–4 s. `texto` opcional como leyenda.

## Criterio (lo más importante)
- **Un protagonista a la vez**: no juntes lista + ícono, ni elementos durante el gancho
  (los primeros `duracionGancho` segundos), una escena 3D o un recorte de fondo.
- **Nada en los primeros 0.5 s ni encima del cierre.**
- **Densidad**: un elemento cada 5–10 s como máximo. Si todo resalta, nada resalta.
- **Fidelidad**: el texto en pantalla dice lo mismo que la voz. No inventes datos.
- "Hazlo más visual" sin más detalles: busca en la transcripción enumeraciones (→ lista),
  la frase más fuerte (→ lettering) y 2 o 3 palabras concretas (→ íconos). Explica qué pusiste.
- **Sonido**: cada elemento suena solo al aparecer (whoosh en lettering e imagen, pop en cada
  punto de una lista y en los íconos). `"sonido": false` lo apaga en ese elemento; detalles en
  `toptop-produccion`.

## Revisar
Ejecuta `npm run revisar -- <id>`: deja un cuadro de cada elemento en `salida/revision/<id>/`.
Míralos y verifica que la cara se vea completa, que nada choque con los subtítulos ni entre
sí, y que el texto se lea (si quedó muy pequeño, acorta el texto o quita puntos). Si avisa que un elemento cae en una parte cortada, corrige sus tiempos.
